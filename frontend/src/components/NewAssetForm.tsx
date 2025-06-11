import { useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { uploadFileToIPFS, uploadJsonToIPFS, createFileHash, createMetadataHash, getNFTUri, propose } from '../scripts/action';
import { custom, encodeFunctionData, type Address } from 'viem';
import { useWalletClient, usePublicClient } from 'wagmi';
import { StoryClient, type IpMetadata } from '@story-protocol/core-sdk';
import { AeniedProtocolExplorer, handleError, handleSuccess, MainnetProtocolExplorer, type NFTMetadata, type ProposalArgs } from '../utils/utils';
import IPAManagerABI from '../assets/abis/IPAManagerABI.json'
import { getProposalsCount, getProposalThreshold, getUserVotingPower } from '../scripts/proposal';
import { getDaoRevenueTokens } from '../scripts/asset';

const IPA_MANAGER_ADDRESS: Address = import.meta.env.VITE_IPA_MANAGER;

const inputsClass = "w-full px-4 py-2 rounded-lg bg-background border border-muted placeholder-muted";
type AssetCreationProcess = "fromScratch" | "fromNFT" | "fromAsset";

// const mediaTypes = [
//     {
//         name: "PNG Image",
//         value: "image/png",
//     }
// ]

interface IPCreator {
    address: string;
    contributionPercent: string;
    name: string
}

interface NFTAttribute {
    key: string;
    value: string;
}

interface Props {
    setShowNewAssetForm: Function;
}

export default function NewAssetForm({ setShowNewAssetForm }: Props) {
    const [assetId, setAssetId] = useState('');
    const [processType, setProcessType] = useState<AssetCreationProcess>("fromScratch");
    const [nftAttributes, setNftAttributes] = useState<NFTAttribute[]>([]);
    const [nftImage, setNftImage] = useState<File>();
    const [ipaMedia, setIpaMedia] = useState<File>();
    const [ipaImage, setIpaImage] = useState<File>();
    const [nftMetadata, setNftMetadata] = useState<NFTMetadata>();
    const [nftMetadataUri, setNftMetadataUri] = useState<string>();
    const [ipMetadata, setIpMetadata] = useState<IpMetadata>();
    const [ipMetadataUri, setIpMetadataUri] = useState<string>();
    const [userVotingPower, setUserVotingPower] = useState(0n);
    const [proposalThreshold, setProposalThreshold] = useState(0n);
    const [isLoading, setIsLoading] = useState(false);
    const [daoRoyaltyTokens, setDaoRoyaltyTokens] = useState(0n);

    const [ipFields, setIpFields] = useState({
        title: '',
        description: '',
        createdAt: '',
    })

    const [ipCreators, setIpCreators] = useState<IPCreator[]>([
        { address: "", contributionPercent: "", name: "" }
    ])

    const [nftFields, setNftFields] = useState({
        name: '',
        description: '',
        collectionAddress: '',
        tokenId: '',
    })

    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const updateCreatorData = (index: number, field: keyof IPCreator, value: string) => {
        const creators = [...ipCreators];
        creators[index][field] = value;
        setIpCreators(creators);
    }

    const updateNftAttributeData = (index: number, field: keyof NFTAttribute, value: string) => {
        const attrs = [...nftAttributes];
        attrs[index][field] = value;
        setNftAttributes(attrs);
    }

    const addIpCreator = () => {
        setIpCreators((prev) => [...prev, { address: "", contributionPercent: "", name: "" }])
    }

    const removeIpCreator = (index: number) => {
        const updatedCreators = ipCreators.filter((_, i) => i !== index);
        if (updatedCreators.length === 0) return;
        setIpCreators(updatedCreators);
    }

    const addNftAttribute = () => {
        setNftAttributes((prev) => [...prev, { key: "", value: "" }])
    }

    const removeNftAttribute = (index: number) => {
        const updated = nftAttributes.filter((_, i) => i !== index);
        setNftAttributes(updated);
    }

    const checkTotalContributionPercent = () => {
        const total = ipCreators.reduce((sum, creator) => sum + parseInt(creator.contributionPercent), 0);
        if (total !== 100) {
            throw new Error("Total contribution percent must be 100%");
        }
    }

    const getNftAttributes = () => {
        const attrs = nftAttributes.map((attr) => {
            const key = attr.key.trim();
            const value = attr.value.trim();

            if (!key || !value) return; // if no key or value, return undefined
            return { key, value }
        })

        return attrs.filter((attr) => attr !== undefined); // filter undefined from above
    }

    const getNftMetadata = (imageUri: string): NFTMetadata => {
        const name = nftFields.name.trim();
        const description = nftFields.description.trim();

        if (!name || !description) {
            throw new Error("Invalid NFT metadata");
        }

        const attrs = getNftAttributes();

        return { name, description, image: imageUri, attributes: attrs };

    }

    async function handleUploadFile(file: File, maxSizeMb: number) {
        if (file.size > maxSizeMb * 1024 * 1024) throw new Error(`File size exceeds ${maxSizeMb}MB limit`);

        const cid = await uploadFileToIPFS(file, file.name);
        return cid;
    }

    async function handleUploadMetadata(metadata: any, filename: string) {
        const data = JSON.stringify(metadata);
        const cid = await uploadJsonToIPFS(data, filename);
        return cid;
    }

    async function uploadNFTMetadata() {
        try {
            if (!nftImage) throw new Error("No image selected for upload");

            const imageCid = await handleUploadFile(nftImage, 5);
            if (!imageCid) throw Error("Failed to upload metadata");

            const imageUri = `https://ipfs.io/ipfs/${imageCid}`;
            console.log("Image uplaoded:", imageUri);

            const metadata = getNftMetadata(imageUri);
            const metadataFilename = metadata.name + "NftMetadata.json"
            const metadataCid = await handleUploadMetadata(metadata, metadataFilename);
            if (!metadataCid) throw Error("Failed to upload metadata");

            const metadataUri = `https://ipfs.io/ipfs/${metadataCid}`;
            console.log("Metadata uploaded:", metadataUri);

            setNftMetadata(metadata);
            setNftMetadataUri(metadataUri!);
        } catch (error) {
            console.log("Error uploading NFT metadata:", error);
            handleError(error as Error);
        }
    }

    // async function loadNftMetadata() {
    //     try {
    //         // TODO: Add checks
    //         const collectionAddress = nftFields.collectionAddress.trim();
    //         const tokenId = nftFields.tokenId.trim();
    //         if (!collectionAddress || !tokenId) throw new Error("Collection address and token ID are required");

    //         const tokenCid = await getNFTUri(collectionAddress as Address, BigInt(tokenId), publicClient!);
    //         if (!tokenCid) throw new Error("Failed to get NFT URI");

    //         const tokenUri = `https://ipfs.io/ipfs/${tokenCid}`;
    //         const metadata = await fetch(tokenUri).then(res => res.json());
    //         if (!metadata) throw new Error("Failed to fetch NFT metadata");

    //         setNftMetadata(metadata);
    //         setNftMetadataUri(tokenUri);
    //         console.log("NFT metadata fetched:", metadata);
    //     } catch (error) {
    //         console.error("Error fetching NFT metadata:", error);
    //         handleError(error as Error);
    //     }
    // }

    async function uploadIPAMetadata() {
        try {
            checkTotalContributionPercent();

            if (!ipaMedia) throw new Error("No IP media selected for upload");
            if (!ipaImage) throw new Error("No IP image selected for upload");
            if (ipaMedia.size > 100 * 1024 * 1024) throw new Error("Media size exceeds 100MB limit");
            if (ipaImage.size > 5 * 1024 * 1024) throw new Error("Image size exceeds 5MB limit");

            const mediaCid = await handleUploadFile(ipaMedia, 100);
            if (!mediaCid) throw new Error("Failed to upload IPA media");

            const imageCid = await handleUploadFile(ipaImage, 5);
            if (!imageCid) throw new Error("Failed to upload IPA image");

            const mediaUri = `https://ipfs.io/ipfs/${mediaCid}`;
            const imageUri = `https://ipfs.io/ipfs/${imageCid}`;

            const storyClient = StoryClient.newClient({
                wallet: walletClient!,
                transport: custom(walletClient!.transport),
                chainId: walletClient!.chain.id.toString() as "1315" | "1514",
            })

            const mediaHash = await createFileHash(ipaMedia);
            const imageHash = await createFileHash(ipaImage);

            // TODO: Add checks
            const ipMetadata = storyClient.ipAsset.generateIpMetadata({
                title: ipFields.title.trim(),
                description: ipFields.description.trim(),
                createdAt: new Date(ipFields.createdAt.trim()).getTime().toString(),
                creators: ipCreators.map((creator) => ({
                    name: creator.name.trim(),
                    address: creator.address.trim() as Address,
                    contributionPercent: parseInt(creator.contributionPercent),
                })),
                image: imageUri,
                imageHash: imageHash as `0x${string}`,
                mediaUrl: mediaUri,
                mediaHash: mediaHash as `0x${string}`,
                mediaType: ipaMedia.type,
            });

            const metadataFilename = `${ipFields.title}IpMetadata.json`;
            const metadataCid = await handleUploadMetadata(ipMetadata, metadataFilename);
            if (!metadataCid) throw new Error("Failed to upload IP metadata");

            const metadataUri = `https://ipfs.io/ipfs/${metadataCid}`;
            console.log("IPA media uploaded:", { mediaUri, imageUri, metadataUri });

            setIpMetadata(ipMetadata);
            setIpMetadataUri(metadataUri);
        } catch (error) {
            console.error("Error uploading IP metadata:", error);
            handleError(error as Error);
        }
    }

    async function handleProposeAddNewAssetFromNFT() {
        try {
            const collectionAddress = nftFields.collectionAddress.trim();
            const tokenId = nftFields.tokenId.trim();
            if (!collectionAddress || !tokenId) throw new Error("Collection address and token ID are required");

            const targets = [IPA_MANAGER_ADDRESS];
            const values = [0n];
            const calldatas = [encodeFunctionData({
                abi: IPAManagerABI,
                functionName: "createAssetFromNFT",
                args: [collectionAddress, tokenId]
            })];

            const proposalIndex = await getProposalsCount(publicClient!);

            // Added # for splitting the value when in use
            const description = proposalIndex!.toString() +
                "#Proposal to add a new asset from NFT:\n" +
                `Contract: ${collectionAddress}\n` +
                `Token ID: ${tokenId}`;

            const proposalArgs: ProposalArgs = {
                targets,
                values,
                calldatas,
                description
            };

            const txHash = await propose(proposalArgs, walletClient!);
            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("New asset proposal reverted"));
                else {
                    handleSuccess("Proposal to create new asset submitted successfully!");
                    setShowNewAssetForm(false);
                }
            });
        } catch (error) {
            console.error("Error proposing to add new asset:", error);
            handleError(error as Error);
        }
    }

    async function handleProposeAddRegisteredNewAsset() {
        try {
            const ipId = assetId.trim();
            if (!ipId) throw new Error("Invalid asset id");

            const targets = [IPA_MANAGER_ADDRESS];
            const values = [0n];
            const calldatas = [encodeFunctionData({
                abi: IPAManagerABI,
                functionName: "addAsset",
                args: [ipId]
            })];

            const proposalIndex = await getProposalsCount(publicClient!);

            const network = import.meta.env.VITE_STORY_NETWORK!;
            const protocolExplorer = network === "mainnet" ? MainnetProtocolExplorer : AeniedProtocolExplorer;
            const ipUrl = `View on the explorer: ${protocolExplorer}/ipa/${ipId}`;

            // Added # for splitting the value when in use
            const description = proposalIndex!.toString() +
                "#Proposal to add new registered asset:\n" +
                `IP Url: ${ipUrl}`

            const proposalArgs: ProposalArgs = {
                targets,
                values,
                calldatas,
                description
            };

            console.log("Proposing to create new asset with args:", proposalArgs);
            const txHash = await propose(proposalArgs, walletClient!);

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("New asset proposal reverted"));
                else {
                    handleSuccess("Proposal to create new asset submitted successfully!");
                    setShowNewAssetForm(false);
                }
            });
        } catch (error) {
            console.error("Error proposing to add new asset:", error);
            handleError(error as Error);
        }
    }

    const handleProposeAddNewAsset = async () => {
        try {
            const ipMetadataHash = await createMetadataHash(ipMetadata!);
            const nftMetadataHash = await createMetadataHash(nftMetadata!);

            const targets = [IPA_MANAGER_ADDRESS];
            const values = [0n];
            const calldatas = [encodeFunctionData({
                abi: IPAManagerABI,
                functionName: "createAsset",
                args: [ipMetadataUri, ipMetadataHash, nftMetadataUri, nftMetadataHash]
            })];

            const proposalIndex = await getProposalsCount(publicClient!);
            // Added # for splitting the value when in use
            const description = proposalIndex!.toString() +
                "#Proposal to create new asset with:\n" +
                `IP Metadata: ${ipMetadataUri}\n` +
                `NFT Metadata: ${nftMetadataUri}`;

            const proposalArgs: ProposalArgs = {
                targets,
                values,
                calldatas,
                description
            };

            console.log("Proposing to create new asset with args:", proposalArgs);
            const txHash = await propose(proposalArgs, walletClient!);

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("New asset proposal reverted"));
                else {
                    handleSuccess("Proposal to create new asset submitted successfully!");
                    setShowNewAssetForm(false);
                }
            });
        } catch (error) {
            console.error("Error proposing to add new asset:", error);
            handleError(error as Error);
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (!walletClient) {
            handleError(new Error("Please connect your wallet to create a proposal"));
            return;
        }

        if (userVotingPower < proposalThreshold) {
            handleError(new Error(`No enough voting power to create a proposal`));
            return;
        }

        setIsLoading(true);

        if (processType === "fromAsset") handleProposeAddRegisteredNewAsset();
        else if (processType === "fromNFT") handleProposeAddNewAssetFromNFT();
        else {
            // If !nftMetadataUri for fromScratch when the metadata has not been uploaded.
            if (!nftMetadataUri) await uploadNFTMetadata();

            // After getting required data to upload IP metadata
            else if (nftMetadata && nftMetadataUri && !ipMetadataUri) await uploadIPAMetadata();

            // After getting required data to make proposal
            else if (ipMetadata && ipMetadataUri) await handleProposeAddNewAsset();
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getProposalThreshold(publicClient!).then(setProposalThreshold).catch(console.error);
        getDaoRevenueTokens(publicClient!).then(setDaoRoyaltyTokens).catch(console.error);
    }, []);

    useEffect(() => {
        if (!walletClient) return;
        getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
    }, [walletClient]);

    return (
        <form onSubmit={handleSubmit} className="bg-surface text-text max-w-3xl mx-auto p-6 rounded-2xl shadow-lg space-y-6">
            <label onClick={() => setShowNewAssetForm(false)}><ChevronLeft size={30} className="inline" /> Back</label>
            <h2 className="text-xl font-bold text-primary">Register New Asset</h2>

            {/* Process selection */}
            <div className="flex flex-col bg-background rounded-lg p-4">
                <h3 className="font-semibold pb-4">Select Asset Registration Process</h3>
                <label><input type="radio" onChange={() => setProcessType("fromScratch")} checked={processType === "fromScratch"} /> Mint a new NFT and create asset with it</label>
                <label><input type="radio" onChange={() => setProcessType("fromNFT")} checked={processType === "fromNFT"} /> Already have an NFT to use for the new asset</label>
                <label><input type="radio" onChange={() => setProcessType("fromAsset")} checked={processType === "fromAsset"} /> Already have a Story registered asset</label>
            </div>

            {processType === "fromNFT" && !nftMetadataUri && (
                <div className="bg-background rounded-lg p-4">
                    <h3 className="font-semibold">NFT Details</h3>
                    <p className="text-sm text-muted mt-2">Make sure the NFT is owned by the IPAManager. Transfer it if not.</p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label>NFT Collection Address:<input type="text" placeholder="NFT Collection Address" minLength={42} maxLength={42} value={nftFields.collectionAddress} onChange={(e) => setNftFields({ ...nftFields, collectionAddress: e.target.value })} className={inputsClass} /></label>
                        <label>NFT ID:<input type="text" placeholder="NFT ID" value={nftFields.tokenId} onChange={(e) => setNftFields({ ...nftFields, tokenId: e.target.value })} className={inputsClass} /></label>
                    </div>
                </div>
            )}

            {processType === "fromScratch" && !nftMetadataUri && (
                <div className="bg-background rounded-lg p-4">
                    <div
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <h3 className="font-semibold">NFT Metadata</h3>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex flex-col md:flex-row space-x-2 ">
                            <label>NFT Name:<input type="text" placeholder="NFT Name" value={nftFields.name} onChange={(e) => setNftFields({ ...nftFields, name: e.target.value })} className={inputsClass} required /></label>
                            <label>NFT Image:<input type="file" accept="image/*" onChange={(e) => setNftImage(e.target.files![0])} className={inputsClass} required /></label>
                        </div>
                        <label>NFT Description:<textarea placeholder="NFT Description" rows={3} value={nftFields.description} onChange={(e) => setNftFields({ ...nftFields, description: e.target.value })} className={inputsClass} required /></label>

                        <div>
                            <h3 className="font-semibold">NFT Attributes</h3>
                            <div className="p-2 space-y-1">
                                {nftAttributes.map((attr, index) => (
                                    <div key={index} className="relative flex flex-col gap-2 border border-muted p-2 rounded-lg">
                                        <div className="absolute top-0 right-[-25px]" onClick={() => removeNftAttribute(index)}><X color="red" /></div>
                                        <div className="flex space-x-1">
                                            <input type="text" placeholder="Key" value={attr.key} onChange={(e) => updateNftAttributeData(index, "key", e.target.value)} className={inputsClass} required />
                                            <input type="text" placeholder="Value" value={attr.value} onChange={(e) => updateNftAttributeData(index, "value", e.target.value)} className={inputsClass} required />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addNftAttribute}
                                className="bg-primary text-background font-semibold py-1 px-3 rounded-lg hover:opacity-80 transition"
                            >
                                Add Attribute
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* IP Section */}
            {/* If fromNFT or fromScratch, show this section but only if nftMetadataUri is loaded */}
            {(processType === "fromNFT" || processType === "fromScratch") && nftMetadataUri && (
                <div className="bg-background rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold">IP Metadata</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label>Name:<input type="text" placeholder="Title" value={ipFields.title} onChange={(e) => setIpFields({ ...ipFields, title: e.target.value })} className={inputsClass} required /></label>
                        <label>Created At:<input type="datetime-local" value={ipFields.createdAt} onChange={(e) => setIpFields({ ...ipFields, createdAt: e.target.value })} className={inputsClass} required /></label>
                        <label className="col-span-2">Description:<input type="text" placeholder="Description" value={ipFields.description} onChange={(e) => setIpFields({ ...ipFields, description: e.target.value })} className={inputsClass} required /></label>
                        <label>Image:<input type="file" accept="image/*" onChange={(e) => setIpaImage(e.target.files![0])} className={inputsClass} required /></label>
                        <label>Media:<input
                            type="file"
                            // accept={mediaTypes.map(mt => mt.value).join(',')}
                            accept="*"
                            onChange={(e) => setIpaMedia(e.target.files![0])}
                            className={inputsClass}
                            required
                        /></label>
                    </div>
                    <div>
                        <h3 className="font-semibold">IP Creators</h3>
                        <div className="p-2 space-y-1">
                            {ipCreators.map((creator, index) => (
                                <div key={index} className="relative flex flex-col gap-2 border border-muted p-4 rounded-lg">
                                    <div className="absolute top-0 right-0" onClick={() => removeIpCreator(index)}><X color="red" /></div>
                                    <div className="flex space-x-2">
                                        <input type="text" placeholder="Name" value={creator.name} onChange={(e) => updateCreatorData(index, "name", e.target.value)} className={inputsClass} />
                                        <input type="number" placeholder="Contribution %" value={creator.contributionPercent} onChange={(e) => updateCreatorData(index, "contributionPercent", e.target.value)} className={inputsClass} />
                                    </div>
                                    <input type="text" placeholder="Creator Address" value={creator.address} onChange={(e) => updateCreatorData(index, "address", e.target.value)} className={inputsClass} />
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addIpCreator}
                            className="bg-primary text-background font-semibold py-1 px-3 rounded-lg hover:opacity-80 transition"
                        >
                            Add Creator
                        </button>
                    </div>
                </div>
            )}

            {processType === "fromAsset" && (
                <div className="bg-background rounded-lg p-4">
                    <h3 className="font-semibold">Asset ID</h3>
                    <p className="text-sm text-muted mt-2 pb-3">Make sure the asset's NFT is owned by the IPAManager. Transfer it if not.</p>
                    <input
                        type="text"
                        className="w-full px-4 py-2 rounded-lg bg-background border border-muted placeholder-muted"
                        placeholder="Enter Asset ID"
                        value={assetId}
                        onChange={(e) => setAssetId(e.target.value)}
                    />
                </div>
            )}

            <div className='space-y-2'>
                {(processType === "fromScratch") && !nftMetadataUri && (
                    <p className="text-sm text-muted">
                        Next Step: Create Asset
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-background font-semibold py-2 px-6 rounded-lg w-full hover:opacity-80 transition disabled:cursor-not-allowed"
            >
                {processType === "fromScratch" && !nftMetadataUri && "Upload NFT Metadata"}
                {processType === "fromScratch" && nftMetadataUri && !ipMetadataUri && "Upload Asset Metadata"}
                {processType === "fromScratch" && nftMetadataUri && ipMetadataUri && "Submit Asset Proposal"}
                {(processType === "fromAsset" || processType === "fromNFT") && "Submit Asset Proposal"}
                {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
            </button>
        </form>
    )
}
