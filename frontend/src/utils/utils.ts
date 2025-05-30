export enum NavItems {
    Dashboard = "Dashboard", 
    Proposals = "Proposals",
    Profile = "Profile",
}

export interface ProposalDetails {
    id: bigint;
    targets: Array<`0x${string}`>;
    calldatas: Array<`0x${string}`>;
    values: Array<bigint>;
    descriptionHash: `0x${string}`;
}

export interface ProposalVotes {
    against: bigint;
    for: bigint;
    abstain: bigint;
}

export enum VoteChoice {
    Against,
    For,
    Abstain
}

export type ProposalData = ProposalDetails & ProposalVotes & {
    proposer: `0x${string}`;
    deadline: bigint;
    state: number;
    status: ProposalState;
}

export enum ProposalState {
    Pending,
    Active,
    Canceled,
    Defeated,
    Succeeded,
    Queued,
    Expired,
    Executed
}

export interface ProposalArgs {
    targets: Array<`0x${string}`>;
    values: Array<bigint>;
    calldatas: Array<`0x${string}`>;
    description: string;
}