pragma solidity ^0.8.20;

import "hardhat/console.sol";
import {Blake2s} from "blake2s-solidity/contracts/Blake2s.sol";

contract ZkSyncStorageVerifier {
  // Solidity equivalent of the StorageProof TypeScript interface
  struct StorageProof {
    bytes32 key;
    bytes32 value;
    uint64 index;
    bytes32[] proof;
  }

  function verifyStorageProof(
    address contractAddress,
    StorageProof calldata proof,
    bytes32 roothash 
  ) external view returns (bool) {
    bytes32 treeKeyHash = Blake2s.toBytes32(getTreeKey(contractAddress, proof.key));
    bytes32 emptyHash = Blake2s.toBytes32(new bytes(40));
    bytes32 valueHash = Blake2s.toBytes32(getEncodedValue());

    uint256 depth = 255;
    bytes32 otherHash;
    bytes32 currentHash = valueHash;

    for (uint256 u64pos = 0; u64pos < 32; u64pos += 8) {
      // treeKeyHash.length is always 32 bytes
      for (uint256 i = 0; i < 64; i++) {
        // 256 bits in a bytes32
        uint256 bit = getBit(treeKeyHash, i, u64pos); // Assuming key is the treeKeyHash

        if (proof.proof.length > depth) {
          otherHash = bytes32(proof.proof[depth]);
        } else {
          otherHash = emptyHash;
        }
        emptyHash = Blake2s.toBytes32(abi.encodePacked(emptyHash, emptyHash));
        if (bit != 0) {
          currentHash = Blake2s.toBytes32(abi.encodePacked(otherHash, currentHash));
        } else {
          currentHash = Blake2s.toBytes32(abi.encodePacked(currentHash, otherHash));
        }

    console.logBytes32(currentHash);
        if(depth == 0){
          break;
        }
        depth -= 1;
      }
    }
    console.log('---');
    console.logBytes32(roothash);
    return currentHash == roothash ;
  }

  function getBit(bytes32 data, uint256 index, uint256 offset) public pure returns (uint256) {
        require(offset < 32, "Offset out of bounds");

        // Calculate the byte index from the offset and index, considering little-endian order
        uint256 byteIndex = offset + (index / 8);
        uint256 bitIndex = index % 8;

        // Extract the byte from the bytes32 value
        uint256 byteVal = uint256(uint8(data[byteIndex]));

        // Isolate the bit at the bitIndex position
        uint256 bit = (byteVal >> bitIndex) & 1;

        return bit;
    }

  function getEncodedValue() private pure returns (bytes memory encodedValue) {
    encodedValue = new bytes(40);

    assembly {
      //The first 8 bytes of slot 1 are containing the index followed by 24 bytes of the value
      mstore(add(encodedValue, 0x20), or(shl(64, calldataload(0x94)), shr(64, calldataload(0x64))))
      //The second slot is containing the last 8 bytes of the value
      mstore(add(encodedValue, 0x40), shl(192, calldataload(0x64)))
    }
  }

  function getTreeKey(address contractAddress, bytes32 key) public pure returns (bytes memory treeKey) {
    treeKey = new bytes(64);
    assembly {
      //The first slot contains the contract address
      mstore(add(treeKey, 0x20), contractAddress)
      //The second slot contains the key
      mstore(add(treeKey, 0x40), key)
    }
  }
}
