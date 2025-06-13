import { ethers } from "hardhat";
import "dotenv/config";

// Automatically copy ABI to frotend directory
async function main() {
  const [admin] = await ethers.getSigners();
  const quizCreator = process.env.IPA_GOVERNOR!;  // Governor is the quiz creator
  const quizSubmitter = process.env.QUIZ_SUBMITTER!;
  const ipaManager = process.env.IPA_MANAGER!;

  const QuizManager = await ethers.getContractFactory("QuizManager");
  const quizManager = await QuizManager.deploy(
    admin.address,
    quizCreator,
    quizSubmitter,
    ipaManager
  );
  
  await quizManager.waitForDeployment();
  const deploymentTx = quizManager.deploymentTransaction();
  const deploymentReceipt = await deploymentTx!.wait();
  console.log("Quiz Manager Address:", deploymentReceipt?.contractAddress);
}

main().catch(console.error);
