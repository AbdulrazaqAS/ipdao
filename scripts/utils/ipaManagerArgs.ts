// IPAManager constructor ars. Used to verify the contract
module.exports = [
	process.env.IPA_GOVERNOR!,
	process.env.IPAssetRegistry!,
	process.env.LICENSING_MODULE!,
	process.env.PIL_TEMPLATE!,
	process.env.CoreMetadataViewModule!,
	process.env.REGISTRATION_WORKFLOWS!,
	process.env.DERIVATIVE_WORKFLOWS!,
	process.env.REVENUE_TOKEN!,
  	process.env.SPG_NFT_CONTRACT_NAME!,
  	process.env.SPG_NFT_CONTRACT_SYMBOL!,
];