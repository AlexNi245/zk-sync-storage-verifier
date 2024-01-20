import { Provider } from "zksync-ethers";
import { hexZeroPad, arrayify, hexlify } from '@ethersproject/bytes';
import blake from "blakejs";




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
export const getStorageProof = async (provider: Provider, addr: string, slots: number[], batchNr: number): Promise<StorageProofResponse> => {

    const paddedSlots = slots.map((slot) => {
        return hexZeroPad(hexlify(arrayify(slot)), 32);
    })
    return await provider.send("zks_getProof", [addr, paddedSlots, batchNr]);

}

function computeStorageKey(account: string, key: string): string {
    // Ensure the account and key are without the '0x' prefix and are of correct length
    const accountWithoutPrefix = account.startsWith('0x') ? account.slice(2) : account;
    const keyWithoutPrefix = key.startsWith('0x') ? key.slice(2) : key;

    if (accountWithoutPrefix.length !== 40) {
        throw new Error('Account must be a 20-byte address in hex format.');
    }

    if (keyWithoutPrefix.length !== 64) {
        throw new Error('Key must be a 32-byte number in hex format.');
    }

    // Concatenate the account and key to form the tree key
    const treeKey = Buffer.concat([
        Buffer.alloc(12, 0), // 12-byte padding
        Buffer.from(accountWithoutPrefix, 'hex'),
        Buffer.from(keyWithoutPrefix, 'hex')
    ]);

    if (treeKey.length !== 64) {
        throw new Error('Internal error: Computed tree key is not 64 bytes long.');
    }

    // Hash the tree key using blake2s
    const treeKeyHash = computeBlake2s256(treeKey);

    return treeKeyHash;
}

function computeBlake2s256(input) {
    // Ensure the input is a Buffer or Uint8Array
    const inputBuffer = Buffer.from(input);

    // Compute the BLAKE2s hash
    const hash = blake.blake2s(inputBuffer, null, 32); // 32 bytes for blake2s256

    // Convert the hash (which is a Uint8Array) to a hex string
    const hashHex = Buffer.from(hash).toString('hex');

    return hashHex;
}