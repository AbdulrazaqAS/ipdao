# IPDAO Contracts

All contracts are written in Solidity and follow a modular design.

### Core Contracts
- **IPGovernor:** The core governance contract. Handles:
  - Proposal lifecycle (creation, voting, execution)
  - Calling other contracts through proposals
  - Roles granting
  - Minimum thresholds

- **GovernanceERC20Token (Governance Token):** An ERC20-compatible token which defined an address' voting power. It handles votes delegation which can be called by anyone. It also handles:
  - Minting by a `MINTER_ROLE`
  - Burning by a `BURNER_ROLE`

- **IPAManager**: This contract holds and manages all the DAO IP assets and tokens. It acts as the DAO treasury. The governor handles the following through this contract:
  - Creating/registering new assets
  - Transferring assets
  - Attaching licenses
  - Transferring assets royalty tokens
  - DAO royalty tokens percentage
  - Executing other functions like:
    - Transferring tokens
    - Giving approval/allowance to `QuizManager` to transfer DAO tokens to quiz winners
    - Interacting with assets accounts/vaults
    - Forcing DAO royalty share of assets (Coming up later)

- **QuizManager**:  This contract manages quizzes and quiz users states. It handles:
  - Claiming of prize by an address after verification.
  - Updating quiz state by `UPDATER_ROLE`
  - Creating quizzes by `CREATOR_ROLE`


### Contracts deployments
```bash
# Assuming you've finished root dir's readme

# Install packages
yarn
```

This project is a hardhat-foundry project. Follow this [guide](https://hardhat.org/hardhat-runner/docs/advanced/hardhat-and-foundry#adding-foundry-to-a-hardhat-project) from Hardhat to add foundry to a hardhat project. Make sure to install it before continuing.

The above process should install `forge-std`. If for any reason it failed to install it (as in my case) and asked you to install it manually, then run:
```bash
forge install foundry-rs/forge-std
```

After successfully installing Hardhat and foundry, continue with the following.
```bash
# Rename .env.example to .env
mv .env.example .env
```

Fill in the `WALLET_PRIVATE_KEY` field with a private key. This will be the deployer and initial admin of some contracts before transferring the role. Then fill in `INITIAL_ADMIN` field with the address owning the above private key. This will be used in contract verification scripts.

```bash
# Compile contracts
yarn hardhat compile
```
There might be compilation warnings which will probably be from the installed packages. Just ignore them as per as the compilation is successfully.

Also, fill in `QUIZ_SUBMITTER` with an address which will be given `SUBMITTER_ROLE` by the `QuizManager` contract. Since marking quizzes is offchain, we need someone, ad address, (not just everyone) to submit the user score to the quiz contract. This can be same as the `INITIAL_ADMIN` address.

When a user submits a quiz, the questions taking and the user selected answers are submitted to a server. There, the quiz correct answers are decrypted and then used to mark the submitted answers. After that, the score is submitted to the contract by the assigned address for updates. The contract will then check whether the score is greater than the minimum required score.

The private key of the address used will be required in frontend for the server.

All the following contracts deployment scripts have configurable fields like names, symbols, and other defaults. Feel free to change them especially the names. The current configuration is for a fictional game.

```bash
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

Proceed to frontend setup to interact with the DAO.