import { ethers } from "hardhat";

// This is for deployment with ERC20 token for voting
async function main() {
  const governanceToken = process.env.GOVERNANCE_TOKEN!;
  const name = "CreatorDao"; // governor contract name
  const votingDelay = 90; // 1.5 minutes
  const votingPeriod = 5 * 60; // 5 minutes
  const proposalThreshold = ethers.parseEther("100"); // 100 tokens minimum to create a proposal
  const quorum = 4; // 4% of total supply
  const participationThreshold = ethers.parseEther("25"); // 1000 tokens minimum for non-proposal actions

  const Governor = await ethers.getContractFactory("IPAGovernor");
  const governor = await Governor.deploy(
    name,
    votingDelay,
    votingPeriod,
    proposalThreshold,
    quorum,
    participationThreshold,
    governanceToken,
  );

  await governor.waitForDeployment();
  const deploymentTx = governor.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  const governorAddress = deploymentReceipt?.contractAddress;
  console.log("Governor Address:", deploymentReceipt?.contractAddress);
  console.log("Governor Block:", deploymentReceipt?.blockNumber);
}

main().catch(console.error);
