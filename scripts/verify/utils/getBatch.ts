import { ethers } from "ethers";
import { StoredBatchInfo } from "../../batch/types";





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