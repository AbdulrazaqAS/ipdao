# IPDAO

IPAO enables creators to launch and manage a decentralized autonomous organization (DAO) centered around their intellectual property (IP). This empowers communities to co-govern, fund, and monetize creative works in a transparent, decentralized way using Story Protocol.

Target Users
- Indie creators or teams (e.g., comic books, animations, music)
- Fan communities wanting to co-own or co-produce IP
- Web3-native brands launching collaborative stories or games
- Token projects evolving into open IP


```bash
# Deploy ERC20Token
yarn hardhat run scripts/deployERC20Token.ts --network aeneid
```
Then copy the `contractAddress` from the transaction receipt logged to the console. Paste the address as the `GOVERNANCE_TOKEN` inside *.env*.

```bash
# Deploy IPGovernorNoTimelock and make it token owner
yarn hardhat run scripts/deployIPGovernorNoTimeLock.ts --network aeneid
```
Then copy the `contractAddress` from the transaction receipt logged to the console. Paste the address as the `IPA_GOVERNOR` inside *.env*.

```bash
# Deploy IPAManager with governor as owner
yarn hardhat run scripts/deployIPAManager.ts --network aeneid
```
Now this is the contract that will be governed. Copy its address from the console and paste it as `IPA_MANAGER` inside *.env*.

## Verifications
TODO: Fix verification warnings
```bash
# Verify IPAMAanager
npx hardhat verify --constructor-args utils/ipaManagerArgs.ts --network aeneid <IPAManager Address>
```

npx hardhat verify --network aeneid 0xB1C6fDA5E79A4E8e102CEc5Dec6F78eF1d90d285 ["CreatorDao",300,900,100000000000000000000,4,"0x84E13D0d7396f881F3f78505e14af04AE987cBE9"]

npx hardhat verify --constructor-args utils/ipaManagerArgs.ts 0xd32Ba82ecDb9a559b017002369125F232D54B02F