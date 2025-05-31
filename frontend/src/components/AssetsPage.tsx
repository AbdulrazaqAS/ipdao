import { useEffect, useState } from "react";
import { getAssetsIds, getAssetsMetadata } from "../scripts/asset";
import { usePublicClient } from "wagmi";
import { type AssetMetadata, type NFTMetadata } from '../utils/utils';

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

async function fetchMetadata(url: string): Promise<any> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${url}`);
        }
        return response.json();
    } catch (error) {
        console.error("Error fetching asset metadata:", error);
        return null;
    }
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<AssetMetadata[]>([]);

    const publicClient = usePublicClient();

    useEffect(() => {
        async function fetchAssets() {
            try {
                const assetIds = await getAssetsIds(publicClient!);
                const assetsCoreMetadata = await getAssetsMetadata(assetIds, publicClient!);
                console.log("Assets Matadata:", assetsCoreMetadata);

                const assetsData = await Promise.all(
                    assetsCoreMetadata.map((data) => fetchMetadata(data.metadataURI))
                ) as AssetInitialMetadata[];

                const nftsData = await Promise.all(
                    assetsCoreMetadata.map((data) => fetchMetadata(data.nftTokenURI))
                ) as NFTMetadata[];

                const assets: AssetMetadata[] = assetsData.map((data, i) => {
                    return {
                        ...data,
                        nftMetadata: nftsData[i],
                        registrationDate: assetsCoreMetadata[i].registrationDate,
                        owner: assetsCoreMetadata[i].owner,
                    }
                });

                setAssets(assets);

                // console.log("Assets Data:", assetsData);
                // console.log("NFTs Data:", nftsData);
                console.log("Assets", assets);
            } catch (error) {
                console.error("Error fetching assets:", error);
            }
        }

        fetchAssets();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-text text-2xl font-bold">Assets</h1>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                    Add Asset
                </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => (
                    <div
                        key={asset.title}
                        className="bg-white shadow-md rounded-xl overflow-hidden hover:shadow-secondary transition"
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
        </div>
    );
}
