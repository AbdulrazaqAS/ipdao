import { type Address, type PublicClient, type WalletClient, getContract } from 'viem'
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json'
import { type ProposalDetails, type ProposalVotes } from '../utils/utils';

const IPAGovernorAddress: Address = import.meta.env.VITE_IPA_GOVERNOR!;


export async function getProposalByIndex(index: number, client: PublicClient) {
    const details = await client.readContract({
        address: IPAGovernorAddress,
        functionName: 'proposalDetailsAt',
        args: [index],
        abi: IPAGovernorABI
    })

    console.log(details);
}

export async function getProposals(minIndex: number, maxIndex: number, client: PublicClient) {
    if (maxIndex <= minIndex) throw new Error("Invalid range");
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const length = maxIndex - minIndex;
    const range = Array.from({ length }, (_, i) => minIndex + i);

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const details = await Promise.all(
        range.map((i) => contract.read.proposalDetailsAt([i]))
    ) as { 0: bigint, 1: Array<`0x${string}`>, 2: Array<bigint>, 3: Array<`0x${string}`>, 4: `0x${string}` }[];

    const proposals = details.map((proposal): ProposalDetails => {
        return {
            id: proposal[0],
            targets: proposal[1],
            values: proposal[2],
            calldatas: proposal[3],
            descriptionHash: proposal[4],
        }
    });

    console.log("proposals", proposals);
    return proposals;
}

export async function getProposalsVotes(proposalIds: Array<string>, client: PublicClient) {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const proposalsVotes = await Promise.all(
        proposalIds.map((id) => contract.read.proposalVotes([id]))
    ) as { 0: bigint, 1: bigint, 2: bigint }[];

    const refinedProposalsVotes = proposalsVotes.map((votes): ProposalVotes => {
        return {
            against: votes[0],
            for: votes[1],
            abstain: votes[2],
        }
    });

    console.log("refinedProposalsVotes", refinedProposalsVotes);
    return refinedProposalsVotes;
}

export async function getProposalsDeadlines(proposalIds: Array<string>, client: PublicClient) {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const deadlines = await Promise.all(
        proposalIds.map((id) => contract.read.proposalDeadline([id]))
    );
    
    console.log("deadlines", deadlines);
    return deadlines;
}

export async function getProposalsStates(proposalIds: Array<string>, client: PublicClient) {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const statuses = await Promise.all(
        proposalIds.map((id) => contract.read.state([id]))
    );
    
    console.log("statuses", statuses);
    return statuses;
}

export async function getProposalsProposers(proposalIds: Array<string>, client: PublicClient) {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const proposers = await Promise.all(
        proposalIds.map((id) => contract.read.proposalProposer([id]))
    );
    
    console.log("proposers", proposers);
    return proposers;
}