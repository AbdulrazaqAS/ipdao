# Sample Hardhat Project

```bash
# Deploy IPDaoFactory

# Deploy ERC20Token
yarn hardhat run scripts/deployERC20Token.ts --network aeneid
```
Then copy the `contractAddress` from the transaction receipt logged to the console. Paste the address as the `governanceToken` inside **deployIPGovernorNoTimelock.ts**.

```bash
# Deploy IPGovernorNoTimelock and make it token owner
yarn hardhat run scripts/deployIPGovernorNoTimeLock.ts --network aeneid
```
Then copy the `contractAddress` from the transaction receipt logged to the console. Paste the address as the `initialOwner` inside **createDao.ts**.

```bash
# Create an IPManager instance through factory with governor as owner
yarn hardhat run scripts/createDao.ts --network aeneid
```
Now this is the contract that will be governed. Save its address for making executing proposals through the governor. Start by sending it the IPA NFT.

