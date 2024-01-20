import { BytesLike } from "ethers";

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

export interface CommitBatchInfo {
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



