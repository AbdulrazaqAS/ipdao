import { ethers } from "hardhat";
import "dotenv/config";

// TODO: Automatically copy ABI to frotend directory
async function main() {
  const governor = process.env.IPA_GOVERNOR!;
  const licensingModule = process.env.LICENSING_MODULE!;
  const pilTemplate = process.env.PIL_TEMPLATE!;
  const coreMetadataViewModule = process.env.CoreMetadataViewModule!;
  const assetRegistry = process.env.IPAssetRegistry!;
  const derivativeWorkflows = process.env.DERIVATIVE_WORKFLOWS!;
  const registrationWorkflows = process.env.REGISTRATION_WORKFLOWS!;
  const royaltyModule = process.env.ROYALTY_MODULE!;
  const daoRoyaltyTokens = 20 * 10 ** 6 // 20% of royalty tokens for each asset will be allocated to DAO
  const spgNftName = "ChronoForgeDAOSPGNFT";  // Collection for minting new tokens/assets
  const spgNftSymbol = "CFTSPGNFT";

  const IPAManager = await ethers.getContractFactory("IPAManager");
  const ipaManager = await IPAManager.deploy(
    daoRoyaltyTokens,
    governor,
    assetRegistry,
    licensingModule,
    pilTemplate,
    coreMetadataViewModule,
    registrationWorkflows,
    derivativeWorkflows,
    royaltyModule,
    spgNftName,
    spgNftSymbol
  );
  
  await ipaManager.waitForDeployment();
  const deploymentTx = ipaManager.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  console.log("IP Assets Manager Address:", deploymentReceipt?.contractAddress);
}

main().catch(console.error);
