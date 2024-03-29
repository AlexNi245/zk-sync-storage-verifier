import { HardhatUserConfig } from "hardhat/config";
require('dotenv').config()
import "@nomicfoundation/hardhat-ethers";

const config: HardhatUserConfig = {

  defaultNetwork: "zkSyncSepoliaTestnet",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_URL,
      verifyURL: "https://sepolia.etherscan.io/",
      accounts: [process.env.WALLET_PRIVATE_KEY!]

    },
    zkSyncSepoliaTestnet: {
      url: "https://sepolia.era.zksync.dev",
      // ethNetwork: "sepolia",
      // zksync: true,
      verifyURL: "https://explorer.sepolia.era.zksync.dev/contract_verification",
    },
    zkSyncMainnet: {
      url: "https://mainnet.era.zksync.io",
      // ethNetwork: "mainnet",
      //  zksync: true,
      verifyURL: "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
    },
    zkSyncGoerliTestnet: { // deprecated network
      url: "https://testnet.era.zksync.dev",
      //ethNetwork: "goerli",
      // zksync: true,
      verifyURL: "https://zksync2-testnet-explorer.zksync.dev/contract_verification",
    },
    dockerizedNode: {
      url: "http://localhost:3050",
      // ethNetwork: "http://localhost:8545",
      //  zksync: true,
    },
    inMemoryNode: {
      url: "http://127.0.0.1:8011",
      //  ethNetwork: "", // in-memory node doesn't support eth node; removing this line will cause an error
      //  zksync: true,
    },
    hardhat: {
      // zksync: true,
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.20",
      },
      {
        version: "0.4.11",
      }
    ]
  },
};

export default config;
