import { ethers } from "hardhat";

async function main() {
  const [initialOwner] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("GovernanceERC20Token");
  const token = await Token.deploy("ChronoForge Token", "CFT", initialOwner.address);

  await token.waitForDeployment();
  const deploymentTx = token.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  console.log("Token Address:", deploymentReceipt?.contractAddress);

  // Granting Minter role
  const MINTER_ROLE = await token.MINTER_ROLE();
  const grantTx = await token.grantRole( MINTER_ROLE, initialOwner.address);
  await grantTx.wait();
  console.log("Granted minter role to :", initialOwner.address);

  // Minting: Mint to all initial addresses here. You'll have to propose to mint after transferring ownership to governor.
  // Important: Make sure tokens are minted to at least one address before changing ownership to governor for voting.
  const amount = ethers.parseEther("1000");
  const mintTx = await token.mint(initialOwner.address, amount);
  await mintTx.wait();
  console.log("Minted 1000 tokens to:", initialOwner.address);

  const renounceTx = await token.renounceRole( MINTER_ROLE, initialOwner.address);
  await renounceTx.wait();
  console.log("Minter role renounced by :", initialOwner.address);

  const hasRole = await token.hasRole(MINTER_ROLE, initialOwner.address);
  console.log("Role renouncement confirmed:", !hasRole);
}

main().catch(console.error);
