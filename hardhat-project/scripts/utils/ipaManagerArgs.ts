// IPAManager constructor ars. Used to verify the contract
module.exports = [
	20 * 10 ** 6,
	process.env.IPA_GOVERNOR!,
	process.env.IPAssetRegistry!,
	process.env.LICENSING_MODULE!,
	process.env.PIL_TEMPLATE!,
	process.env.CoreMetadataViewModule!,
	process.env.REGISTRATION_WORKFLOWS!,
	process.env.DERIVATIVE_WORKFLOWS!,
	process.env.ROYALTY_MODULE!,
  	"CreatorDAOSPGNFT",
  	"CRTSPGNFT",
];