const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("----------------------------------------------------");
  console.log("Starting MedicalConsent Deployment on MST Blockchain");
  console.log("Network:", hre.network.name);
  console.log("----------------------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", hre.ethers.formatEther(balance), "MSTC");

  const MedicalConsentFactory = await hre.ethers.getContractFactory("MedicalConsent");
  console.log("Deploying MedicalConsent smart contract...");

  const medicalConsent = await MedicalConsentFactory.deploy();
  await medicalConsent.waitForDeployment();

  const contractAddress = await medicalConsent.getAddress();
  const deployTx = medicalConsent.deploymentTransaction();

  console.log("====================================================");
  console.log(" SUCCESS: MedicalConsent Deployed to MST Blockchain!");
  console.log(" Contract Address:", contractAddress);
  console.log(" Transaction Hash:", deployTx.hash);
  console.log(" View on MSTScan:  https://mstscan.com/tx/" + deployTx.hash);
  console.log(" View Contract:    https://mstscan.com/address/" + contractAddress);
  console.log("====================================================");

  // Automatically export contract address and ABI to frontend
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 4545,
    contractAddress: contractAddress,
    transactionHash: deployTx.hash,
    deployedAt: new Date().toISOString(),
  };

  const frontendConfigDir = path.join(__dirname, "../../frontend/src/lib");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendConfigDir, "contractAddress.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Copy ABI artifact to frontend
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/MedicalConsent.sol/MedicalConsent.json"
  );
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      path.join(frontendConfigDir, "MedicalConsentABI.json"),
      JSON.stringify(artifact.abi, null, 2)
    );
    console.log("Exported ABI and contract address to frontend/src/lib/");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
