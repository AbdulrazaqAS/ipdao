# Sample Hardhat Project

Create an IP asset (customize asset data from *scripts/registration/registerCustom*)
```bash
yarn register-custom
```

```bash
# Deploy IPDaoFactory

# Deploy ERC20Token
yarn hardhat run scripts/deployERC20Token.ts --network aeneid
```
Then copy the `contractAddress` from the transaction receipt logged to the console. Paste the address as the `governanceToken` inside *deployIPGovernorNoTimelock.ts*.

```bash
# Deploy IPGovernorNoTimelock and make it token owner
yarn hardhat run scripts/deployIPGovernorNoTimeLock.ts --network aeneid
```
Then copy the `contractAddress` from the transaction receipt logged to the console. Paste the address as the `initialOwner` inside *createDao.ts*.

```bash
# Create an IPManager instance through factory with governor as owner
yarn hardhat run scripts/createDao.ts --network aeneid
```
Now this is the contract that will be governed. Save its address for making executing proposals through the governor. Start by sending it the IPA NFT.

npx hardhat verify --network aeneid 0xB1C6fDA5E79A4E8e102CEc5Dec6F78eF1d90d285 ["CreatorDao",300,900,100000000000000000000,4,"0x84E13D0d7396f881F3f78505e14af04AE987cBE9"]

npx hardhat verify --constructor-args utils/ipaManagerArgs.ts 0x2A21048B3EFE59aF16CfB4b72576FDBf1258b657