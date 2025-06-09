import { type Address, type PublicClient, getContract } from 'viem'
import { type AssetCoreMetadata, type AssetLicenseTerms, type AssetAPIMetadata, type LicenseTermsMetadata } from '../utils/utils';
import { storyAeneid } from 'viem/chains';
import CoreMetadataViewModuleABI from '../assets/abis/CoreMetadataViewModuleABI.json'
import IPA_MANAGER_ABI from '../assets/abis/IPAManagerABI.json'

const CoreMetadataViewModuleAddress: Address = import.meta.env.VITE_CoreMetadataViewModule!;
const IPA_MANAGER_ADDRESS: Address = import.meta.env.VITE_IPA_MANAGER!;

export async function fetchMetadata(url: string): Promise<any> {
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

export async function getAssetsIds(client: PublicClient): Promise<Array<Address>> {
    const contract = getContract({
        address: IPA_MANAGER_ADDRESS,
        abi: IPA_MANAGER_ABI,
        client
    });

    const assets = await contract.read.getAssets();
    return assets as Array<Address>;
}

export async function getAssetLicenseTerms(ipId: Address, chainId: number): Promise<AssetLicenseTerms[]> {
  const options = {
    method: 'GET',
    headers: {
      'X-Api-Key': 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U',
      'X-Chain': chainId === storyAeneid.id ? "story-aeneid" : 'story'
    }
  };

  const response = await fetch(`https://api.storyapis.com/api/v3/licenses/ip/terms/${ipId.toString()}`, options)
  if (!response.ok) throw new Error(`Response status: ${response.status}`);

  const terms = await response.json();  // {data, next, prev}
  return terms.data as AssetLicenseTerms[];
}

export async function getAssetAPIMetadata(ipId: Address, chainId: number): Promise<AssetAPIMetadata> {
  const options = {
    method: 'GET',
    headers: {
      'X-Api-Key': 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U',
      'X-Chain': chainId === storyAeneid.id ? "story-aeneid" : 'story'
    }
  };

  const response = await fetch(`https://api.storyapis.com/api/v3/assets/${ipId.toString()}`, options);
  if (!response.ok) throw new Error(`Response status: ${response.status}`);

  const terms = await response.json();  // {data, next, prev}
  return terms.data as AssetAPIMetadata;
}

export async function getLicenseTerms(licenseTermId: number, chainId: number): Promise<LicenseTermsMetadata> {
  const options = {
    method: 'GET',
    headers: {
      'X-Api-Key': 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U',
      'X-Chain': chainId === storyAeneid.id ? "story-aeneid" : 'story'
    }
  };

  const response = await fetch(`https://api.storyapis.com/api/v3/licenses/terms/${licenseTermId}`, options)
  if (!response.ok) throw new Error(`Response status: ${response.status}`);

  const terms = await response.json();  // {data, next, prev}
  
  return terms.data as LicenseTermsMetadata;
}