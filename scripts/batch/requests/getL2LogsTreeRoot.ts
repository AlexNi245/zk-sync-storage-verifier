import { Interface, ethers } from "ethers"

export const getL2LogsTreeRoot = async (l1Provider: ethers.JsonRpcProvider, l2Provider: ethers.JsonRpcProvider, batchNumber: number) => {
    const diamondProxyAbi = new Interface([
        'function l2LogsRootHash(uint256 _batchNumber) external view returns (bytes32 hash)',
        'function getTotalBatchesVerified() external view returns (uint256)'

    ])
    const result = await l2Provider.send('zks_getMainContract', [])

    const l2LogsRootHash = await l1Provider.call({ to: result, data: diamondProxyAbi.encodeFunctionData('l2LogsRootHash', [batchNumber]) })

    if (l2LogsRootHash === '0x') {
        throw new Error(`l2LogsRootHash for ${batchNumber} have not been commited yet.`);
    }
    return l2LogsRootHash;
}