import { Interface, JsonRpcProvider } from "ethers";
import { Provider, types } from "zksync-ethers";
import { getStoredBatchInfo } from "./verify/utils/getBatch";
require('dotenv').config()


export const play = async () => {
    const l1provider = new JsonRpcProvider(process.env.SEPOLIA_URL);
    const l2provider = Provider.getDefaultProvider(types.Network.Sepolia)!; // zkSync Era testnet (L2)




    const addr = '0x8D7E3CdC565d20E4738Abe16C143dA5C07C61E61';
    const slot = 1;
    //TBD calc batchnr based on status verified
    const batchNr = 5531;

    // const proof = await getStorageProof(l2provider, addr, [slot], batchNr);

    const batchInfo = await getStoredBatchInfo(l1provider, l2provider, batchNr)

    console.log("batchInfo", batchInfo)

}

//0x701f58c5 -> commit batches selector
const getStorage = async () => {
    const l1provider = new JsonRpcProvider(process.env.SEPOLIA_URL);

    const validatorTimelock = '0xeC534dB0f1B074D23445120aB386A9a4e5207f47'; //ValidatorTimelock 
    const dimondProxy = '0x9a6de0f62aa270a8bcb1e2610078650d539b1ef9'; //Diamond Proxy 
    const executorFacet = '0x801f3729fbb5859d94b867f813a22d85487bca2d'; //Diamond Proxy 
    const getterFacet = "0x10F328c20dD2469b7e88f374B9794471599c1c8D" //GetterFacet 

    const getterAbi = new Interface([
        'function getGovernor() external view returns (address)',
        'function getTotalBatchesVerified() external view returns (uint256)',
        'function storedBatchHash(uint256 _batchNumber) external view returns (bytes32)'
    ])

    const res = await l1provider.call({ to: dimondProxy, data: getterAbi.encodeFunctionData('storedBatchHash', [5531]) })

    console.log("l1 res", res)




}



play()
//getStorage()
