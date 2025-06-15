// IPGovernorNoTimeLock constructor ars. Used to verify the contract
module.exports = [
    "ChronoForge DAO",
    60,
    180,
    100000000000000000000n,
    4,
    25000000000000000000n, // 25 tokens minimum for non-proposal actions
    process.env.GOVERNANCE_TOKEN!
];