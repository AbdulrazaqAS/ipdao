import { parseEther, zeroAddress, type Address } from "viem";
import { type LicenseTerms } from "@story-protocol/core-sdk";
import { toast } from "sonner";

export const AeniedProtocolExplorer = 'https://aeneid.explorer.story.foundation';
export const MainnetProtocolExplorer = 'https://explorer.story.foundation';
export const MinParticipationThreshold = 25n * 1000000000000000000n; // 10 Governance Tokens

export enum NavItems {
    Dashboard = "Dashboard",
    Airdrops = "Airdrops",
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
    winners: bigint;
    deadline: bigint;
    prizeAmount: bigint;
    metadataURI: string;
}

export interface QuizQuestion {
    question: string;
    answer: string;
    options: string[];
}

export interface QuizMetadata {
    quizId: number;
    title: string;
    questions: QuizQuestion[];
    questionsPerUser: number;
    maxTrials: number;
    minScore: number;
    deadline: string;
    prizeAmount: bigint;
}

export interface LicenseTermsMetadata {
    blockNumber: string;
    blockTime: string;
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


export function getNonCommercialTerms(): LicenseTerms {
    return {
        transferable: true,
        royaltyPolicy: zeroAddress,
        defaultMintingFee: 0n,
        expiration: 0n,
        commercialUse: false,
        commercialAttribution: false,
        commercializerChecker: zeroAddress,
        commercializerCheckerData: "0x",
        commercialRevShare: 0,
        commercialRevCeiling: 0n,
        derivativesAllowed: true,
        derivativesAttribution: true,
        derivativesApproval: false,
        derivativesReciprocal: true,
        derivativeRevCeiling: 0n,
        currency: zeroAddress,
        uri: "https://github.com/piplabs/pil-document/blob/998c13e6ee1d04eb817aefd1fe16dfe8be3cd7a2/off-chain-terms/NCSR.json",
    }
}

export function getCommercialUseTerms(royaltyPolicy: Address, defaultMintingFee: string, currency: Address): LicenseTerms {
    return {
        transferable: true,
        royaltyPolicy,
        defaultMintingFee: parseEther(defaultMintingFee),
        expiration: 0n,
        commercialUse: true,
        commercialAttribution: true,
        commercializerChecker: zeroAddress,
        commercializerCheckerData: "0x",
        commercialRevShare: 0,
        commercialRevCeiling: 0n,
        derivativesAllowed: false,
        derivativesAttribution: false,
        derivativesApproval: false,
        derivativesReciprocal: false,
        derivativeRevCeiling: 0n,
        currency,
        uri: "https://github.com/piplabs/pil-document/blob/9a1f803fcf8101a8a78f1dcc929e6014e144ab56/off-chain-terms/CommercialUse.json",
    }
};

export function getCommercialRemixTerms(royaltyPolicy: Address, defaultMintingFee: number, commercialRevShare: number, currency: Address): LicenseTerms {
    return {
        transferable: true,
        royaltyPolicy,
        defaultMintingFee: parseEther(defaultMintingFee.toString()),
        expiration: 0n,
        commercialUse: true,
        commercialAttribution: true,
        commercializerChecker: zeroAddress,
        commercializerCheckerData: "0x",
        commercialRevShare: Number(commercialRevShare),
        commercialRevCeiling: 0n,
        derivativesAllowed: true,
        derivativesAttribution: true,
        derivativesApproval: false,
        derivativesReciprocal: true,
        derivativeRevCeiling: 0n,
        currency,
        uri: "https://github.com/piplabs/pil-document/blob/ad67bb632a310d2557f8abcccd428e4c9c798db1/off-chain-terms/CommercialRemix.json",
    }
}

export function getCreativeCommonsAttributionTerms(royaltyPolicy: Address, currency: Address): LicenseTerms {
    return {
        transferable: true,
        royaltyPolicy,
        defaultMintingFee: 0n,
        expiration: 0n,
        commercialUse: true,
        commercialAttribution: true,
        commercializerChecker: zeroAddress,
        commercializerCheckerData: "0x",
        commercialRevShare: 0,
        commercialRevCeiling: 0n,
        derivativesAllowed: true,
        derivativesAttribution: true,
        derivativesApproval: false,
        derivativesReciprocal: true,
        derivativeRevCeiling: 0n,
        currency,
        uri: "https://github.com/piplabs/pil-document/blob/998c13e6ee1d04eb817aefd1fe16dfe8be3cd7a2/off-chain-terms/CC-BY.json",
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