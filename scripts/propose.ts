import { ethers } from "hardhat";
import { IPGovernorNoTimelock } from "../typechain-types";
import { IPGovernorNoTimelockInterface } from "../typechain-types/contracts/IPGovernorNoTimelock.sol/IPGovernorNoTimelock";
import { Result } from "ethers";

async function main() {
    const tokenAddress = "0x26d67A01A09ab63960bdD9A1d815c52e9BB2d93E";
    const token = await ethers.getContractAt('Token', tokenAddress);
    
    await token.delegate("0xE09b13f723f586bc2D98aa4B0F2C27A0320D20AB");  // delegate votes to self so as to propose

    const receiver = "0xDaaE14a470e36796ADf9c75766D3d8ADD0a3D94c";
    const grantAmount = ethers.parseEther("100");
    const transferCalldata = token.interface.encodeFunctionData('transfer', [receiver, grantAmount]);

    const proposalNum = 4;
    const governorAddress = "0x1bc88526BC2932E8Ad321FAc878C1161aa6d983A";
    const governor = await ethers.getContractAt("IPGovernorNoTimelock", governorAddress);
    const description = `Proposal #${proposalNum}: Grant ${ethers.formatEther(grantAmount)} to ${receiver}`;
    const tx = await governor.propose(
      [tokenAddress],
      [0],
      [transferCalldata],
      description,
    );
    const txReceipt = await tx.wait();

    console.log("Proposal created. Id:", getProposalEventArgs(txReceipt!.logs, governor.interface));
}

function getProposalEventArgs(
  logs: any,
  daoInterface: IPGovernorNoTimelockInterface,
): { proposalId: any; voteStart: any; voteEnd: any; } | null {
  for (const log of logs) {
    const parsed = daoInterface.parseLog(log);
    if (parsed?.name === "ProposalCreated") {
      return {
        proposalId: parsed.args.proposalId,
        voteStart: parsed.args.voteStart,
        voteEnd: parsed.args.voteEnd
      };
    }
  }

  return null;
}

main().catch(console.error);