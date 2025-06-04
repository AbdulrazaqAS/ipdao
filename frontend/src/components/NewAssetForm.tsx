import { useState, type FormEvent } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { uploadFileToIPFS, uploadJsonToIPFS, mintNFT } from '../scripts/action';
import {type Address} from 'viem';
import {useWalletClient, usePublicClient} from 'wagmi';

const IPA_MANAGER_ADDRESS: Address = import.meta.env.VITE_IPA_MANAGER;

const inputsClass = "w-full px-4 py-2 rounded-lg bg-background border border-muted placeholder-muted";
type AssetCreationProcess = "fromScratch" | "fromNFT" | "fromAsset";

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

// TODO: Make sure not all visotors can upload to your Pinata

export default function NewAssetForm({setShowNewAssetForm}: Props) {
    const [assetId, setAssetId] = useState('');
    const [haveIPAsset, setHaveIPAsset] = useState(false);
    const [processType, setProcessType] = useState<AssetCreationProcess>("fromScratch");
    const [nftId, setNftId] = useState<bigint>();
    const [nftAttributes, setNftAttributes] = useState<NFTAttribute[]>([]);
    const [nftImage, setNftImage] = useState<File>();
    const [ipaImage, setIpImage] = useState<File>();

    const [ipFields, setIpFields] = useState({
        title: '',
        description: '',
        createdAt: '',
        image: '',
        imageHash: '',
        mediaUrl: '',
        mediaHash: '',
        mediaType: '',
    })

    const [ipCreators, setIpCreators] = useState<IPCreator[]>([
        {address: "", contributionPercent: "", name: ""}
    ])

    const [nftFields, setNftFields] = useState({
        name: '',
        description: '',
        collectionAddress: '',
        tokenId: '',
    })

    const publicClient = usePublicClient();
    const {data: walletClient} = useWalletClient();

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
        setIpCreators((prev) => [...prev, {address: "", contributionPercent: "", name: ""}])
    }

    const removeIpCreator = (index: number) => {
        const updatedCreators = ipCreators.filter((_, i) => i !== index);
        if (updatedCreators.length === 0) return;
        setIpCreators(updatedCreators);
    }

    const addNftAttribute = () => {
        setNftAttributes((prev) => [...prev, {key: "", value: ""}])
    }

    const removeNftAttribute = (index: number) => {
        const updated = nftAttributes.filter((_, i) => i !== index);
        setNftAttributes(updated);
    }

    const getNftAttributes = () => {
        const attrs = nftAttributes.map((attr) => {
            const key = attr.key.trim();
            const value = attr.value.trim();

            if (!key || !value) return; // if no key or value, return undefined
            return {key, value}
        })

        return attrs.filter((attr) => attr !== undefined); // filter undefined from above
    }

    const getNftMetadata = (imageUri: string) => {
        const name = nftFields.name.trim();
        const description = nftFields.description.trim();

        if (!name || !description) {
            throw new Error("Invalid NFT metadata");
        }

        const attrs = getNftAttributes();

        return {name, description, image: imageUri, attributes: attrs};

    }

    async function handleUploadImage() {
        if (!nftImage) {
            console.error("No image selected for upload");
            return;
        }

        try {
            const cid = await uploadFileToIPFS(nftImage, nftImage.name);
            return cid;
        } catch (error) {
            console.error("Error uploading image:", error);
        }
    }

    async function handleUploadMetadata(metadata: any, filename: string) {
        try {
            const data = JSON.stringify(metadata);
            const cid = await uploadJsonToIPFS(data, filename);
            return cid;
        } catch (error) {
            console.error("Error uploading metadata:", error);
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (!walletClient) {
            console.error("Wallet not connected");
            return;
        }

        try {
            const cid = await handleUploadImage();
            const imageUri = `https://ipfs.io/ipfs/${cid}`;
            console.log("Image uplaoded:", imageUri);

            const metadata = getNftMetadata(imageUri);
            const metadataFilename = metadata.name + "NftMetadata.json"
            console.log({...metadata, metadataFilename});
            const metadataUri = await handleUploadMetadata(metadata, metadataFilename);
            console.log("Metadata uploaded:", `https://ipfs.io/ipfs/${metadataUri}`);

            const tokenId = await mintNFT(IPA_MANAGER_ADDRESS, metadataUri, publicClient, walletClient);
        } catch (error) {
            console.error("Error uploading nft metadata:", error);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-surface text-text max-w-3xl mx-auto p-6 rounded-2xl shadow-lg space-y-6">
            <label onClick={() => setShowNewAssetForm(false)}><ChevronLeft size={30} className="inline" /> Back</label>
            <h2 className="text-xl font-bold text-primary">Register New Asset</h2>

            {/* NFT Section */}
            <div className="flex flex-col bg-background rounded-lg p-4">
                <h3 className="font-semibold pb-4">Select Asset Registration Process</h3>
                <label><input type="radio" onChange={() => setProcessType("fromScratch")} checked={processType === "fromScratch"} /> Mint a new NFT and create asset with it</label>
                <label><input type="radio" onChange={() => setProcessType("fromNFT")} checked={processType === "fromNFT"} /> Already have an NFT to use for the new asset</label>
                <label><input type="radio" onChange={() => setProcessType("fromAsset")} checked={processType === "fromAsset"} /> Already have a Story registered asset</label>
            </div>

            {processType === "fromNFT" && (
                <div className="bg-background rounded-lg p-4">
                    <h3 className="font-semibold">NFT Details</h3>
                    <p className="text-sm text-muted mt-2">Make sure the NFT is owned by the IPAManager. Transfer it if not.</p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="NFT Collection Address" value={nftFields.collectionAddress} onChange={(e) => setNftFields({ ...nftFields, collectionAddress: e.target.value })} className={inputsClass} />
                        <input type="text" placeholder="NFT ID" value={nftFields.tokenId} onChange={(e) => setNftFields({ ...nftFields, tokenId: e.target.value })} className={inputsClass} />
                    </div>
                </div>
            )}

            {processType === "fromScratch" && (
                <div className="bg-background rounded-lg p-4">
                    <div
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <h3 className="font-semibold">NFT Metadata</h3>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex flex-col md:flex-row space-x-2 ">
                            <input type="text" placeholder="NFT Name" value={nftFields.name} onChange={(e) => setNftFields({ ...nftFields, name: e.target.value })} className={inputsClass} required />
                            <input type="file" accept="image/*" onChange={(e) => setNftImage(e.target.files![0])} className={inputsClass} required />
                        </div>
                        <textarea placeholder="NFT Description" rows={3} value={nftFields.description} onChange={(e) => setNftFields({ ...nftFields, description: e.target.value })} className={inputsClass} required />
                        
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
            {/* If fromNFT or fromScratch, show this section but only if nftId is detected */}
            {(processType === "fromNFT" || processType === "fromScratch") && nftId != undefined && (
                <div className="bg-background rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold">IP Metadata</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Title" value={ipFields.title} onChange={(e) => setIpFields({ ...ipFields, title: e.target.value })} className={inputsClass} />
                        <input type="text" placeholder="Description" value={ipFields.description} onChange={(e) => setIpFields({ ...ipFields, description: e.target.value })} className={inputsClass} />
                        <input type="text" placeholder="Created At" value={ipFields.createdAt} onChange={(e) => setIpFields({ ...ipFields, createdAt: e.target.value })} className={inputsClass} />
                        <input type="text" placeholder="Image URL" value={ipFields.image} onChange={(e) => setIpFields({ ...ipFields, image: e.target.value })} className={inputsClass} />
                        <input type="text" placeholder="Image Hash" value={ipFields.imageHash} onChange={(e) => setIpFields({ ...ipFields, imageHash: e.target.value })} className={inputsClass} />
                        <input type="text" placeholder="Media URL" value={ipFields.mediaUrl} onChange={(e) => setIpFields({ ...ipFields, mediaUrl: e.target.value })} className={inputsClass} />
                        <input type="text" placeholder="Media Hash" value={ipFields.mediaHash} onChange={(e) => setIpFields({ ...ipFields, mediaHash: e.target.value })} className={inputsClass} />
                        <input type="text" placeholder="Media Type" value={ipFields.mediaType} onChange={(e) => setIpFields({ ...ipFields, mediaType: e.target.value })} className={inputsClass} />
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
                            onClick={addIpCreator}
                            className="bg-primary text-background font-semibold py-1 px-3 rounded-lg hover:opacity-80 transition"
                        >
                            Add Creator
                        </button>
                    </div>
                </div>
            )}

            {/* Image Preview */}
            {/*{previewImage && (
                <div className="mt-4">
                    <p className="text-muted mb-2">Preview Image:</p>
                    <img src={previewImage} alt="Preview" className="rounded-lg w-full max-w-md object-contain border border-muted" />
                </div>
            )}*/}

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

            {(processType === "fromNFT" || processType === "fromScratch") && nftId === undefined && (
                <p className="text-md text-muted">
                    Next Step:{" "}
                    {(processType === "fromNFT" || processType === "fromScratch") && nftId === undefined && "Create Asset"}
                </p>
            )}

            <button
                type="submit"
                className="bg-primary text-background font-semibold py-2 px-6 rounded-lg w-full hover:opacity-80 transition"
            >
                {processType === "fromScratch" && nftId === undefined && "Mint NFT"}
                {processType === "fromNFT" && nftId === undefined && "Get NFT"}
                {(processType === "fromNFT" || processType === "fromScratch") && nftId !== undefined && "Create Asset"}
                {processType === "fromAsset" && "Create Asset"}
            </button>
        </form>
    )
}
