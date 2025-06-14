# IPDAO

### Contracts deployments
```bash
# Assuming you've finished root dir's readme

# Install packages
yarn

# Compile contracts
yarn hardhat compile
```
There might be compilation warnings which will probably be from the installed packages. Just ignore them as per as the compilation is successfully.

All the following contracts deployment scripts have configurable fields like names, symbols, and other defaults. Feel free to change them especially the names. 

```bash
# Rename .env
mv .env.example .env

# Deploy Governance Token (ERC20)
yarn hardhat run scripts/deployERC20Token.ts --network aeneid
```
Then copy the token address from the console and paste it as the `GOVERNANCE_TOKEN` inside *.env*.

```bash
# Deploy IPAGovernor
yarn hardhat run scripts/deployIPAGovernor.ts --network aeneid
```
Then copy the contract address from the console and paste it as the `IPA_GOVERNOR` inside *.env*. Then copy the governor block number and paste it as `IPA_GOVERNOR_BLOCK` inside `.env`. The block will be used as starting block for lookups.

```bash
# Deploy IPAManager with governor as owner
yarn hardhat run scripts/deployIPAManager.ts --network aeneid
```
Then copy the contract address from the console and paste it as `IPA_MANAGER` inside *.env*.

```bash
# Deploy QuizManager
yarn hardhat run scripts/deployQuizManager.ts --network aeneid
```
Then copy the contract address from the console and paste it as the `QUIZ_MANAGER` inside *.env*. The governor is also given quiz creator role for creating quizzes. And an address, `QUIZ_SUBMITTER`, is given submitter role for marking and submitting quiz results to the `QuizManager`.

```bash
# Set roles and transfer ownership to governor
yarn hardhat run scripts/transferOwnership.ts --network aeneid
```
Governor will now be the admin of QuizManager and Token. Admins are responsible for granting and revoking and revoking roles. The governor is also given minter role responsible for minting tokens.

From now on, granting and revoking roles can only be done through proposals. Quiz creation and minting tokens too can only be done through proposals.

```bash
# Deploy SPG NFT Contract
yarn hardhat run scripts/deploySPGNFTContract.ts --network aeneid
```
Copy the contract address and save it as the `SPGNFTContract` value inside *env*. This contract will only be used in frontend for making derivatives.


### Contracts Verifications [Optional]
This section is completely optional. Plus unless you did some major modifications to the contracts, verifications we did will be used to verify yours since the deployment code will be the same.

The contracts are verified using the deployment variables. If you changed any of the deployment variables in deployment scripts, then update it in the corresponding contract deployment args script.
```bash
# Verify Governance Token
yarn hardhat verify --constructor-args scripts/utils/erc20Args.ts --network aeneid <Token Address>

# Verify Governor
yarn hardhat verify --constructor-args scripts/utils/governorArgs.ts --network aeneid <Governor Address>

# Verify IPAMAanager
yarn hardhat verify --constructor-args scripts/utils/ipaManagerArgs.ts --network aeneid <IPAManager Address>

# Verify QuizManager
yarn hardhat verify --constructor-args scripts/utils/quizManagerArgs.ts --network aeneid <QuizManager Address>

# SPG NFT is already verified by Story Protocol.
```
