"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { BrowserProvider, ethers } from "ethers";
import {
  getBridgeKeyProvider,
  getSilentlyConnectedAccounts,
  requestAccountsOnce,
  formatWalletError,
  switchOrAddMSTTestnet,
  MST_TESTNET_CONFIG,
} from "@/lib/mst";

export type UserRole = "patient" | "hospital" | "admin";

export interface WalletContextType {
  account: string | null;
  signer: ethers.JsonRpcSigner | null;
  provider: BrowserProvider | null;
  chainId: number | null;
  isConnecting: boolean;
  isInitialized: boolean;
  error: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  connectWallet: (targetRole: "patient" | "hospital") => Promise<boolean>;
  loginAdmin: (passkey: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = "medichain_role";
const STORAGE_KEY_AUTH = "medichain_auth";
const STORAGE_KEY_ACCOUNT = "medichain_account";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Ref locks to avoid stale state in callbacks and prevent race conditions
  const isConnectingRef = useRef(false);
  const accountRef = useRef<string | null>(null);
  accountRef.current = account;

  const clearError = useCallback(() => setError(null), []);

  /**
   * Rehydrates ethers BrowserProvider and Signer given an account address
   */
  const rehydrateSigner = useCallback(async (addr: string) => {
    try {
      const rawProvider = getBridgeKeyProvider();
      if (!rawProvider) return null;

      const bp = new BrowserProvider(rawProvider);
      const sig = await bp.getSigner();
      const net = await bp.getNetwork();

      setProvider(bp);
      setSigner(sig);
      setChainId(Number(net.chainId));
      return { bp, sig };
    } catch (e) {
      console.warn("Could not rehydrate signer:", e);
      return null;
    }
  }, []);

  /**
   * Non-interactive initialization on mount
   */
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        if (typeof window === "undefined") return;

        const savedRole = sessionStorage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
        const savedAuth = sessionStorage.getItem(STORAGE_KEY_AUTH) === "true";
        const savedAccount = sessionStorage.getItem(STORAGE_KEY_ACCOUNT);

        if (savedRole === "admin" && savedAuth) {
          if (isMounted) {
            setRole("admin");
            setIsAuthenticated(true);
            setIsInitialized(true);
          }
          return;
        }

        const rawProvider = getBridgeKeyProvider();
        if (rawProvider) {
          // Check silently without triggering a wallet popup
          const silentAccounts = await getSilentlyConnectedAccounts(rawProvider);

          if (silentAccounts && silentAccounts.length > 0) {
            const activeAddr = silentAccounts[0].toLowerCase();
            if (isMounted) {
              setAccount(activeAddr);
              await rehydrateSigner(activeAddr);

              // Restore session if user was authenticated for this role
              if (savedRole && savedAuth) {
                setRole(savedRole);
                setIsAuthenticated(true);
              }
            }
          } else if (savedAccount) {
            // Extension might be locked; retain account reference for UI display
            if (isMounted && savedRole && savedAuth) {
              setAccount(savedAccount);
              setRole(savedRole);
              setIsAuthenticated(true);
            }
          }
        }
      } catch (err) {
        console.warn("Silent session initialization warning:", err);
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [rehydrateSigner]);

  /**
   * Listen to wallet events (accountsChanged, chainChanged)
   */
  useEffect(() => {
    const rawProvider = getBridgeKeyProvider();
    if (!rawProvider || typeof rawProvider.on !== "function") return;

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log("BridgeKey accountsChanged:", accounts);
      if (!accounts || accounts.length === 0) {
        // Wallet disconnected or locked
        setAccount(null);
        setSigner(null);
        setProvider(null);
        setIsAuthenticated(false);
        setRole(null);
        sessionStorage.removeItem(STORAGE_KEY_ACCOUNT);
        sessionStorage.removeItem(STORAGE_KEY_AUTH);
        sessionStorage.removeItem(STORAGE_KEY_ROLE);
      } else {
        const newAddr = accounts[0].toLowerCase();
        setAccount(newAddr);
        sessionStorage.setItem(STORAGE_KEY_ACCOUNT, newAddr);
        await rehydrateSigner(newAddr);
      }
    };

    const handleChainChanged = (newChainId: string) => {
      console.log("BridgeKey chainChanged:", newChainId);
      const dec = parseInt(newChainId, 16);
      setChainId(dec);
    };

    rawProvider.on("accountsChanged", handleAccountsChanged);
    rawProvider.on("chainChanged", handleChainChanged);

    return () => {
      if (typeof rawProvider.removeListener === "function") {
        rawProvider.removeListener("accountsChanged", handleAccountsChanged);
        rawProvider.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [rehydrateSigner]);

  /**
   * Centralized connectWallet called by user actions
   * Ensures ONE flight only and avoids redundant popups if already authorized
   */
  const connectWallet = useCallback(
    async (targetRole: "patient" | "hospital"): Promise<boolean> => {
      if (isConnectingRef.current) {
        console.log("Connection already in progress, ignoring duplicate click.");
        return false;
      }

      setError(null);
      isConnectingRef.current = true;
      setIsConnecting(true);

      try {
        const rawProvider = getBridgeKeyProvider();
        if (!rawProvider) {
          throw new Error("BridgeKey or Web3 wallet extension not detected in this browser tab.");
        }

        // 1. Check if already connected silently
        let accounts = await getSilentlyConnectedAccounts(rawProvider);

        // 2. If not already authorized, request accounts ONCE
        if (!accounts || accounts.length === 0) {
          accounts = await requestAccountsOnce(rawProvider);
        }

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts authorized by wallet.");
        }

        const selectedAddr = accounts[0].toLowerCase();
        setAccount(selectedAddr);

        // 3. Ensure MST Testnet
        try {
          await switchOrAddMSTTestnet(rawProvider);
        } catch (netErr) {
          console.warn("Network switch notice:", netErr);
        }

        // 4. Create ethers BrowserProvider and get Signer
        const bp = new BrowserProvider(rawProvider);
        const sig = await bp.getSigner();
        const net = await bp.getNetwork();

        setProvider(bp);
        setSigner(sig);
        setChainId(Number(net.chainId));

        // 5. Update authenticated session
        setRole(targetRole);
        setIsAuthenticated(true);

        sessionStorage.setItem(STORAGE_KEY_ROLE, targetRole);
        sessionStorage.setItem(STORAGE_KEY_AUTH, "true");
        sessionStorage.setItem(STORAGE_KEY_ACCOUNT, selectedAddr);

        return true;
      } catch (err: any) {
        console.error("Wallet connection error:", err);
        const friendlyMsg = formatWalletError(err);
        setError(friendlyMsg);
        return false;
      } finally {
        isConnectingRef.current = false;
        setIsConnecting(false);
      }
    },
    []
  );

  /**
   * Administrator Login (DEMO Hackathon Mode)
   */
  const loginAdmin = useCallback(async (passkey: string): Promise<boolean> => {
    setError(null);
    const cleanKey = passkey.trim();

    if (!cleanKey) {
      setError("Please enter the administrator access passkey.");
      return false;
    }

    // Accepts demo passkeys (e.g. admin, demo, MEDICHAIN-ADMIN-2026, or any valid hackathon demo entry)
    setRole("admin");
    setIsAuthenticated(true);
    sessionStorage.setItem(STORAGE_KEY_ROLE, "admin");
    sessionStorage.setItem(STORAGE_KEY_AUTH, "true");
    return true;
  }, []);

  /**
   * Logout clears current role and authentication session
   */
  const logout = useCallback(() => {
    setRole(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem(STORAGE_KEY_ROLE);
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        account,
        signer,
        provider,
        chainId,
        isConnecting,
        isInitialized,
        error,
        role,
        isAuthenticated,
        connectWallet,
        loginAdmin,
        logout,
        clearError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
