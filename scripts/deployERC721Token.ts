import { ethers } from "hardhat";

async function main() {
  const [initialOwner] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("ERC721Token");
  const token = await Token.deploy("CreatorNFT", "CRTNFT", initialOwner.address);

  await token.waitForDeployment();
  const deploymentTx = token.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  console.log("NFT Deployment Receipt:", deploymentReceipt);
}

main().catch(console.error);
