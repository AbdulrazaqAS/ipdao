import { type Address, type WalletClient, getContract } from 'viem'
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
    try {
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
    } catch (error) {
        console.error("Error uploading to IPFS:", error);
    }
};

export async function uploadJsonToIPFS(data: any, filename: string): Promise<string | undefined> {
    try {
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
    } catch (error) {
        console.error("Error uploading to IPFS:", error);
    }
};

export async function mintNFT(to: Address, uri: string, publicClient: PublicClient, walletClient: WalletClient): Promise<number | undefined> {
    const { request } = await publicClient.simulateContract({
        address: NFTContractAddress,
        functionName: 'safeMint',
        args: [to, uri],
        abi: VotesERC721TokenABI,
        account: walletClient.account
    });
    
    const hash = await walletClient.writeContract({ ...request, account: walletClient.account })
    const { logs } = await publicClient.waitForTransactionReceipt({
        hash,
    })
    if (logs[0].topics[3]) {
        return parseInt(logs[0].topics[3], 16)
    }
}
