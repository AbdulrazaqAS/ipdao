import { ethers } from "hardhat";
import { IPGovernorNoTimelock } from "../typechain-types";
import { IPGovernorNoTimelockInterface } from "../typechain-types/contracts/IPGovernorNoTimelock.sol/IPGovernorNoTimelock";
import { Result } from "ethers";

async function main() {
    const proposalId = 99589558603552480995976039677317349779529315753532842065830292739700963865815n;
    const governorAddress = "0x1bc88526BC2932E8Ad321FAc878C1161aa6d983A";
    const governor = await ethers.getContractAt("IPGovernorNoTimelock", governorAddress);
    await governor.castVote(
      proposalId,
      0  // 0: for, 1: abstain, 2: against
    );

    const votes = await governor.proposalVotes(proposalId);
    console.log("Proposal vote casted. Votes so far:", votes);

  return null;
}

main().catch(console.error);