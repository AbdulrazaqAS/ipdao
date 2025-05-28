import {ethers} from "hardhat";
import "dotenv/config";
import uploadNFTMetadataToIPFS from "./uploadNFTMetadataToIPFS";

async function main(){
    const tokenAddress = process.env.NFT_CONTRACT_ADDRESS!;
    const tokenReceiver = process.env.IPA_MANAGER!;

    // Customize the metadata from the script
    const tokenUri = await uploadNFTMetadataToIPFS();

    const erc721Token = await ethers.getContractAt("ERC721Token", tokenAddress);
    const tx = await erc721Token.safeMint(tokenReceiver, tokenUri);
    const txReceipt = await tx.wait();

    const tokenId = parseInt(txReceipt!.logs[0].topics[3], 16);
    console.log(`NFT minted. Token ID: ${tokenId}`);
}

main().catch(console.error);