import { BrowserProvider, Contract, ethers } from "ethers";
import contractAddressData from "./contractAddress.json";
import MedicalConsentABI from "./MedicalConsentABI.json";

export const MST_TESTNET_CONFIG = {
  chainIdHex: "0x5752c35", // 91562037 in hex
  chainIdDecimal: 91562037,
  legacyChainIdHex: "0x11C1", // 4545 in hex (as documented in some guides)
  legacyChainIdDecimal: 4545,
  chainName: "MST Testnet",
  rpcUrls: ["https://testnetrpc.mstblockchain.com"],
  nativeCurrency: {
    name: "MSTC",
    symbol: "MSTC",
    decimals: 18,
  },
  blockExplorerUrls: ["https://mstscan.com"],
};

export function getContractAddress(): string {
  return (
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
    contractAddressData.contractAddress ||
    "0xD86D80641E43a3055BFABC7A0435023E870cF651"
  );
}

/**
 * Returns the EIP-1193 provider injected by BridgeKey or standard Web3 wallet
 */
export function getBridgeKeyProvider(): any {
  if (typeof window === "undefined") return null;

  const w = window as any;

  // 1. Explicit BridgeKey provider injection
  if (w.bridgekey) return w.bridgekey;
  if (w.bridgeKey) return w.bridgeKey;

  // 2. Multi-provider array (e.g. if multiple wallets installed)
  if (w.ethereum?.providers && Array.isArray(w.ethereum.providers)) {
    const bk = w.ethereum.providers.find(
      (p: any) => p.isBridgeKey || p.name?.toLowerCase().includes("bridgekey")
    );
    if (bk) return bk;
  }

  // 3. Standard window.ethereum injection
  if (w.ethereum) return w.ethereum;

  return null;
}

/**
 * Checks for already-authorized accounts silently without opening a wallet popup
 */
export async function getSilentlyConnectedAccounts(rawProvider: any): Promise<string[]> {
  if (!rawProvider || typeof rawProvider.request !== "function") return [];
  try {
    const accounts = await rawProvider.request({ method: "eth_accounts" });
    return accounts || [];
  } catch (e) {
    return [];
  }
}

let pendingConnectionPromise: Promise<string[]> | null = null;

/**
 * Single-flight requestAccounts execution to prevent "already pending" or "superseded" errors
 */
export async function requestAccountsOnce(rawProvider: any): Promise<string[]> {
  if (pendingConnectionPromise) {
    return pendingConnectionPromise;
  }

  pendingConnectionPromise = (async () => {
    try {
      const accounts = await rawProvider.request({ method: "eth_requestAccounts" });
      return accounts || [];
    } catch (err: any) {
      // If error indicates already pending or superseded, attempt silent fetch
      if (err.code === -32002 || err.message?.includes("already pending") || err.message?.includes("Superseded")) {
        const silent = await getSilentlyConnectedAccounts(rawProvider);
        if (silent && silent.length > 0) {
          return silent;
        }
      }
      throw err;
    } finally {
      pendingConnectionPromise = null;
    }
  })();

  return pendingConnectionPromise;
}

/**
 * Converts wallet error codes and messages to user-friendly text
 */
export function formatWalletError(err: any): string {
  if (!err) return "An unexpected error occurred.";
  const msg = err.message || String(err);
  if (err.code === 4001 || msg.includes("rejected") || msg.includes("cancelled")) {
    return "Wallet connection was cancelled.";
  }
  if (err.code === -32002 || msg.includes("already pending") || msg.includes("Superseded")) {
    return "BridgeKey connection is already in progress. Please check your wallet extension popup.";
  }
  if (msg.includes("not detected") || msg.includes("extension")) {
    return "BridgeKey or Web3 wallet extension not detected in this browser.";
  }
  return "Unable to connect to BridgeKey. Please try again.";
}

/**
 * Automatically prompts BridgeKey to switch to or add the MST Testnet
 */
export async function switchOrAddMSTTestnet(rawProvider: any): Promise<void> {
  if (!rawProvider || typeof rawProvider.request !== "function") return;
  try {
    await rawProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MST_TESTNET_CONFIG.chainIdHex }],
    });
  } catch (switchError: any) {
    if (
      switchError.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      switchError.message?.includes("Unrecognized chain ID")
    ) {
      await rawProvider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: MST_TESTNET_CONFIG.chainIdHex,
            chainName: MST_TESTNET_CONFIG.chainName,
            rpcUrls: MST_TESTNET_CONFIG.rpcUrls,
            nativeCurrency: MST_TESTNET_CONFIG.nativeCurrency,
            blockExplorerUrls: MST_TESTNET_CONFIG.blockExplorerUrls,
          },
        ],
      });
    }
  }
}

/**
 * Returns an instance of the MedicalConsent contract connected to the user's signer or read-only provider
 */
export function getMedicalConsentContract(
  signerOrProvider: ethers.Signer | ethers.Provider
): Contract {
  const address = getContractAddress();
  if (!address) {
    throw new Error("Contract address is not yet configured.");
  }
  return new Contract(address, MedicalConsentABI, signerOrProvider);
}
