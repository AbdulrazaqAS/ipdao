import { type Address, type PublicClient, getContract, parseAbiItem } from 'viem'
import { type ProposalDetails, type ProposalVotes, type QuizContractMetadata} from '../utils/utils';
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json';
import VotesERC20TokenABI from '../assets/abis/VotesERC20TokenABI.json';
import QuizManagerABI from '../assets/abis/QuizManagerABI.json';
import type { StoryClient } from '@story-protocol/core-sdk';

const IPAGovernorAddress: Address = import.meta.env.VITE_IPA_GOVERNOR!;
const GovernanceTokenAddress: Address = import.meta.env.VITE_GOVERNANCE_TOKEN!;
const QuizManagerAddress: Address = import.meta.env.VITE_QUIZ_MANAGER!;

export async function getProposalsCount(client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const count = await contract.read.proposalCount();
    return count as bigint;
}

export async function getProposalByIndex(index: number, client: PublicClient): Promise<ProposalDetails> {
    const details = await client.readContract({
        address: IPAGovernorAddress,
        functionName: 'proposalDetailsAt',
        args: [index],
        abi: IPAGovernorABI
    }) as [bigint, Array<`0x${string}`>, Array<bigint>, Array<`0x${string}`>, `0x${string}`];

    return {
        id: details[0],
        targets: details[1],
        values: details[2],
        calldatas: details[3],
        descriptionHash: details[4]
    } as ProposalDetails;
}

export async function getProposals(indices: Array<number>, client: PublicClient): Promise<ProposalDetails[]> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const details = await Promise.all(
        indices.map((i) => contract.read.proposalDetailsAt([i]))
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

    return proposals;
}

export async function getProposalsVotes(proposalIds: Array<bigint>, client: PublicClient): Promise<ProposalVotes[]> {
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

    return refinedProposalsVotes;
}

export async function getProposalsDeadlines(proposalIds: Array<bigint>, client: PublicClient): Promise<bigint[]> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const deadlines = await Promise.all(
        proposalIds.map((id) => contract.read.proposalDeadline([id]))
    ) as bigint[];

    return deadlines;
}

export async function getProposalsStates(proposalIds: Array<bigint>, client: PublicClient): Promise<number[]> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const statuses = await Promise.all(
        proposalIds.map((id) => contract.read.state([id]))
    ) as number[];

    return statuses;
}

export async function getProposalsProposers(proposalIds: Array<bigint>, client: PublicClient): Promise<Array<`0x${string}`>> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const proposers = await Promise.all(
        proposalIds.map((id) => contract.read.proposalProposer([id]))
    ) as Array<`0x${string}`>;

    return proposers;
}

export async function getProposalsDescriptions(client: PublicClient): Promise<{
    proposalId: bigint | undefined;
    description: string | undefined;
}[]> {
    // ABI for the ProposalCreated event
    const proposalCreatedAbi = parseAbiItem(
        'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'
    );

    const governorDeploymentBlock = import.meta.env.VITE_IPA_GOVERNOR_BLOCK ?? 0;

    const logs = await client.getLogs({
        address: IPAGovernorAddress,
        event: proposalCreatedAbi,
        fromBlock: BigInt(governorDeploymentBlock),
        toBlock: 'latest',
    })

    // Extract proposalId and description
    const proposals = logs.map(log => ({
        proposalId: log.args.proposalId,
        description: log.args.description
    }))

    console.log(proposals)
    return proposals
}

export async function getProposalThreshold(client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const threshold = await contract.read.proposalThreshold();

    return threshold as bigint;
}

export async function getParticipationThreshold(client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const value = await contract.read.participationThreshold();
    return value as bigint;
}

export async function getQuorum(client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const quorum = await contract.read.quorumNumerator();

    return quorum as bigint;
}

export async function getGovernanceToken(client: PublicClient): Promise<Address> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const address = await contract.read.token();

    return address as Address;
}

export async function getVotingDelay(client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const delay = await contract.read.votingDelay();

    return delay as bigint;
}

export async function getVotingPeriod(client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const period = await contract.read.votingPeriod();

    return period as bigint;
}

export async function getGovernanceTokenBalance(addr: Address, client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: GovernanceTokenAddress,
        abi: VotesERC20TokenABI,
        client
    });

    const balance = await contract.read.balanceOf([addr]);
    return balance as bigint;
}

export async function getGovernanceTokenSymbol(client: PublicClient): Promise<string> {
    const contract = getContract({
        address: GovernanceTokenAddress,
        abi: VotesERC20TokenABI,
        client
    });

    const sym = await contract.read.symbol();
    return sym as string;
}

export async function getTokenSymbol(addr: Address, client: PublicClient): Promise<string> {
    const contract = getContract({
        address: addr,
        abi: VotesERC20TokenABI,
        client
    });

    const sym = await contract.read.symbol();
    return sym as string;
}

export async function getGovernanceTokenName(client: PublicClient): Promise<string> {
    const contract = getContract({
        address: GovernanceTokenAddress,
        abi: VotesERC20TokenABI,
        client
    });

    const name = await contract.read.name();
    return name as string;
}

export async function getGovernanceTokenSupply(client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: GovernanceTokenAddress,
        abi: VotesERC20TokenABI,
        client
    });

    const supply = await contract.read.totalSupply();
    return supply as bigint;
}

export async function getUserVotingPower(addr: Address, client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const now = Math.floor(Date.now() / 1000);
    const power = await contract.read.getVotes([addr, now]);
    return power as bigint;
}

export async function hasVoted(proposalId: bigint, addr: Address, client: PublicClient): Promise<boolean> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const power = await contract.read.hasVoted([proposalId, addr]);
    return power as boolean;
}

export async function getDAOName(client: PublicClient): Promise<string> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const power = await contract.read.name();
    return power as string;
}

export async function getGovernanceTokenHolders(chain: "aeneid" | "mainnet"): Promise<number> {
    const chainPart = chain === "aeneid" ? "aeneid." : "";
    const url = `https://${chainPart}storyscan.io/api/v2/tokens/${GovernanceTokenAddress}/holders`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "accept": "application/json"
        }
    });

    const holdersMetadata = await response.json();
    return holdersMetadata.items.length as number;
}

export async function getQuizzesCount(client: PublicClient): Promise<bigint> {
    const contract = getContract({
        address: QuizManagerAddress,
        abi: QuizManagerABI,
        client
    });

    const count = await contract.read.totalQuizzes();
    return count as bigint;
}

export async function getQuizzes(indices: Array<number>, client: PublicClient): Promise<QuizContractMetadata[]> {
    const contract = getContract({
        address: QuizManagerAddress,
        abi: QuizManagerABI,
        client
    });

    // Leveraging batching configured on the client.
    // TODO: Limit the range so as not to exceed provider limits
    const details = await Promise.all(
        indices.map((i) => contract.read.quizzes([i]))
    ) as { 0: number, 1: number, 2: boolean, 3: bigint, 4: bigint, 5: bigint, 6: string}[];

    const proposals = details.map((proposal): QuizContractMetadata => {
        return {
            maxTrials: proposal[0],
            minScore: proposal[1],
            exists: proposal[2],
            winners: proposal[3],
            deadline: proposal[4],
            prizeAmount: proposal[5],
            metadataURI: proposal[6],
        }
    });

    return proposals;
}

export async function getQuizzesUserTrials(quizIds: Array<number>, user: Address, client: PublicClient): Promise<bigint[]> {
    const contract = getContract({
        address: QuizManagerAddress,
        abi: QuizManagerABI,
        client
    });

    const trials = await Promise.all(
        quizIds.map((i) => contract.read.userTrials([user, i]))
    )
    return trials as bigint[];
}

export async function getQuizzesUserCanClaim(quizIds: Array<number>, user: Address, client: PublicClient): Promise<boolean[]> {
    const contract = getContract({
        address: QuizManagerAddress,
        abi: QuizManagerABI,
        client
    });

    const canClaims = await Promise.all(
        quizIds.map((i) => contract.read.canClaim([user, i]))
    );

    return canClaims as boolean[];
}

export async function getQuizzesUserHasClaimed(quizIds: Array<number>, user: Address, client: PublicClient): Promise<boolean[]> {
    const contract = getContract({
        address: QuizManagerAddress,
        abi: QuizManagerABI,
        client
    });

    const hasClaimeds = await Promise.all(
        quizIds.map((i) => contract.read.hasClaimed([user, i]))
    );

    return hasClaimeds as boolean[];
}

export async function getClaimableRevenue(storyClient: StoryClient, claimer: Address, ipId: Address, token: Address): Promise<bigint> {
    const amount = await storyClient.royalty.claimableRevenue({
        royaltyVaultIpId: ipId,
        claimer,
        token,
    })
    
    return amount;
}

export async function getRoyaltyVaultAddress(storyClient: StoryClient, ipId: Address): Promise<Address> {
    const addr = await storyClient.royalty.getRoyaltyVaultAddress(ipId);
    return addr;
}