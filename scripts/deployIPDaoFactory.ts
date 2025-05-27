import { ethers } from "hardhat";

async function main() {
  const [initialOwner] = await ethers.getSigners();
  const IPDaoFactory = await ethers.getContractFactory("IPDaoFactory");
  const ipDaoFactory = await IPDaoFactory.deploy(initialOwner.address);

  await ipDaoFactory.waitForDeployment();
  const deploymentTx = ipDaoFactory.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  console.log("Deployment Receipt:", deploymentReceipt);
}

main().catch(console.error);
