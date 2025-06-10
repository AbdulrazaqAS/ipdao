// IPAManager constructor ars. Used to verify the contract
module.exports = [
	process.env.INITIAL_ADMIN!,
	process.env.IPA_GOVERNOR!,
	process.env.QUIZ_SUBMITTER!,
	process.env.IPA_MANAGER!,
];