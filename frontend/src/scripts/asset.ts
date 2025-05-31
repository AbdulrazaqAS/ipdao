import { type Address, type PublicClient, getContract } from 'viem'
import { type AssetCoreMetadata } from '../utils/utils';
import CoreMetadataViewModuleABI from '../assets/abis/CoreMetadataViewModuleABI.json'
import IPA_MANAGER_ABI from '../assets/abis/IPAManagerABI.json'

const CoreMetadataViewModuleAddress: Address = import.meta.env.VITE_CoreMetadataViewModule!;
const IPA_MANAGER_ADDRESS: Address = import.meta.env.VITE_IPA_MANAGER!;

export async function getAssetMetadata(ipId: Address, client: PublicClient): Promise<AssetCoreMetadata> {
    const contract = getContract({
        address: CoreMetadataViewModuleAddress,
        abi: CoreMetadataViewModuleABI,
        client
    });

    const metadata = await contract.read.getCoreMetadata([ipId]);
    return metadata as AssetCoreMetadata;
}

export async function getAssetsMetadata(ipIds: Address[], client: PublicClient): Promise<Array<AssetCoreMetadata>> {
    const contract = getContract({
        address: CoreMetadataViewModuleAddress,
        abi: CoreMetadataViewModuleABI,
        client
    });

    const metadatas = await Promise.all(
        ipIds.map((ipId) => contract.read.getCoreMetadata([ipId]))
    );

    return metadatas as AssetCoreMetadata[];
}

export async function getAssetsIds(client: PublicClient): Promise<[]> {
    const contract = getContract({
        address: IPA_MANAGER_ADDRESS,
        abi: IPA_MANAGER_ABI,
        client
    });

    const assets = await contract.read.getAssets();
    return assets as [];
}