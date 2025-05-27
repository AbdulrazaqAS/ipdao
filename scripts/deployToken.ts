import { ethers } from "hardhat";

async function main (){
    const [initialOwner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("Creator", "CRT", initialOwner.address);

    await token.waitForDeployment();
    const deploymentTx = token.deploymentTransaction();
    const deploymentReceipt = await deploymentTx!.wait();
    console.log("Token Deployment Receipt:", deploymentReceipt);
}

main().catch(console.error);