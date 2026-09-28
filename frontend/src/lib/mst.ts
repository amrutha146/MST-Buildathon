import { BrowserProvider, Contract, ethers } from "ethers";
import contractAddressData from "./contractAddress.json";
import MedicalConsentABI from "./MedicalConsentABI.json";

export const MST_TESTNET_CONFIG = {
  chainId: "0x5752c35", // 91562037 in hex
  chainIdDecimal: 91562037,
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
    ""
  );
}

/**
 * Returns the EIP-1193 provider injected by BridgeKey or standard Web3 wallet
 */
export function getBridgeKeyProvider(): any {
  if (typeof window === "undefined") return null;
  // BridgeKey injects window.bridgekey or standard window.ethereum
  return (window as any).bridgekey || (window as any).ethereum || null;
}

/**
 * Requests wallet connection and ensures the user is connected to MST Testnet (4545)
 */
export async function connectBridgeKey(): Promise<{
  address: string;
  provider: BrowserProvider;
  signer: ethers.JsonRpcSigner;
}> {
  const rawProvider = getBridgeKeyProvider();
  if (!rawProvider) {
    throw new Error(
      "BridgeKey wallet not detected. Please install BridgeKey from Chrome Web Store or mobile app."
    );
  }

  const provider = new BrowserProvider(rawProvider);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Verify and switch network if necessary
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== MST_TESTNET_CONFIG.chainIdDecimal) {
    await switchOrAddMSTTestnet(rawProvider);
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
      params: [{ chainId: MST_TESTNET_CONFIG.chainId }],
    });
  } catch (switchError: any) {
    // Error 4902 means the chain has not been added to the wallet yet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      await rawProvider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: MST_TESTNET_CONFIG.chainId,
            chainName: MST_TESTNET_CONFIG.chainName,
            rpcUrls: MST_TESTNET_CONFIG.rpcUrls,
            nativeCurrency: MST_TESTNET_CONFIG.nativeCurrency,
            blockExplorerUrls: MST_TESTNET_CONFIG.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw switchError;
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
    throw new Error("Contract address is not yet configured. Please deploy Phase 1 first.");
  }
  return new Contract(address, MedicalConsentABI, signerOrProvider);
}
