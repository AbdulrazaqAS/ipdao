# IPDAO

IPAO enables creators to launch and manage a decentralized autonomous organization (DAO) centered around their intellectual property (IP). This empowers communities to co-govern, fund, and monetize creative works in a transparent, decentralized way using Story Protocol.

Target Users
- Indie creators or teams (e.g., comic books, animations, music)
- Fan communities wanting to co-own or co-produce IP
- Web3-native brands launching collaborative stories or games
- Token projects evolving into open IP

```bash
# Clone repo
git clone https://github.com/AbdulrazaqAS/ipdao.git

# Change dir
cd ipdao

# Install packages
yarn

# Compile contracts
yarn hardhat compile
```
There might be compilation warnings which will probably be from the installed packages. Just ignore them as per as the compilation is successfully.

```bash
# Rename .env
mv .env.example .env

# Deploy ERC20Token
yarn hardhat run scripts/deployERC20Token.ts --network aeneid
```
Then copy the `contractAddress` from the transaction receipt logged to the console. Paste the address as the `GOVERNANCE_TOKEN` inside *.env*.

```bash
# Deploy IPAGovernor and make it token owner
yarn hardhat run scripts/deployIPAGovernor.ts --network aeneid
```
Then copy the `contractAddress` from the transaction receipt logged to the console. Paste the address as the `IPA_GOVERNOR` inside *.env*.

```bash
# Deploy IPAManager with governor as owner
yarn hardhat run scripts/deployIPAManager.ts --network aeneid
```
Now this is the contract that will be governed. Copy its address from the console and paste it as `IPA_MANAGER` inside *.env*.

```bash
# Deploy QuizManager with governor as owner
yarn hardhat run scripts/deployQuizManager.ts --network aeneid
```
Then copy the contract address from the console and paste it as the `QUIZ_MANAGER` inside *.env*.

## Frontend setup
```bash
# Change dir
cd frontend

# Install packages
yarn

# Rename .env
mv .env.example .env

# Fill the missing .evn parameters with the previous values

# Run
yarn dev
```

## Verifications [Optional]
TODO: Fix verification warnings
```bash
# Verify ERC20
yarn hardhat verify --constructor-args scripts/utils/erc20Args.ts --network aeneid <ERC20 Address>

# Verify Governor
yarn hardhat verify --constructor-args scripts/utils/governorArgs.ts --network aeneid <Governor Address>

# Verify IPAMAanager
yarn hardhat verify --constructor-args scripts/utils/ipaManagerArgs.ts --network aeneid <IPAManager Address>

# Verify QuizManager
yarn hardhat verify --constructor-args scripts/utils/quizManagerArgs.ts --network aeneid <QuizManager Address>

```

