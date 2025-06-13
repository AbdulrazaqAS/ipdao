import { useEffect, useState } from "react";
import { fetchMetadata, getAssetsIds, getAssetsMetadata, getProposalThreshold, getUserVotingPower } from "../scripts/getters";
import { usePublicClient, useWalletClient } from "wagmi";
import { type AssetMetadata, type CreatorMetadata } from '../utils/utils';
import AssetPage from './AssetPage';
import NewAssetForm from './NewAssetForm';

export interface AssetInitialMetadata {
    createdAt: string;
    creators: CreatorMetadata[];
    description: string;
    image: string;
    imageHash: string;
    mediaHash: string;
    mediaType: string;
    mediaUrl: string;
    title: string;
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<AssetMetadata[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<AssetMetadata>();
    const [showNewAssetForm, setShowNewAssetForm] = useState(false);
    const [isLoadingAssets, setIsLoadingAssets] = useState(true);
    const [userVotingPower, setUserVotingPower] = useState(0n);
    const [proposalThreshold, setProposalThreshold] = useState(0n);

    const publicClient = usePublicClient();
    const {data: walletClient} = useWalletClient();

    useEffect(() => {
        async function fetchAssets() {
            try {
                const assetIds = await getAssetsIds(publicClient!);
                const assetsCoreMetadata = await getAssetsMetadata(assetIds, publicClient!);

                const assetsData = await Promise.all(
                    assetsCoreMetadata.map((data) => fetchMetadata(data.metadataURI))
                ) as AssetInitialMetadata[];

                const assets: AssetMetadata[] = assetsData.map((data, i) => {
                    return {
                        ...data,
                        id: assetIds[i],
                        registrationDate: assetsCoreMetadata[i].registrationDate,
                        owner: assetsCoreMetadata[i].owner,
                        nftTokenURI: assetsCoreMetadata[i].nftTokenURI,
                    }
                });

                setAssets(assets);
            } catch (error) {
                console.error("Error fetching assets:", error);
            } finally {
                setIsLoadingAssets(false);
            }
        }

        fetchAssets();
        getProposalThreshold(publicClient!).then(setProposalThreshold).catch(console.error);
    }, []);

    useEffect(() => {
        if (!walletClient) return;
        getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
    }, [walletClient]);

    return (
        <div className="mx-auto px-4 py-8">
            {!selectedAsset && !showNewAssetForm && (
                <>
                    {userVotingPower >= proposalThreshold && (
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-text text-2xl font-bold">Assets</h1>
                            <button
                                onClick={() => setShowNewAssetForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                            >
                                Add Asset
                            </button>
                        </div>
                    )}

                    {assets.length > 0 ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {assets.map((asset) => (
                                <div
                                    key={asset.title}
                                    className="bg-white shadow-md rounded-xl overflow-hidden hover:cursor-pointer"
                                    onClick={() => setSelectedAsset(asset)}
                                >
                                    <img
                                        src={asset.image}
                                        alt={asset.title}
                                        className="w-full h-48 object-cover"
                                    />
                                    <div className="p-4">
                                        <h2 className="text-lg font-semibold">{asset.title}</h2>
                                        <p className="text-gray-600 text-sm mt-1">{asset.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : isLoadingAssets ? (
                        <div className="text-center text-muted">
                            <p>Loading assets...</p>
                        </div>
                    ) : (
                        <div className="text-center text-muted">
                            <p>No assets found. Please add a new asset.</p>
                        </div>
                    )}
                </>
            )}
            {selectedAsset && <AssetPage assetMetadata={selectedAsset} setSelectedAsset={setSelectedAsset} />}
            {showNewAssetForm && <NewAssetForm setShowNewAssetForm={setShowNewAssetForm} />}
        </div>
    );
}
