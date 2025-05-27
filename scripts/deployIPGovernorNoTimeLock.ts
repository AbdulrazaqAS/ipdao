import { ethers } from "hardhat";

async function main() {
  const governanceToken = "0x26d67A01A09ab63960bdD9A1d815c52e9BB2d93E";
  const name = "CreatorDao"; // governor contract name
  const votingDelay = 15; // 3 minutes
  const votingPeriod = 30; // 6 minutes
  const proposalThreshold = ethers.parseEther("100"); // 100 tokens minimum to create a proposal
  const quorum = 4; // 4% of total supply

  const Governor = await ethers.getContractFactory("IPGovernanceNoTimelock");
  const governor = await Governor.deploy(
    name,
    votingDelay,
    votingPeriod,
    proposalThreshold,
    quorum,
    governanceToken,
  );

  await governor.waitForDeployment();
  const deploymentTx = governor.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  const governorAddress = deploymentReceipt?.contractAddress;
  console.log("Deployment Receipt:", deploymentReceipt);

  const tokenContract = await ethers.getContractAt("Token", governanceToken);

  // Important: Make sure tokens are minted to even one address before changing ownership
  const initialTokensReceiver = await tokenContract.owner();
  const amount = ethers.parseEther("1000");
  const mintTx = await tokenContract.mint(initialTokensReceiver, amount);
  await mintTx.wait();
  console.log("Minted 1000 tokens to:", initialTokensReceiver);

  // Change ownership of the token contract to the governor
  const changeOwnerTx = await tokenContract.transferOwnership(governorAddress!);
  await changeOwnerTx.wait();
  const newOwner = await tokenContract.owner();
  console.log("Token owner changed. New owner is governor:", newOwner);
}

main().catch(console.error);
