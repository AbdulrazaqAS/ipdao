import { PinataSDK } from 'pinata-web3'
import fs from 'fs'
import path from 'path'

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
})

async function uploadJSONToIPFS(jsonMetadata: any): Promise<string> {
    const { IpfsHash } = await pinata.upload.json(jsonMetadata)
    return IpfsHash
}

async function uploadImageToIPFS(filePath: string, fileName: string): Promise<string> {
    const fullPath = path.join(process.cwd(), filePath)
    const blob = new Blob([fs.readFileSync(fullPath)])
    const file = new File([blob], fileName, { type: "image/png" })
    const { IpfsHash } = await pinata.upload.file(file)
    return IpfsHash
}

export default async function uploadNFTMetadataToIPFS() {
    const nftImagePath = "assets/lensjobs-full-512x512.png";
    const nftImageName = "lensjobs-full-512x512.png";
    
    const nftImageCID = await uploadImageToIPFS(nftImagePath, nftImageName!);
    const nftImageUri = `https://ipfs.io/ipfs/${nftImageCID}`;
    
    console.log({nftImagePath, nftImageName, nftImageUri});

    // Set up your NFT Metadata
    //
    // Docs: https://docs.opensea.io/docs/metadata-standards#metadata-structure
    const nftMetadata = {
        name: 'Lens Jobs Logo',
        description: 'This is a ChatGPT generated logo for Lens Jobs app on Lens Protocol. This NFT represents ownership of the IP Asset.',
        image: nftImageUri,
        attributes: [
            {
                key: 'LLM',
                value: 'ChatGPT',
            },
            {
                key: 'App Url',
                value: 'https://lens-jobs.vercel.app',
            },
        ],
    }

    // NFT Metadata to IPFS
    const nftIpfsHash = await uploadJSONToIPFS(nftMetadata)
    return `https://ipfs.io/ipfs/${nftIpfsHash}`
}