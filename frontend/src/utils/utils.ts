export const NavItems = ["Dashboard", "Proposals", "Profile"];

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

export type ProposalData = ProposalDetails & ProposalVotes & {
    proposer: `0x${string}`;
    deadline: bigint;
    state: number;
    timeleft: string;
    status: string;
}