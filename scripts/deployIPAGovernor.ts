import { ethers } from "hardhat";

// This is for deployment with ERC20 token for voting
async function main() {
  const governanceToken = process.env.GOVERNANCE_TOKEN!;
  const name = "CreatorDao"; // governor contract name
  const votingDelay = 90; // 1.5 minutes
  const votingPeriod = 5 * 60; // 5 minutes
  const proposalThreshold = ethers.parseEther("100"); // 100 tokens minimum to create a proposal
  const quorum = 4; // 4% of total supply

  const Governor = await ethers.getContractFactory("IPAGovernor");
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
  console.log("Governor Address:", deploymentReceipt?.contractAddress);

  const tokenContract = await ethers.getContractAt("GovernanceERC20Token", governanceToken);

  // Change ownership of the token contract to the governor
  const ADMIN_ROLE = await tokenContract.DEFAULT_ADMIN_ROLE();
  const changeOwnerTx = await tokenContract.grantRole(ADMIN_ROLE, governorAddress!);
  await changeOwnerTx.wait();
  const governorHasRole = await tokenContract.hasRole(ADMIN_ROLE, governorAddress as `0x${string}`);
  console.log("Governor has Admin role:", governorHasRole);
  
  const [admin] = await ethers.getSigners();
  let prevOwnerhasRole = await tokenContract.hasRole(ADMIN_ROLE, admin.address);
  console.log("Before renouncing: Prev owner has Admin role:", prevOwnerhasRole);
  
  // Renounce role
  const renouneTx = await tokenContract.renounceRole(ADMIN_ROLE, admin.address);
  await renouneTx.wait();
  prevOwnerhasRole = await tokenContract.hasRole(ADMIN_ROLE, admin.address);
  console.log("After renouncing: Prev owner has Admin role:", prevOwnerhasRole);
}

main().catch(console.error);
