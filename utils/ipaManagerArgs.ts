// IPAManager constructor ars. Used to verify the contract
module.exports = [
	process.env.IPA_GOVERNOR!,
	process.env.IPAssetRegistry!,
	process.env.LICENSING_MODULE!,
	process.env.PIL_TEMPLATE!,
	process.env.CoreMetadataViewModule!,
	process.env.REVENUE_TOKEN!,
	process.env.NFT_CONTRACT_ADDRESS!,
];