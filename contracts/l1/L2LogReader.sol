pragma solidity 0.8.20;

import {IExecutor, L2_LOG_ADDRESS_OFFSET, L2_LOG_KEY_OFFSET, L2_LOG_VALUE_OFFSET, SystemLogKey} from "@matterlabs/zksync-contracts-new/l1-contracts/contracts/zksync/interfaces/IExecutor.sol";
import {L2_BOOTLOADER_ADDRESS, L2_TO_L1_MESSENGER_SYSTEM_CONTRACT_ADDR, L2_SYSTEM_CONTEXT_SYSTEM_CONTRACT_ADDR} from "@matterlabs/zksync-contracts-new/l1-contracts/contracts/common/L2ContractAddresses.sol";
import {UnsafeBytes} from "@matterlabs/zksync-contracts-new/l1-contracts/contracts/common/libraries/UnsafeBytes.sol";
import {UncheckedMath} from "@matterlabs/zksync-contracts-new/l1-contracts/contracts/common/libraries/UncheckedMath.sol";

contract L2LogReader {
    using UncheckedMath for uint256;

    uint256 constant L2_TO_L1_LOG_SERIALIZE_SIZE = 88;

    /// @dev Check that L2 logs are proper and batch contain all meta information for them
    /// @dev The logs processed here should line up such that only one log for each key from the
    ///      SystemLogKey enum in Constants.sol is processed per new batch.
    /// @dev Data returned from here will be used to form the batch commitment.
    function _processL2Logs(
        IExecutor.CommitBatchInfo calldata _newBatch,
        bytes32 _expectedSystemContractUpgradeTxHash
    )
        public
        pure
        returns (
            uint256 numberOfLayer1Txs,
            bytes32 chainedPriorityTxsHash,
            bytes32 previousBatchHash,
            bytes32 stateDiffHash,
            bytes32 l2LogsTreeRoot,
            uint256 packedBatchAndL2BlockTimestamp
        )
    {
        // Copy L2 to L1 logs into memory.
        bytes memory emittedL2Logs = _newBatch.systemLogs;

        // Used as bitmap to set/check log processing happens exactly once.
        // See SystemLogKey enum in Constants.sol for ordering.
        uint256 processedLogs;

        bytes32 providedL2ToL1PubdataHash = keccak256(
            _newBatch.totalL2ToL1Pubdata
        );

        // linear traversal of the logs
        for (
            uint256 i = 0;
            i < emittedL2Logs.length;
            i = i.uncheckedAdd(L2_TO_L1_LOG_SERIALIZE_SIZE)
        ) {
            // Extract the values to be compared to/used such as the log sender, key, and value
            (address logSender, ) = UnsafeBytes.readAddress(
                emittedL2Logs,
                i + L2_LOG_ADDRESS_OFFSET
            );
            (uint256 logKey, ) = UnsafeBytes.readUint256(
                emittedL2Logs,
                i + L2_LOG_KEY_OFFSET
            );
            (bytes32 logValue, ) = UnsafeBytes.readBytes32(
                emittedL2Logs,
                i + L2_LOG_VALUE_OFFSET
            );

            // Ensure that the log hasn't been processed already
            require(!_checkBit(processedLogs, uint8(logKey)), "kp");
            processedLogs = _setBit(processedLogs, uint8(logKey));

            // Need to check that each log was sent by the correct address.
            if (logKey == uint256(SystemLogKey.L2_TO_L1_LOGS_TREE_ROOT_KEY)) {
                require(
                    logSender == L2_TO_L1_MESSENGER_SYSTEM_CONTRACT_ADDR,
                    "lm"
                );
                l2LogsTreeRoot = logValue;
            } else if (
                logKey == uint256(SystemLogKey.TOTAL_L2_TO_L1_PUBDATA_KEY)
            ) {
                require(
                    logSender == L2_TO_L1_MESSENGER_SYSTEM_CONTRACT_ADDR,
                    "ln"
                );
                require(providedL2ToL1PubdataHash == logValue, "wp");
            } else if (logKey == uint256(SystemLogKey.STATE_DIFF_HASH_KEY)) {
                require(
                    logSender == L2_TO_L1_MESSENGER_SYSTEM_CONTRACT_ADDR,
                    "lb"
                );
                stateDiffHash = logValue;
            } else if (
                logKey ==
                uint256(SystemLogKey.PACKED_BATCH_AND_L2_BLOCK_TIMESTAMP_KEY)
            ) {
                require(
                    logSender == L2_SYSTEM_CONTEXT_SYSTEM_CONTRACT_ADDR,
                    "sc"
                );
                packedBatchAndL2BlockTimestamp = uint256(logValue);
            } else if (logKey == uint256(SystemLogKey.PREV_BATCH_HASH_KEY)) {
                require(
                    logSender == L2_SYSTEM_CONTEXT_SYSTEM_CONTRACT_ADDR,
                    "sv"
                );
                previousBatchHash = logValue;
            } else if (
                logKey == uint256(SystemLogKey.CHAINED_PRIORITY_TXN_HASH_KEY)
            ) {
                require(logSender == L2_BOOTLOADER_ADDRESS, "bl");
                chainedPriorityTxsHash = logValue;
            } else if (
                logKey == uint256(SystemLogKey.NUMBER_OF_LAYER_1_TXS_KEY)
            ) {
                require(logSender == L2_BOOTLOADER_ADDRESS, "bk");
                numberOfLayer1Txs = uint256(logValue);
            } else if (
                logKey ==
                uint256(
                    SystemLogKey.EXPECTED_SYSTEM_CONTRACT_UPGRADE_TX_HASH_KEY
                )
            ) {
                require(logSender == L2_BOOTLOADER_ADDRESS, "bu");
                require(_expectedSystemContractUpgradeTxHash == logValue, "ut");
            } else {
                revert("ul");
            }
        }

        // We only require 7 logs to be checked, the 8th is if we are expecting a protocol upgrade
        // Without the protocol upgrade we expect 7 logs: 2^7 - 1 = 127
        // With the protocol upgrade we expect 8 logs: 2^8 - 1 = 255
        if (_expectedSystemContractUpgradeTxHash == bytes32(0)) {
            require(processedLogs == 127, "b7");
        } else {
            require(processedLogs == 255, "b8");
        }
    }

    /// @notice Returns true if the bit at index {_index} is 1
    function _checkBit(
        uint256 _bitMap,
        uint8 _index
    ) internal pure returns (bool) {
        return (_bitMap & (1 << _index)) > 0;
    }

    /// @notice Sets the given bit in {_num} at index {_index} to 1.
    function _setBit(
        uint256 _bitMap,
        uint8 _index
    ) internal pure returns (uint256) {
        return _bitMap | (1 << _index);
    }
}
