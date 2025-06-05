import { zeroAddress } from 'viem'
import { client } from './utils/config'

const main = async function () {
    const IPA_MANAGER = process.env.IPA_MANAGER!;
    const name = process.env.SPG_NFT_CONTRACT_NAME!;
    const symbol = process.env.SPG_NFT_CONTRACT_SYMBOL!;
    
    // Create a new SPG NFT collection
    //
    // NOTE: Use this code to create a new SPG NFT collection. You can then use the
    // `newCollection.spgNftContract` address as the `spgNftContract` argument in
    // functions like `mintAndRegisterIpAssetWithPilTerms` in the
    // `simpleMintAndRegisterSpg.ts` file.
    //
    // You will mostly only have to do this once. Once you get your nft contract address,
    // you can use it in SPG functions.
    //
    const newCollection = await client.nftClient.createNFTCollection({
        name,
        symbol,
        isPublicMinting: false,  // whether anyone can mint
        mintOpen: true,  // whether it is open for minting on creation
        mintFeeRecipient: zeroAddress,  // address to recieve mint fees, zeroAddr since minting private
        contractURI: '',
        txOptions: { waitForTransaction: true },
    })

    console.log('New collection created:', {
        'SPG NFT Contract Address': newCollection.spgNftContract,
        'Transaction Hash': newCollection.txHash,
    })
}

main()
