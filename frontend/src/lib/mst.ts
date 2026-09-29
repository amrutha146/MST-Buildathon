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
 * Direct JSON-RPC Provider for MST Testnet (Zero Extension Required)
 */
export function getMSTProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(MST_TESTNET_CONFIG.rpcUrls[0]);
}

/**
 * Pre-funded Sovereign Signer for gasless instant patient & hospital interactions on MST Testnet
 */
export const DEFAULT_SOVEREIGN_KEY =
  process.env.NEXT_PUBLIC_SOVEREIGN_KEY ||
  "0x5f7ac2649d3117dc25b82726a868760126ad5a40a400a2c081d1b61221b04f66";

export function getEmbeddedSigner(): ethers.Wallet {
  const provider = getMSTProvider();
  return new ethers.Wallet(DEFAULT_SOVEREIGN_KEY, provider);
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
