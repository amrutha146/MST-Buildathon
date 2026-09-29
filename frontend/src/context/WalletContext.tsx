"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ethers } from "ethers";
import {
  getEmbeddedSigner,
  getMSTProvider,
  MST_TESTNET_CONFIG,
} from "@/lib/mst";

export type UserRole = "patient" | "hospital" | "admin";

export interface WalletContextType {
  account: string | null;
  displayName: string | null;
  signer: ethers.Signer | null;
  chainId: number;
  isConnecting: boolean;
  isInitialized: boolean;
  error: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loginPatient: (identifier?: string) => Promise<boolean>;
  loginHospital: (identifier?: string) => Promise<boolean>;
  loginAdmin: (passkey: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = "medichain_role";
const STORAGE_KEY_AUTH = "medichain_auth";
const STORAGE_KEY_NAME = "medichain_name";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Initializes sovereign embedded signer on mount and restores session
   */
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        if (typeof window === "undefined") return;

        const embeddedSigner = getEmbeddedSigner();
        const sovereignAddr = await embeddedSigner.getAddress();

        if (isMounted) {
          setSigner(embeddedSigner);
          setAccount(sovereignAddr);

          const savedRole = sessionStorage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
          const savedAuth = sessionStorage.getItem(STORAGE_KEY_AUTH) === "true";
          const savedName = sessionStorage.getItem(STORAGE_KEY_NAME);

          if (savedRole && savedAuth) {
            setRole(savedRole);
            setIsAuthenticated(true);
            setDisplayName(savedName || (savedRole === "patient" ? "Patient Vault" : "Hospital Terminal"));
          }
        }
      } catch (err) {
        console.warn("Session initialization warning:", err);
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
  }, []);

  /**
   * Frictionless Patient Login (ABHA ID / Mobile Number &bull; Embedded Sovereign Signer)
   */
  const loginPatient = useCallback(async (identifier?: string): Promise<boolean> => {
    setError(null);
    setIsConnecting(true);

    try {
      const embeddedSigner = getEmbeddedSigner();
      const addr = await embeddedSigner.getAddress();

      const name = identifier && identifier.trim()
        ? identifier.trim()
        : "Rahul Sharma (ABHA #91-8273-1920)";

      setAccount(addr);
      setSigner(embeddedSigner);
      setDisplayName(name);
      setRole("patient");
      setIsAuthenticated(true);

      sessionStorage.setItem(STORAGE_KEY_ROLE, "patient");
      sessionStorage.setItem(STORAGE_KEY_AUTH, "true");
      sessionStorage.setItem(STORAGE_KEY_NAME, name);

      return true;
    } catch (err: any) {
      setError("Unable to initialize patient sovereign vault. Please try again.");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Frictionless Hospital Login (Institutional Node &bull; Embedded Sovereign Signer)
   */
  const loginHospital = useCallback(async (identifier?: string): Promise<boolean> => {
    setError(null);
    setIsConnecting(true);

    try {
      const embeddedSigner = getEmbeddedSigner();
      const addr = await embeddedSigner.getAddress();

      const name = identifier && identifier.trim()
        ? identifier.trim()
        : "Metropolitan Clinical Center (Dr. S. Rao, MD)";

      setAccount(addr);
      setSigner(embeddedSigner);
      setDisplayName(name);
      setRole("hospital");
      setIsAuthenticated(true);

      sessionStorage.setItem(STORAGE_KEY_ROLE, "hospital");
      sessionStorage.setItem(STORAGE_KEY_AUTH, "true");
      sessionStorage.setItem(STORAGE_KEY_NAME, name);

      return true;
    } catch (err: any) {
      setError("Unable to authorize hospital terminal. Please try again.");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Administrator Login
   */
  const loginAdmin = useCallback(async (passkey: string): Promise<boolean> => {
    setError(null);
    const cleanKey = passkey.trim();

    if (!cleanKey) {
      setError("Please enter the administrator access passkey.");
      return false;
    }

    setRole("admin");
    setIsAuthenticated(true);
    setDisplayName("Administrator Console");

    sessionStorage.setItem(STORAGE_KEY_ROLE, "admin");
    sessionStorage.setItem(STORAGE_KEY_AUTH, "true");
    sessionStorage.setItem(STORAGE_KEY_NAME, "Administrator Console");

    return true;
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    setRole(null);
    setIsAuthenticated(false);
    setDisplayName(null);
    sessionStorage.removeItem(STORAGE_KEY_ROLE);
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_NAME);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        account,
        displayName,
        signer,
        chainId: MST_TESTNET_CONFIG.chainIdDecimal,
        isConnecting,
        isInitialized,
        error,
        role,
        isAuthenticated,
        loginPatient,
        loginHospital,
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
