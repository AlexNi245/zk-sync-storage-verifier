import { Interface, ethers, toBeHex, toBigInt, toNumber } from "ethers";

export const getTotalBatchesVerified = async (l1Provider: ethers.JsonRpcProvider, l2Provider: ethers.JsonRpcProvider) => {

    const diamondProxyAbi = new Interface([
        'function getTotalBatchesVerified() external view returns (uint256)'
    ])

    const result = await l2Provider.send('zks_getMainContract', [])

    const totalBatchesVerified = await l1Provider.call({
        to: result, data: diamondProxyAbi.encodeFunctionData('getTotalBatchesVerified', [])
    })

    return toNumber(totalBatchesVerified)-1;

}