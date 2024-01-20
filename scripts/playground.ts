import { Provider, types, utils, } from "zksync-ethers";
import { JsonRpcProvider, ZeroHash, hexlify, toUtf8Bytes } from "ethers";
import { getStorageProof } from "./getStorageProof";
import { verifyStorageProof } from "./verify/verifyStorageProof";
import { getBatchRootHash } from "./verify/utils/getBatchRootHash";



export const play = async () => {

    const l1provider = new JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/xcO2SGAbW2ChIMF7GcU6vc35hcHVTjRJ");
    const l2provider = Provider.getDefaultProvider(types.Network.Sepolia)!; // zkSync Era testnet (L2)




    const addr = '0x8D7E3CdC565d20E4738Abe16C143dA5C07C61E61';
    const slot = 1;
    const batchNr = 5531;

    const proof = await getStorageProof(l2provider, addr, [slot], batchNr);


    const slotProof = proof.storageProof[0];
    const rootHash = await getBatchRootHash(l1provider, l2provider, batchNr);

    const isValid = await verifyStorageProof(addr, slotProof.key, slotProof.proof, slotProof.value, slotProof.index, rootHash);

    console.log(isValid)



}


play()