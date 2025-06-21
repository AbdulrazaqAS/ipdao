import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { getAssetsMetadata, fetchMetadata, getAssetChildren } from "../scripts/getters";
import type { AssetMetadata } from "../utils/utils";
import type { AssetInitialMetadata } from "./AssetsPage";

export default function AssetDerivatives({ assetId }: { assetId: `0x${string}` }) {
    const [derivatives, setDerivatives] = useState<AssetMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const publicClient = usePublicClient();

    useEffect(() => {
        async function fetchDerivatives() {
            try {
                setIsLoading(true);
                const assetIds = await getAssetChildren(assetId, publicClient!);
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

                setDerivatives(assets);
            } catch (error) {
                console.error("Error fetching derivatives:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchDerivatives();
    }, [assetId, publicClient]);

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            {derivatives.length === 0 && (
                <p className="">Asset has no derivatives.</p>
            )}
            <ul className="space-y-2">
                {derivatives.map((asset) => (
                    <li key={asset.id}>
                        <strong>{asset.title}</strong> - {asset.description}
                    </li>
                ))}
            </ul>
        </div>
    );
}