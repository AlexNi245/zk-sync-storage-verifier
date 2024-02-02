pragma solidity ^0.8.20;

import "hardhat/console.sol";

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
    StorageProof calldata proof
  ) external view returns (bytes memory resulut) {
    bytes memory encodedValue = getEncodedValue();
    return encodedValue;
  }

  function getEncodedValue() private pure returns (bytes memory result) {
    result = new bytes(40);

    assembly {
      mstore(add(result, 0x20), or(shl(48, calldataload(0x96)), shr(64, calldataload(0x64))))
      mstore(add(result, 0x40), shl(192, calldataload(0x64)))
    }
  }
}
