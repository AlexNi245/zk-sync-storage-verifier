import { expect } from "chai";
import { Contract, Interface, JsonRpcProvider } from "ethers";
import { ethers } from "hardhat";
import { getStoredBatchInfo } from "../scripts/batch/getStoredBatchInfo";
import { getTotalBatchesVerified } from "../scripts/batch/requests/getTotalBatchesVerified";
import { getStorageProof } from "../scripts/getStorageProof";
import { encode } from "../scripts/verify/utils/getBatch";
import { verifyStorageProof } from "../scripts/verify/verifyStorageProof";

describe("ZkSyncStorageVerifier", function () {
    let zkSyncStorageVerifier: Contract;

    beforeEach(async function () {
        // Deploy the contract before each test
        const ZkSyncStorageVerifier = await ethers.getContractFactory("ZkSyncStorageVerifier");
        zkSyncStorageVerifier = await ZkSyncStorageVerifier.deploy();
        await zkSyncStorageVerifier.waitForDeployment();
    });


    it("computes stateroot and proof properly", async function () {
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

    it.only("solidity works properly", async () => {
        const l1provider = new JsonRpcProvider(process.env.SEPOLIA_URL);
        const l2provider = new JsonRpcProvider(process.env.ZK_SYNC_SEPOLIA_URL);
        //   const batchNr = await getTotalBatchesVerified(l1provider, l2provider);

        //Deployed TestL2 contract on ZkSync
        const addr = '0x8D7E3CdC565d20E4738Abe16C143dA5C07C61E61';
        // const batchInfo = await getStoredBatchInfo(l1provider, l2provider, batchNr)

        // const proof = await getStorageProof(l2provider, addr, [1], batchNr);
        const proof = {
            address: '0x8d7e3cdc565d20e4738abe16c143da5c07c61e61',
            storageProof: [
                {
                    key: '0x0000000000000000000000000000000000000000000000000000000000000001',
                    proof: [
                        '0x2941d0fcf524ddc2e0b1fad2bc0f546229508666a46318c8a52f0820d3c2bcf2',
                        '0x7a381d4487c128488d31fa026060abd7d1cb1bfdbfe6ea1abc84ae271e117825',
                        '0x0e530a7d04f335c6eecf849a0c2333d1a6c97dccc01fc3f7f69854d47c0c2964',
                        '0x6c7f3a74381dc662d814ca4a7d08c9e2658684ecd492785e392cab3519159fbd',
                        '0xff0e104a96da0498476d5cfa5fdebf39f35ee823b5e990740ac2f08cef619446',
                        '0x628d8707bc714d09409793b7407d8c8321afde4e470f21887049d679c863c556',
                        '0x03c14ad357a30190a69ae34818a461006444006c757dde4d9821385d937e5211',
                        '0xec075b53ebb5e18141e9baab72ac3f200df3f67151f3809178c0d5fa02158bb8',
                        '0x7b1adbaa6a5dbf3cc2e1d3408fa9d9f4ec475a9bdca052b55e9f200d0abc0f5c',
                        '0xad0405507b11559e0537391cbc52d530ee69cfc9550d120dea1a947eea508229',
                        '0xd0665e33856b8bdbe5a68ec9a22c04fc9721a7321831847c9926e5c2c74d9eef',
                        '0x554fefb06d9874515a7f3b345c39fa8369c73947e8d51e209bb633050e5c1303',
                        '0x308cf3e7a157c1ae23c01616fbe75e3afa951be05be9272f70dfec3e9dc5fb2e',
                        '0x651eda47b4bdfcea171123c68f3024c088461641965bdc3b2a9fa56685dcc050',
                        '0xe073eb8df27fa84dbb4745f5bade34d7e3e3d2d437c3e3141fef507dda98357b',
                        '0x6cef0123d4bf7675f0faf3452f967c496979d7e120752482c3c48d75dcb3861b',
                        '0xe911ce0d05aba6f9e5a90c4ab9c6241d213e77a4b52871249a55ba8e297f28cc',
                        '0x78486316632acfd619a33a92a66bf1f1124b519698a0b5e95f2db14fee71e7ac',
                        '0x1e72d341b4f5f75fdb9e881516d6b31725a066a5ed7538a05d9093041e8879e7',
                        '0xbb20f1ed0d56e00bc0a59fdc62b9b726f56ae7fec52a773d673065fbb6f21851',
                        '0xc9d7bda0faf9c357931e896fa23c2423c6152b5f503f255ef09ba4bbf61f4e2e',
                        '0x3428d3166e6ef94e44bd12c2d71d02469c92fc7821b83f3118ba2a20820aef8a'
                    ],
                    value: '0x5361746f7368690000000000000000000000000000000000000000000000000e',
                    index: 361145
                }
            ]
        }
        const encodedValue = '0x00000000000582b95361746f7368690000000000000000000000000000000000000000000000000e'
        console.log(encodedValue)
        const res = await zkSyncStorageVerifier.verifyStorageProof(addr, proof.storageProof[0])

        console.log(res)

        expect(res).to.equal(encodedValue)
    })

    // Add more test cases as needed
});