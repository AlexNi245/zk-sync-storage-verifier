import { Interface, JsonRpcProvider } from "ethers";
import { StoredBatchInfo, CommitBatchInfo } from "./types";
import { getL2LogsTreeRoot } from "./requests/getL2LogsTreeRoot";
import { getCommitment } from "./requests/getCommitment";

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

        const l2LogsTreeRoot = await getL2LogsTreeRoot(l1Provider, l2Provider, l1Batch);
        const commitment = await getCommitment(l1Provider, commitTxHash);


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

function parseCommitCallCalldata(calldata: string, batchToFind: number) {
    // Define the structure of your commit call data based on the smart contract ABI
    const COMMIT_BATCHES_ABI = [
        "function commitBatches((uint64,bytes32,uint64,uint256,bytes32,bytes32,uint256,bytes32) lastCommittedBatchData, (uint64,uint64,uint64,bytes32,uint256,bytes32,bytes32,bytes32,bytes,bytes)[] newBatchesData)"
    ];

    // Create an interface for the function
    const iface = new Interface(COMMIT_BATCHES_ABI);
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
