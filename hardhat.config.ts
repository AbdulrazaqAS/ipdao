import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv/config';

const {WALLET_PRIVATE_KEY} = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 175 // lower means smaller size, higher means cheaper runtime. Default: 200
      }
    }
  },
  networks: {
    aeneid: {
      url: 'https://aeneid.storyrpc.io',
      accounts: [WALLET_PRIVATE_KEY!],
    }
  }
};

export default config;
