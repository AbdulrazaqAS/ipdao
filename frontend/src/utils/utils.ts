import { parseEther, zeroAddress, type Address } from "viem";
import { toast } from "sonner";

export const AeniedProtocolExplorer = 'https://aeneid.explorer.story.foundation';
export const MainnetProtocolExplorer = 'https://explorer.story.foundation';

export enum NavItems {
    Dashboard = "Dashboard",
    Airdrops = "Airdrops",
    Proposals = "Proposals",
    Assets = "Assets",
    Governance = "Governance",
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
    description: string | null;
    hasVoted?: boolean;
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
    animation_url?: string;
    attributes: {
        key: string;
        value: string;
    }[]
    description: string;
    image: string;
    name: string
}

export interface AssetMetadata {
    id: `0x${string}`;
    createdAt: string;
    creators: CreatorMetadata[];
    description: string;
    image: string;
    imageHash: string;
    mediaHash: string;
    mediaType: string;
    mediaUrl: string;
    title: string;
    registrationDate: bigint;
    nftTokenURI: string;
    owner: `0x${string}`;
}

export interface AssetAPIMetadata {
    ancestorCount: number;
    blockNumber: string;
    blockTimestamp: string;
    childrenCount: number;
    descendantCount: number;
    id: string;
    ipId: string;
    isGroup: boolean;
    latestArbitrationPolicy: string;
    nftMetadata: {
        chainId: string;
        imageUrl: string;
        name: string;
        tokenContract: string;
        tokenId: string;
        tokenUri: string;
    },
    parentCount: number;
    rootCount: number;
    rootIpIds: string[];
    transactionHash: string;
}

export interface AssetLicenseTerms {
    blockNumber: string;
    blockTime: string;
    disabled: boolean;
    id: string;
    ipId: string;
    licenseTemplate: string;
    licenseTermsId: string;
    licensingConfig: {
        commercialRevShare: number,
        disabled: boolean,
        expectGroupRewardPool: string,
        expectMinimumGroupRewardShare: number,
        hookData: string,
        isSet: boolean,
        licensingHook: string,
        mintingFee: string
    }
}

export interface QuizContractMetadata {
    maxTrials: number;
    minScore: number;
    exists: boolean;
    deadline: bigint;
    createdAt: bigint;
    prizeAmount: bigint;
    metadataURI: string;
    prizeToken: Address;
    winners: bigint;
    maxWinners: bigint;
}

export interface QuizMetadata {
    quizId: number;
    title: string;
    questionsPerUser: number;
    maxTrials: number;
    minScore: number;
    deadline: string;
    prizeAmount: bigint;
    winners?: number;
    prizeToken: Address;
    maxWinners: number;
    questions: {
        question: string;
        options: string[]
    }[];
    encryptedAnswers: string;
};

export interface TomoAccount {
  address: string;
  displayName: string;
  hasPendingTransactions: boolean;
  balanceDecimals?: string;
  balanceFormatted?: string;
  balanceSymbol?: string;
  displayBalance?: string;
  ensAvatar?: string;
  ensName?: string;
}

export interface TomoChain {
  id: number;
  hasIcon: boolean;
  name?: string;
  iconUrl?: string;
  iconBackground?: string;
  unsupported?: boolean
}

export interface LicenseTermsMetadata {
    blockNumber: string;
    blockTime: string;
    name?: string;
    description?: string;
    id: string;
    licenseTemplate: string;
    licenseTerms: {
        trait_type: string;
        value: string;
    }[],
    terms: {
        commercialAttribution: boolean,
        commercialRevCeiling: number,
        commercialRevShare: number,
        commercialUse: boolean,
        commercializerChecker: string;
        commercializerCheckerData: string;
        currency: string;
        defaultMintingFee: number,
        derivativeRevCeiling: number,
        derivativesAllowed: boolean,
        derivativesApproval: boolean,
        derivativesAttribution: boolean,
        derivativesReciprocal: boolean,
        expiration: number,
        royaltyPolicy: string;
        transferable: boolean,
        uri: string;
    }
}

export function handleError(error: Error) {
    console.error("Error:", error);
    toast.error(`Error: ${error.message}`);
}

export function handleSuccess(message: string) {
    console.log("Success:", message);
    toast.success(message);
}