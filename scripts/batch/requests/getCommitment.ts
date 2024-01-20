import { EventLog, ethers } from "ethers";

export const getCommitment = async (l1Provider: ethers.JsonRpcProvider, commitTxHash: string) => {
    const receipt = await l1Provider.getTransactionReceipt(commitTxHash)

    if (!receipt) {
        throw new Error(`No receipt for commit tx  ${commitTxHash}`)
    }

    //commitment is the 4rd topic of the event
    //event BlockCommit(uint256 indexed batchNumber, bytes32 indexed batchHash, bytes32 indexed commitment);
    const [, , ,commitment] = receipt.logs[0].topics
    return commitment


}