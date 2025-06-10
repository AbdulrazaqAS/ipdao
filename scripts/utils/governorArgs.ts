// IPGovernorNoTimeLock constructor ars. Used to verify the contract
module.exports = [
    "CreatorDao",
    90,
    300,
    100000000000000000000n,
    4,
    25000000000000000000n, // 25 tokens minimum for non-proposal actions
    process.env.GOVERNANCE_TOKEN!
];