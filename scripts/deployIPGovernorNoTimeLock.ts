import { ethers } from "hardhat";

// This is for deployment with ERC20 token for voting
async function main() {
  const governanceToken = "0x84E13D0d7396f881F3f78505e14af04AE987cBE9";
  const name = "CreatorDao"; // governor contract name
  const votingDelay = 5 * 60; // 5 minutes
  const votingPeriod = 15 * 60; // 15 minutes
  const proposalThreshold = ethers.parseEther("100"); // 100 tokens minimum to create a proposal
  const quorum = 4; // 4% of total supply

  const Governor = await ethers.getContractFactory("IPGovernorNoTimelock");
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

  const tokenContract = await ethers.getContractAt("ERC20Token", governanceToken);

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
