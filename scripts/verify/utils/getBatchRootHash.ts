import { Interface, JsonRpcProvider } from "ethers";
import { Provider } from "zksync-ethers";



export const getBatchRootHash = async (l1Provider: JsonRpcProvider, l2Provider: JsonRpcProvider, l1Batch: number): Promise<string> => {
    try {
        const l1BatchDetails = await l2Provider.send('zks_getL1BatchDetails', [l1Batch]);

        console.log(l1BatchDetails)

        const commitTxHash = l1BatchDetails.commitTxHash;
        const proveTxHash = l1BatchDetails.proveTxHash;

        if (!commitTxHash || !proveTxHash) {
            throw new Error(`Batch ${l1Batch} has not been proven yet.`);
        }

        const commitTxReceipt = await l1Provider.getTransactionReceipt(commitTxHash);
        const commitTx = await l1Provider.getTransaction(commitTxHash);

        //console.log(commitTxReceipt)
        // console.log(commitTx)
        //CHECK IF ROOTHASH also exists in l1BatchDetails. It appears it is the same
        const root = parseCommitCallCalldata(commitTx!.data, l1Batch);

        return root

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

function parseCommitCallCalldata(calldata: string, batchToFind: number){
    // Decode the calldata using the ABI interface
    const decoded = iface.decodeFunctionData("commitBatches", calldata);

    const batchToFindBn = BigInt(batchToFind);
    const newBatchesData = decoded[1];

    // Find the batch we're interested in
    const selectedBatch = newBatchesData.find((batch: any) => batch[0] === batchToFindBn);

    if (!selectedBatch) {
        throw new Error(`Could not find batch ${batchToFindBn} in calldata.`);
    }

    // Extract the new state root and any other information you need from the selected batch
    const newStateRoot = selectedBatch[3]; // Assuming this is the correct index for the new state root


    return newStateRoot
}