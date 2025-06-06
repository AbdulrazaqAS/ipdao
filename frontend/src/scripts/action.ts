import { type Address, type PublicClient, type WalletClient, getContract, zeroAddress } from 'viem'
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json'
import VotesERC20TokenABI from '../assets/abis/VotesERC20TokenABI.json'
import VotesERC721TokenABI from '../assets/abis/VotesERC721TokenABI.json'
import type { ProposalArgs, VoteChoice } from '../utils/utils';
import { type LicenseTerms, StoryClient } from "@story-protocol/core-sdk";
import axios from "axios";

const IPAGovernorAddress: Address = import.meta.env.VITE_IPA_GOVERNOR!;
const GovernanceTokenAddress: Address = import.meta.env.VITE_GOVERNANCE_TOKEN!;
const NFTContractAddress: Address = import.meta.env.VITE_NFT_CONTRACT_ADDRESS!;

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
        : "/api/uploadToIPFS";

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
    const formData = new FormData();
    formData.set("data", data);
    formData.set("filename", filename);

    const isDev = import.meta.env.DEV; // true in dev, false in build

    const endpoint = isDev
        ? "http://localhost:5000/api/uploadJSONToIPFS"
        : "/api/uploadToIPFS";

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

// export async function mintNFT(to: Address, uri: string, publicClient: PublicClient, walletClient: WalletClient): Promise<bigint | undefined> {
//     const { request } = await publicClient.simulateContract({
//         address: NFTContractAddress,
//         functionName: 'safeMint',
//         args: [to, uri],
//         abi: VotesERC721TokenABI,
//         account: walletClient.account
//     });

//     const hash = await walletClient.writeContract({ ...request, account: walletClient.account! })
//     const { logs } = await publicClient.waitForTransactionReceipt({
//         hash,
//     })
//     if (logs[0].topics[3]) {
//         return BigInt(parseInt(logs[0].topics[3], 16));
//     }
// }

// export async function registerAsset(
//     tokenId: bigint,
//     ipMetadataURI: string,
//     ipMetadataHash: `0x${string}`,
//     nftMetadataURI: string,
//     nftMetadataHash: `0x${string}`,
//     storyClient: StoryClient,
// ): Promise<{ txHash: `0x${string}`, ipId: `0x${string}` }> {
//     const response = await storyClient.ipAsset.registerIpAndAttachPilTerms({
//         nftContract: NFTContractAddress,
//         tokenId: tokenId,
//         licenseTermsData: [
//             {
//                 terms: getNonCommercialTerms()
//             }
//         ],
//         ipMetadata: {
//             ipMetadataURI,
//             ipMetadataHash,
//             nftMetadataURI,
//             nftMetadataHash,
//         },
//         txOptions: { waitForTransaction: true },
//     })

//     if (!response.txHash || !response.ipId) {
//         throw new Error("Failed to register asset");
//     }

//     return { txHash: response.txHash, ipId: response.ipId};
// }

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