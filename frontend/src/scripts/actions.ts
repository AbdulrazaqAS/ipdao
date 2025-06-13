import { type Address, type PublicClient, type WalletClient, getContract } from 'viem'
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json'
import VotesERC20TokenABI from '../assets/abis/VotesERC20TokenABI.json'
import VotesERC721TokenABI from '../assets/abis/VotesERC721TokenABI.json'
import QuizManagerABI from '../assets/abis/QuizManagerABI.json';
import type { ProposalArgs, VoteChoice } from '../utils/utils';
import { type LicenseTerms, StoryClient } from "@story-protocol/core-sdk";
import axios from "axios";

const IPAGovernorAddress: Address = import.meta.env.VITE_IPA_GOVERNOR!;
const GovernanceTokenAddress: Address = import.meta.env.VITE_GOVERNANCE_TOKEN!;
const QuizManagerAddress: Address = import.meta.env.VITE_QUIZ_MANAGER!;

// Note: Some of these functions are from Story's Typescript repo (Protecting IP :)

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

    const txHash = await contract.write.execute([proposalId]);  // TODO: Pass value if needed
    return txHash;
}

export async function cancelProposal(proposalId: bigint, client: WalletClient): Promise<`0x${string}`> {
    const contract = getContract({
        address: IPAGovernorAddress,
        abi: IPAGovernorABI,
        client
    });

    const txHash = await contract.write.cancel([proposalId]);
    return txHash;
}

export async function registerLicenseTerms(licenseTerms: LicenseTerms, client: StoryClient): Promise<bigint> {
    const response = await client.license.registerPILTerms({
        ...licenseTerms,
        txOptions: { waitForTransaction: true },
    });

    console.log("Response", response);

    if (!response.licenseTermsId) {
        throw new Error("Failed to register license terms");
    }

    return response.licenseTermsId;
}

export async function uploadFileToIPFS(file: File, filename: string): Promise<string | undefined> {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("filename", filename);

    const isDev = import.meta.env.DEV; // true in dev, false in build

    const endpoint = isDev
        ? "http://localhost:5000/api/uploadFileToIPFS"
        : "/api/uploadFileToIPFS";

    const response = await axios.post(endpoint, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    const result = response.data;

    if (response.statusText === "OK" || response.status === 200) {
        return result.cid;
    } else {
        throw new Error(result.error || "Unknown error");
    }
};

export async function uploadJsonToIPFS(data: any, filename: string): Promise<string | undefined> {
    let dataStr: string;

    if (data instanceof Object) dataStr = JSON.stringify(data, (_, value) => typeof value === 'bigint' ? value.toString() : value);
    else dataStr = data.toString();

    const formData = new FormData();
    formData.set("data", dataStr);
    formData.set("filename", filename);

    const isDev = import.meta.env.DEV; // true in dev, false in build

    const endpoint = isDev
        ? "http://localhost:5000/api/uploadJSONToIPFS"
        : "/api/uploadJSONToIPFS";

    const response = await axios.post(endpoint, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    const result = response.data;

    if (response.statusText === "OK" || response.status === 200) {
        return result.cid;
    } else {
        throw new Error(result.error || "Unknown error");
    }
};

export async function sendScoreToServer(chainId: number, userAddress: string, quizId: number, userAnswers: any): Promise<{score: number, txHash: string} | undefined> {
    let dataStr: string;

    if (userAnswers instanceof Object) dataStr = JSON.stringify(userAnswers, (_, value) => typeof value === 'bigint' ? value.toString() : value);
    else dataStr = userAnswers.toString();

    const formData = new FormData();
    // , userAddress, quizId, userAnswers
    formData.set("chainId", chainId.toString());
    formData.set("userAddress", userAddress);
    formData.set("quizId", quizId.toString());
    formData.set("userAnswers", dataStr);

    const isDev = import.meta.env.DEV; // true in dev, false in build

    const endpoint = isDev
        ? "http://localhost:5000/api/submitQuiz"
        : "/api/submitQuiz";

    const response = await axios.post(endpoint, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    const result = response.data;

    if (response.statusText === "OK" || response.status === 200) {
        return {score: result.score, txHash: result.txHash};
    } else {
        throw new Error(result.error || "Unknown error");
    }
};

export async function encryptAnswersOnserver(answers: string[]): Promise<{encryptedAnswers: string}> {
    let dataStr = JSON.stringify(answers);

    const formData = new FormData();
    formData.set("answers", dataStr);

    const isDev = import.meta.env.DEV; // true in dev, false in build

    const endpoint = isDev
        ? "http://localhost:5000/api/encryptQuizAnswers"
        : "/api/encryptQuizAnswers";

    const response = await axios.post(endpoint, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    const result = response.data;

    if (response.statusText === "OK" || response.status === 200) {
        return {encryptedAnswers: result.encryptedAnswers};
    } else {
        throw new Error(result.error || "Unknown error");
    }
};

export const createFileHash = async (file: File): Promise<`0x${string}`> => {
    // Read file as an ArrayBuffer using FileReader
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

    // Use SubtleCrypto for SHA-256 hashing in the browser
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hashHex}`;
}

export const createMetadataHash = async (data: any): Promise<`0x${string}`> => {
    // Use SubtleCrypto for SHA-256 hashing in the browser
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const arrayBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hashHex}`;
}

export async function getNFTUri(collectionAddress: Address, tokenId: bigint, client: PublicClient): Promise<string> {
    const contract = getContract({
        address: collectionAddress,
        abi: VotesERC721TokenABI,
        client
    });

    const uri = await contract.read.tokenURI([tokenId]);
    return uri as string;
}

export async function claimQuizReward(quizId: bigint, client: WalletClient): Promise<`0x${string}`> {
    const contract = getContract({
        address: QuizManagerAddress,
        abi: QuizManagerABI,
        client
    });

    const txHash = await contract.write.claimPrize([quizId]);
    return txHash;
}

export async function claimIPRevenue(storyClient: StoryClient, claimer: Address, ipId: Address, tokens: Address[]): Promise<{amount: bigint, claimer: Address, token: Address}[]> {
    const response = await storyClient.royalty.claimAllRevenue({
        ancestorIpId: ipId,
        claimer: claimer,
        childIpIds: [],
        royaltyPolicies: [],
        currencyTokens: tokens,
    })
    
    return response.claimedTokens as unknown as {amount: bigint, claimer: Address, token: Address}[];
}

export async function claimIPPredecessorsRevenue(storyClient: StoryClient, claimer: Address, ipId: Address, childIpIds: Address[], royaltyPolicies: Address[], tokens: Address[]): Promise<bigint[] | undefined> {
    const response = await storyClient.royalty.claimAllRevenue({
        ancestorIpId: ipId,
        claimer: claimer,
        childIpIds: childIpIds,
        royaltyPolicies: royaltyPolicies,
        currencyTokens: tokens,
    })
    
    console.log("Claimed tokens:", response.claimedTokens);
    return response.claimedTokens as unknown as bigint[];
}
