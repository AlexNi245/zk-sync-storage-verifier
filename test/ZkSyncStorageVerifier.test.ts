import { expect } from "chai";
import crypto from 'crypto';
import { Contract, Interface, JsonRpcProvider, toBeHex, toUtf8Bytes } from "ethers";
import { ethers } from "hardhat";
import { getStoredBatchInfo } from "../scripts/batch/getStoredBatchInfo";
import { getTotalBatchesVerified } from "../scripts/batch/requests/getTotalBatchesVerified";
import { getStorageProof } from "../scripts/getStorageProof";
import { encode } from "../scripts/verify/utils/getBatch";
import { verifyStorageProof } from "../scripts/verify/verifyStorageProof";
import { hexZeroPad, arrayify, hexlify } from '@ethersproject/bytes';
import BLAKE2s from 'blake2s';

describe("ZkSyncStorageVerifier", function () {
    let zkSyncStorageVerifier: Contract;

    beforeEach(async function () {
        // Deploy the contract before each test
        const ZkSyncStorageVerifier = await ethers.getContractFactory("Blake2s");
        zkSyncStorageVerifier = await ZkSyncStorageVerifier.deploy();
        await zkSyncStorageVerifier.waitForDeployment();
    });

    it.only("blake solidity hash", async () => {
        const l1provider = new JsonRpcProvider(process.env.SEPOLIA_URL);
        const addr = "0x19dceeeb33baf5e74b5e2f4874fd3a289a985a62"


        let emptyHash = crypto.createHash('blake2s256').update("foob").digest();

        console.log('emptyHash', emptyHash.toString('hex'))

        const f = await ethers.getContractFactory("Blake2sNew")
        const c = await f.deploy()

        const res = await c.blake2s(toUtf8Bytes('foob'), toUtf8Bytes(''), 32)
        
        const form = await c.blake2sFormatted(toUtf8Bytes('foob'), toUtf8Bytes(''), 32)
        
        console.log('formatted', form)
        
        var h = new BLAKE2s(32)
        h.update("foob", 'utf8')
        //request the digest encoding
        console.log(h.digest('hex'))
        console.log('res', res)

    })

    it("computes stateroot and proof properly", async function () {
        console.log("check")
        const l1provider = new JsonRpcProvider(process.env.SEPOLIA_URL);
        const l2provider = new JsonRpcProvider(process.env.ZK_SYNC_SEPOLIA_URL);
        const batchNr = await getTotalBatchesVerified(l1provider, l2provider);

        //Deployed TestL2 contract on ZkSync
        const addr = '0x8D7E3CdC565d20E4738Abe16C143dA5C07C61E61';
        const batchInfo = await getStoredBatchInfo(l1provider, l2provider, batchNr)

        const proof = await getStorageProof(l2provider, addr, [1], batchNr);

        const isValid = verifyStorageProof(addr, proof.storageProof[0].key, proof.storageProof[0].proof, proof.storageProof[0].value, proof.storageProof[0].index, batchInfo.batchHash.toString())


        const encoded = encode(batchInfo)
        const hash = ethers.keccak256(encoded)



        const dimondProxy = '0x9a6de0f62aa270a8bcb1e2610078650d539b1ef9'; //Diamond Proxy 


        const diamonProxyAbi = new Interface([
            'function storedBatchHash(uint256) external view returns (bytes32)',
        ])

        const res = await l1provider.call({ to: dimondProxy, data: diamonProxyAbi.encodeFunctionData('storedBatchHash', [batchNr]) })


        expect(hash).to.equal(res)
        expect(isValid).to.equal(true)


    });

    // Add more test cases as needed
});