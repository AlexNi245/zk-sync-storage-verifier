import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Interface, JsonRpcProvider, toBeHex } from "ethers";
import { encode, getStoredBatchInfo } from "../scripts/verify/utils/getBatch";
import { Provider, types } from "zksync-ethers";

describe("ZkSyncStorageVerifier", function () {
    let zkSyncStorageVerifier: Contract;

    beforeEach(async function () {
        // Deploy the contract before each test
        const ZkSyncStorageVerifier = await ethers.getContractFactory("ZkSyncStorageVerifier");
        zkSyncStorageVerifier = await ZkSyncStorageVerifier.deploy();
        await zkSyncStorageVerifier.waitForDeployment();
    });

    it("should correctly process L2 logs", async function () {
        console.log("check")
        const l1provider = new JsonRpcProvider(process.env.SEPOLIA_URL);
        const l2provider = new JsonRpcProvider(process.env.ZK_SYNC_SEPOLIA_URL);
        const batchNr = 5531;

        const batchInfo = await getStoredBatchInfo(l1provider, l2provider, batchNr)

        const encoded = encode(batchInfo)


        const hash = ethers.keccak256(encoded)

        console.log("batch info", batchInfo)
        console.log("hash", hash)

        const dimondProxy = '0x9a6de0f62aa270a8bcb1e2610078650d539b1ef9'; //Diamond Proxy 


        const diamonProxyAbi = new Interface([
            'function storedBatchHash(uint256) external view returns (bytes32)',
            'function l2LogsRootHash(uint256 _batchNumber) external view returns (bytes32 hash)'
        ])

        const res = await l1provider.call({ to: dimondProxy, data: diamonProxyAbi.encodeFunctionData('storedBatchHash', [batchNr]) })


        const l2LogsRootHash = await l1provider.call({ to: dimondProxy, data: diamonProxyAbi.encodeFunctionData('l2LogsRootHash', [batchNr]) })


        console.log("expected state root", res)


    });

    // Add more test cases as needed
});