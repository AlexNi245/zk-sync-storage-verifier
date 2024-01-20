import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Interface, JsonRpcProvider, toBeHex } from "ethers";
import { encode } from "../scripts/verify/utils/getBatch";
import { Provider, types } from "zksync-ethers";
import { getStorageProof } from "../scripts/getStorageProof";
import { verifyStorageProof } from "../scripts/verify/verifyStorageProof";
import { getStoredBatchInfo } from "../scripts/batch/getStoredBatchInfo";
import { getTotalBatchesVerified } from "../scripts/batch/requests/getTotalBatchesVerified";

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
        const batchNr = await getTotalBatchesVerified(l1provider, l2provider);

        const addr = '0x8D7E3CdC565d20E4738Abe16C143dA5C07C61E61';
        const proof = await getStorageProof(l2provider, addr, [1], batchNr);
        const batchInfo = await getStoredBatchInfo(l1provider, l2provider, batchNr)

        const isValid = verifyStorageProof(addr, proof.storageProof[0].key, proof.storageProof[0].proof, proof.storageProof[0].value, proof.storageProof[0].index, batchInfo.batchHash.toString())


        console.log(isValid)
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


        console.log("expected state root", res)

        expect(hash).to.equal(res)


    });

    // Add more test cases as needed
});