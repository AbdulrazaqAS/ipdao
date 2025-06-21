import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { getAssetsMetadata, fetchMetadata, getAssetChildren } from "../scripts/getters";
import { AeniedProtocolExplorer, MainnetProtocolExplorer, type AssetMetadata } from "../utils/utils";
import type { AssetInitialMetadata } from "./AssetsPage";

export default function AssetDerivatives({ assetId }: { assetId: `0x${string}` }) {
    const [derivatives, setDerivatives] = useState<AssetMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [explorerUrl, setExplorerUrl] = useState("");
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

    useEffect(() => {
        let chainName: "aeneid" | "mainnet";
        if (publicClient?.chain.id === 1315) chainName = "aeneid";
        else if (publicClient?.chain.id === 1514) chainName = "mainnet";
        else {
            throw new Error("Unsupported chain ID. Please switch to Story - Aeneid or Mainnet.");
        }

        const protocolExplorer = chainName === "mainnet" ? MainnetProtocolExplorer : AeniedProtocolExplorer;
        const ipBaseUrl = `${protocolExplorer}/ipa/`;
        setExplorerUrl(ipBaseUrl);
    }, [publicClient]);

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            {derivatives.length === 0 && (
                <p className="">Asset has no derivatives.</p>
            )}
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {derivatives.map((asset) => (
                    <div key={asset.id} className="">
                        <a href={`${explorerUrl}${asset.id}`} className="items-center">
                            <img className="object-cover rounded-lg" src={asset.image} alt="derivative image" />
                            <p className="text-md">{asset.title.slice(0, 50)}...</p>
                        </a>
                    </div>
                ))}
            </ul>
        </div>
    );
}