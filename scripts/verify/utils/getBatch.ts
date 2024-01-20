import { BytesLike, Interface, JsonRpcProvider, ethers } from "ethers";

export interface StoredBatchInfo {
    batchNumber: bigint;
    batchHash: BytesLike;
    indexRepeatedStorageChanges: bigint;
    numberOfLayer1Txs: bigint;
    priorityOperationsHash: BytesLike;
    l2LogsTreeRoot: BytesLike;
    timestamp: bigint;
    commitment: BytesLike;
}

interface CommitBatchInfo {
    batchNumber: bigint; // uint64 in Solidity is represented as bigint in TypeScript
    timestamp: bigint; // uint64 as bigint
    indexRepeatedStorageChanges: bigint; // uint64 as bigint
    newStateRoot: string; // bytes32 is typically represented as a hex string in TypeScript
    numberOfLayer1Txs: bigint; // uint256 as bigint
    priorityOperationsHash: string; // bytes32 as hex string
    bootloaderHeapInitialContentsHash: string; // bytes32 as hex string
    eventsQueueStateHash: string; // bytes32 as hex string
    systemLogs: Uint8Array; // bytes is an array of bytes, represented as Uint8Array in TypeScript
    totalL2ToL1Pubdata: Uint8Array; // bytes as Uint8Array
}

export const getStoredBatchInfo = async (l1Provider: JsonRpcProvider, l2Provider: JsonRpcProvider, l1Batch: number): Promise<StoredBatchInfo> => {
    try {
        const l1BatchDetails = await l2Provider.send('zks_getL1BatchDetails', [l1Batch]);


        const commitTxHash = l1BatchDetails.commitTxHash;
        const proveTxHash = l1BatchDetails.proveTxHash;

        if (!commitTxHash || !proveTxHash) {
            throw new Error(`Batch ${l1Batch} has not been proven yet.`);
        }

        const commitTx = await l1Provider.getTransaction(commitTxHash);

        const batchInfoRaw = parseCommitCallCalldata(commitTx!.data, l1Batch);

        const commitBatchInfo: CommitBatchInfo = {
            batchNumber: batchInfoRaw[0],
            timestamp: batchInfoRaw[1],
            indexRepeatedStorageChanges: batchInfoRaw[2],
            newStateRoot: batchInfoRaw[3],
            numberOfLayer1Txs: batchInfoRaw[4],
            priorityOperationsHash: batchInfoRaw[5],
            bootloaderHeapInitialContentsHash: batchInfoRaw[6],
            eventsQueueStateHash: batchInfoRaw[7],
            systemLogs: batchInfoRaw[8],
            totalL2ToL1Pubdata: batchInfoRaw[9],
        }

        const l2LogsTreeRoot = "0x4a412235f0cabcd01974913293eac5ba0ede5f2d28d4eef7551de4f9151cf919"
        const commitment = '0x1E3262C8B205EDF92A1EA6A16B064BD6F27F805906955F97CA88BB1E1A6B215F'


        const storedBatchInfo: StoredBatchInfo = {
            batchNumber: batchInfoRaw[0],
            batchHash: commitBatchInfo.newStateRoot,
            indexRepeatedStorageChanges: commitBatchInfo.indexRepeatedStorageChanges,
            numberOfLayer1Txs: commitBatchInfo.numberOfLayer1Txs,
            priorityOperationsHash: commitBatchInfo.priorityOperationsHash,
            l2LogsTreeRoot,
            timestamp: commitBatchInfo.timestamp,
            commitment
        }
        return storedBatchInfo

    } catch (error) {
        console.log('Error while fetching batch root hash. ', error);
        // Handle error appropriately
        throw error;
    }
}


// Define the structure of your commit call data based on the smart contract ABI
const COMMIT_BATCHES_ABI = [
    "function commitBatches((uint64,bytes32,uint64,uint256,bytes32,bytes32,uint256,bytes32) lastCommittedBatchData, (uint64,uint64,uint64,bytes32,uint256,bytes32,bytes32,bytes32,bytes,bytes)[] newBatchesData)"
];

// Create an interface for the function
const iface = new Interface(COMMIT_BATCHES_ABI);

function parseCommitCallCalldata(calldata: string, batchToFind: number) {
    // Decode the calldata using the ABI interface
    const decoded = iface.decodeFunctionData("commitBatches", calldata);

    const batchToFindBn = BigInt(batchToFind);
    const newBatchesData = decoded[1];

    // Find the batch we're interested in
    const selectedBatch = newBatchesData.find((batch: any) => batch[0] === batchToFindBn);

    if (!selectedBatch) {
        throw new Error(`Could not find batch ${batchToFindBn} in calldata.`);
    }


    return selectedBatch
}

const getLogTreeRoot = async (l1Provider: JsonRpcProvider, commitBatchInfo: CommitBatchInfo) => {
    const L2LogReaderInterface = [
        // Define the function signature
        "function _processL2Logs(tuple(uint64 batchNumber, uint64 timestamp, uint64 indexRepeatedStorageChanges, bytes32 newStateRoot, uint256 numberOfLayer1Txs, bytes32 priorityOperationsHash, bytes32 bootloaderHeapInitialContentsHash, bytes32 eventsQueueStateHash, bytes systemLogs, bytes totalL2ToL1Pubdata) _newBatch, bytes32 _expectedSystemContractUpgradeTxHash) public pure returns (uint256 numberOfLayer1Txs, bytes32 chainedPriorityTxsHash, bytes32 previousBatchHash, bytes32 stateDiffHash, bytes32 l2LogsTreeRoot, uint256 packedBatchAndL2BlockTimestamp)"
    ];

    const addr = '0x2871F074319BBcf435eaC9c34196A6C52aFB7734';

    const iface = new Interface(L2LogReaderInterface);

    const l2SystemContractsUpgradeBatchNumber = await getl2SystemContractsUpgradeBatchNumber(l1Provider)

    const calldata = iface.encodeFunctionData("_processL2Logs", [commitBatchInfo, l2SystemContractsUpgradeBatchNumber]);

    const res = await l1Provider.call({ to: addr, data: calldata })

    console.log("getLogTreeRoot", res)

    return res
}

const getl2SystemContractsUpgradeBatchNumber = async (l1Provider: JsonRpcProvider) => {
    const l1provider = new JsonRpcProvider(process.env.SEPOLIA_URL);
    const dimondProxy = '0x9a6de0f62aa270a8bcb1e2610078650d539b1ef9'; //Diamond Proxy 


    const diamonProxyAbi = new Interface([

        'function getL2SystemContractsUpgradeBatchNumber() external view returns (uint256)'
    ])

    const res = await l1provider.call({ to: dimondProxy, data: diamonProxyAbi.encodeFunctionData('getL2SystemContractsUpgradeBatchNumber', []) })

    console.log("getL2SystemContractsUpgradeBatchNumber ", res)

    return res

}

export const encode = (storedBatchInfo: StoredBatchInfo) => {
    const types = [
        'uint64',   // batchNumber
        'bytes32',  // batchHash
        'uint64',   // indexRepeatedStorageChanges
        'uint256',  // numberOfLayer1Txs
        'bytes32',  // priorityOperationsHash
        'bytes32',  // l2LogsTreeRoot
        'uint256',  // timestamp
        'bytes32'   // commitment
    ];

    // Define the values of the struct fields
    const values = [
        storedBatchInfo.batchNumber,
        storedBatchInfo.batchHash,
        storedBatchInfo.indexRepeatedStorageChanges,
        storedBatchInfo.numberOfLayer1Txs,
        storedBatchInfo.priorityOperationsHash,
        storedBatchInfo.l2LogsTreeRoot,
        storedBatchInfo.timestamp,
        storedBatchInfo.commitment
    ];

    // Encode the struct
    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(types, values);
    return encodedData;
}