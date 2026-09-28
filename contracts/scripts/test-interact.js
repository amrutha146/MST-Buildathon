const hre = require("hardhat");
const contractData = require("../../frontend/src/lib/contractAddress.json");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Interacting with MedicalConsent on MST Testnet...");
  console.log("Contract Address:", contractData.contractAddress);
  console.log("Caller Address:  ", signer.address);

  const MedicalConsent = await hre.ethers.getContractAt(
    "MedicalConsent",
    contractData.contractAddress,
    signer
  );

  const mockRecordId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("GENESIS-PATIENT-RECORD-001"));
  const mockFileHash = hre.ethers.sha256(hre.ethers.toUtf8Bytes("EncryptedClinicalBloodReport2026"));
  const mockPointer = "enc-store://genesis-record-001.enc";

  console.log("Executing live on-chain registerRecord()...");
  const tx = await MedicalConsent.registerRecord(mockRecordId, mockFileHash, mockPointer);
  console.log("Transaction Hash:", tx.hash);
  console.log("Waiting for confirmation on MST Testnet...");
  await tx.wait();

  console.log("Confirmed!");
  console.log("Verifying on-chain state...");
  const record = await MedicalConsent.getRecord(mockRecordId);
  console.log("Record exists on-chain:", record.exists);
  console.log("Record patient:        ", record.patient);
  console.log("View Tx on MSTScan:    https://mstscan.com/tx/" + tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Interaction failed:", err);
    process.exit(1);
  });
