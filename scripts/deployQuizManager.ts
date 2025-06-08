import { ethers } from "hardhat";
import "dotenv/config";

// Automatically copy ABI to frotend directory
async function main() {
  const [admin] = await ethers.getSigners();
  const governanceToken = process.env.GOVERNANCE_TOKEN!;

  const QuizManager = await ethers.getContractFactory("QuizManager");
  const quizManager = await QuizManager.deploy(
    admin.address,
    governanceToken
  );
  
  await quizManager.waitForDeployment();
  const deploymentTx = quizManager.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  console.log("Quiz Manager Address:", deploymentReceipt?.contractAddress);
}

main().catch(console.error);
