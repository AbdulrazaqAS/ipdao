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
  const spgNftName = "CreatorDAOSPGNFT";
  const spgNftSymbol = "CRTSPGNFT";

  const IPAManager = await ethers.getContractFactory("IPAManager");
  const ipaManager = await IPAManager.deploy(
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
