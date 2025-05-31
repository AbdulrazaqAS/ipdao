export enum NavItems {
    Dashboard = "Dashboard", 
    Proposals = "Proposals",
    Assets = "Assets",
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

export interface AssetCoreMetadata {
    nftTokenURI: string;
    nftMetadataHash: string;
    metadataURI: string;
    metadataHash: string;
    registrationDate: bigint;
    owner: `0x${string}`;
}

export interface CreatorMetadata {
    address: `0x${string}`;
    contributionPercent: number;
    name: string
}

export interface NFTMetadata {
    animation_url: string;
    attributes: {
        key: string;
        value: string;
    }[]
    description: string;
    image: string;
    name: string
}

export interface AssetMetadata {
    createdAt: string;
    creators: CreatorMetadata[];
    description: string;
    image: string;
    imageHash: string;
    mediaHash: string;
    mediaType: string;
    mediaUrl: string;
    title: string;
    nftMetadata: NFTMetadata;
    registrationDate: bigint;
    owner: `0x${string}`;
}
