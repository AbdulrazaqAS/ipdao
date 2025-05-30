import { type Address, type WalletClient, getContract } from 'viem'
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json'
import VotesERC20TokenABI from '../assets/abis/VotesERC20TokenABI.json'
import type { ProposalArgs, VoteChoice } from '../utils/utils';

const IPAGovernorAddress: Address = import.meta.env.VITE_IPA_GOVERNOR!;
const GovernanceTokenAddress: Address = import.meta.env.VITE_GOVERNANCE_TOKEN!;

export async function delegateVote(delegate: Address, client: WalletClient): Promise<`0x${string}`> {
    const contract = getContract({
        address: GovernanceTokenAddress,
        abi: VotesERC20TokenABI,
        client
    });

    const txHash = await contract.write.delegate([delegate]);
    return txHash;
}

export async function propose(proposalArgs: ProposalArgs, client: WalletClient): Promise<`0x${string}`> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const txHash = await contract.write.propose([
        proposalArgs.targets,
        proposalArgs.values,
        proposalArgs.calldatas,
        proposalArgs.description
    ]);
    return txHash;
}

export async function castVote(proposalId: bigint, voteChoice: VoteChoice, client: WalletClient): Promise<`0x${string}`> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const txHash = await contract.write.castVote([proposalId, voteChoice]);
    return txHash;
}

export async function executeProposal(proposalId: bigint, client: WalletClient, ipValue?: bigint): Promise<`0x${string}`> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const txHash = await contract.write.execute([proposalId]);
    return txHash;
}