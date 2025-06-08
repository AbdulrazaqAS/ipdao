import { ethers } from "hardhat";

// Note: Some of these can be skipped and later be done using proposal
//       but this should be easier. (Making it part of the setup.)

async function main() {
    const governor = process.env.IPA_GOVERNOR!;
    const quizManager = process.env.QUIZ_MANAGER!;
    const quizUpdater = process.env.QUIZ_UPDATER!;
    const governanceToken = process.env.GOVERNANCE_TOKEN!;

    const quizManagerContract = await ethers.getContractAt("QuizManager", quizManager);

    // Grant updater role to an address for sending result to QuizManager
    const UPDATER_ROLE = await quizManagerContract.UPDATER_ROLE();
    let tx = await quizManagerContract.grantRole(UPDATER_ROLE, quizUpdater as `0x${string}`);
    await tx.wait();
    let hasRole = await quizManagerContract.hasRole(UPDATER_ROLE, quizUpdater as `0x${string}`);
    console.log("Quiz Updater has UPDATER_ROLE:", hasRole);

    // Grant CREATOR_ROLE to governor for creating quizzes
    const CREATOR_ROLE = await quizManagerContract.CREATOR_ROLE();
    tx = await quizManagerContract.grantRole(CREATOR_ROLE, governor as `0x${string}`);
    await tx.wait();
    hasRole = await quizManagerContract.hasRole(CREATOR_ROLE, governor as `0x${string}`);
    console.log("Governor has CREATOR_ROLE:", hasRole);

    // Change admin of the QuizManager contract to be governor
    let ADMIN_ROLE = await quizManagerContract.DEFAULT_ADMIN_ROLE();
    tx = await quizManagerContract.grantRole(ADMIN_ROLE, governor as `0x${string}`);
    await tx.wait();
    hasRole = await quizManagerContract.hasRole(ADMIN_ROLE, governor as `0x${string}`);
    console.log("Governor has QuizManager Admin role:", hasRole);

    const [admin] = await ethers.getSigners();
    hasRole = await quizManagerContract.hasRole(ADMIN_ROLE, admin.address);
    console.log("Before renouncing: Prev owner has QuizManager Admin role:", hasRole);

    // Renounce role
    tx = await quizManagerContract.renounceRole(ADMIN_ROLE, admin.address);
    await tx.wait();
    hasRole = await quizManagerContract.hasRole(ADMIN_ROLE, admin.address);
    console.log("After renouncing: Prev owner has Token Admin role:", hasRole);

    const tokenContract = await ethers.getContractAt("GovernanceERC20Token", governanceToken);

    // Grant MINTER_ROLE to QuizManager for minting rewards
    const MINTER_ROLE = await tokenContract.MINTER_ROLE();
    tx = await tokenContract.grantRole(MINTER_ROLE, quizManager as `0x${string}`);
    await tx.wait();
    hasRole = await tokenContract.hasRole(MINTER_ROLE, quizManager as `0x${string}`);
    console.log("Quiz manager has Token minter role:", hasRole);

    // Grant MINTER_ROLE to Governor for minting tokens
    tx = await tokenContract.grantRole(MINTER_ROLE, governor as `0x${string}`);
    await tx.wait();
    hasRole = await tokenContract.hasRole(MINTER_ROLE, governor as `0x${string}`);
    console.log("Governor has Token minter role:", hasRole);

    // Change admin of the token contract to be governor
    ADMIN_ROLE = await tokenContract.DEFAULT_ADMIN_ROLE();
    tx = await tokenContract.grantRole(ADMIN_ROLE, governor as `0x${string}`);
    await tx.wait();
    hasRole = await tokenContract.hasRole(ADMIN_ROLE, governor as `0x${string}`);
    console.log("Governor has Token Admin role:", hasRole);

    hasRole = await tokenContract.hasRole(ADMIN_ROLE, admin.address);
    console.log("Before renouncing: Prev owner has Token Admin role:", hasRole);

    // Renounce role
    tx = await tokenContract.renounceRole(ADMIN_ROLE, admin.address);
    await tx.wait();
    hasRole = await tokenContract.hasRole(ADMIN_ROLE, admin.address);
    console.log("After renouncing: Prev owner has Token Admin role:", hasRole);
}

main()