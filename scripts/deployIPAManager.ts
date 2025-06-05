import { ethers } from "hardhat";
import "dotenv/config";

// Automatically copy ABI to frotend directory
async function main() {
  const governor = process.env.IPA_GOVERNOR!;
  const licensingModule = process.env.LICENSING_MODULE!;
  const pilTemplate = process.env.PIL_TEMPLATE!;
  const revenueToken = process.env.REVENUE_TOKEN!;
  const coreMetadataViewModule = process.env.CoreMetadataViewModule!;
  const assetRegistry = process.env.IPAssetRegistry!;
  const nftCollection = process.env.NFT_CONTRACT_ADDRESS!;

  const IPAManager = await ethers.getContractFactory("IPAManager");
  const ipaManager = await IPAManager.deploy(
    governor,
    assetRegistry,
    licensingModule,
    pilTemplate,
    coreMetadataViewModule,
    revenueToken,
    nftCollection
  );
  
  await ipaManager.waitForDeployment();
  const deploymentTx = ipaManager.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  console.log("IP Assets Manager Address:", deploymentReceipt?.contractAddress);

}

main().catch(console.error);
