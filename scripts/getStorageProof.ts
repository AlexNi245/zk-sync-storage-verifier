import { arrayify, hexZeroPad, hexlify } from '@ethersproject/bytes';
import { ethers } from "ethers";




// Define the structure of the individual storage proof based on the provided documentation
interface StorageProof {
    key: string;    // H256 format implies a string representing a 32-byte hex value
    value: string;  // Same as above for the storage value
    index: number;  // u64, a number in JavaScript can safely represent it
    proof: string[]; // Array of H256 hashes
}

// Define the structure of the response containing the address and storage proofs
interface StorageProofResponse {
    address: string;               // Account address
    storageProof: StorageProof[];  // Array of storage proofs for each requested key
}
export const getStorageProof = async (provider: ethers.JsonRpcProvider, addr: string, slots: number[], batchNr: number): Promise<StorageProofResponse> => {
    const paddedSlots = slots.map((slot) => {
        return hexZeroPad(hexlify(arrayify(slot)), 32);
    })
    return await provider.send("zks_getProof", [addr, paddedSlots, batchNr]);

}

