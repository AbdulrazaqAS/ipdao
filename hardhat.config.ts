import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv/config';

const {WALLET_PRIVATE_KEY} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.26",
  networks: {
    aeneid: {
      url: 'https://aeneid.storyrpc.io',
      accounts: [WALLET_PRIVATE_KEY!],
    }
  }
};

export default config;
