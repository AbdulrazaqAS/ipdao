import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import "dotenv/config";

const { WALLET_PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // lower means smaller size, higher means cheaper runtime. Default: 200
      },
    },
  },
  networks: {
    aeneid: {
      url: "https://aeneid.storyrpc.io",
      accounts: [WALLET_PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: {
      'aeneid': 'empty'
    },
    customChains: [
      {
        network: "aeneid",
        chainId: 1315,
        urls: {
          apiURL: "https://aeneid.storyscan.io/api",
          browserURL: "https://aeneid.storyscan.io"
        }
      }
    ]
  }
};

export default config;
