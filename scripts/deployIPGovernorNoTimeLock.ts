import { ethers } from "hardhat";

async function main (){
    const TOKEN = "0xc5B77F18d6488D86d99F9A68fC79eA4230BA62d6";
    const name = "CreatorDao";  // governor contract name
    const votingDelay = 5;  // 1 minutes
    const votingPeriod = 15;  // 3 minutes
    const proposalThreshold = 100e18.toString(); // 100 tokens minimum to create a proposal
    const quorum = 4; // 4% of total supply

    const [initialOwner] = await ethers.getSigners();
    const Governor = await ethers.getContractFactory("IPGovernanceNoTimelock");
    const governor = await Governor.deploy(name, votingDelay, votingPeriod, proposalThreshold, quorum, TOKEN);
    
    await governor.waitForDeployment();
    const deploymentTx = governor.deploymentTransaction();
    const deploymentReceipt = await deploymentTx!.wait();
    const governorAddress = deploymentReceipt?.contractAddress;
    console.log("Deployment Receipt:", deploymentReceipt);

    const tokenContract = await ethers.getContractAt("Token", TOKEN);
    const changeOwnerTx = await tokenContract.transferOwnership(governorAddress!);
    await changeOwnerTx.wait();
    const newOwner = await tokenContract.owner();
    console.log("Token owner changed. New owner is governor:", newOwner);
}

main().catch(console.error);