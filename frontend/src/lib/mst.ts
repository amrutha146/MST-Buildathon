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
 * Requests wallet connection and ensures the user is connected to MST Testnet
 */
export async function connectBridgeKey(): Promise<{
  address: string;
  provider: BrowserProvider;
  signer: ethers.JsonRpcSigner;
}> {
  const rawProvider = getBridgeKeyProvider();
  if (!rawProvider) {
    throw new Error(
      "BridgeKey or Web3 wallet extension not detected in this browser tab. Please reload or click the BridgeKey extension icon to activate it."
    );
  }

  const provider = new BrowserProvider(rawProvider);

  // Request accounts from wallet
  let accounts: string[] = [];
  try {
    accounts = await rawProvider.request({ method: "eth_requestAccounts" });
  } catch (err: any) {
    // Fallback to standard provider send
    accounts = await provider.send("eth_requestAccounts", []);
  }

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts authorized by wallet.");
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Try network switch gracefully without crashing connection if already on MST Testnet
  try {
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);

    if (
      currentChainId !== MST_TESTNET_CONFIG.chainIdDecimal &&
      currentChainId !== MST_TESTNET_CONFIG.legacyChainIdDecimal
    ) {
      await switchOrAddMSTTestnet(rawProvider);
    }
  } catch (netErr: any) {
    console.warn("Network switch notice:", netErr.message);
  }

  return { address, provider, signer };
}

/**
 * Automatically prompts BridgeKey to switch to or add the MST Testnet
 */
export async function switchOrAddMSTTestnet(rawProvider: any): Promise<void> {
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
