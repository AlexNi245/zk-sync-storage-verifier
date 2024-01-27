pragma solidity 0.8.20;

import "hardhat/console.sol";

contract Blake2sNew {
  /*
    see https://www.rfc-editor.org/rfc/rfc7693.txt
    */ uint32[8] public IV = [
    0x6A09E667,
    0xBB67AE85,
    0x3C6EF372,
    0xA54FF53A,
    0x510E527F,
    0x9B05688C,
    0x1F83D9AB,
    0x5BE0CD19
  ];

  uint32 constant MASK_0 = 0xFF000000;
  uint32 constant MASK_1 = 0x00FF0000;
  uint32 constant MASK_2 = 0x0000FF00;
  uint32 constant MASK_3 = 0x000000FF;

  uint32 constant SHIFT_0 = 24;
  uint32 constant SHIFT_1 = 16;
  uint32 constant SHIFT_2 = 8;

  struct BLAKE2s_ctx {
    uint256[2] b; // Input buffer: 2 elements of 32 bytes each to make up 64 bytes
    uint32[8] h; // Chained state: 8 words of 32 bits each
    uint64 t; // Total number of bytes
    uint32 c; // Counter for buffer, indicates how much is filled
    uint32 outlen; // Digest output size
  }

  function blake2s(bytes memory input, bytes memory key, uint32 outlen) public view returns (uint32[8] memory) {
    return blake2s(input, key, "", "", outlen);
  }

  function blake2s(
    bytes memory input,
    bytes memory key,
    bytes memory salt,
    bytes memory personalization,
    uint32 outlen
  ) public view returns (uint32[8] memory) {
    BLAKE2s_ctx memory ctx;
    uint32[8] memory out;
    init(ctx, outlen, key, formatInput(salt), formatInput(personalization));
    update(ctx, input);
    finalize(ctx, out);

    return out;
  }

  function uint32ArrayToBytes32(uint32[8] memory input) internal pure returns (bytes32 result) {
    for (uint i = 0; i < input.length; i++) {
      result = bytes32(uint256(result) | (uint256(input[i]) << (256 - ((i + 1) * 32))));
    }
  }

  function blake2sFormatted(bytes memory input, bytes memory key, uint32 outlen) public view returns (bytes32) {
    return uint32ArrayToBytes32(blake2s(input, key, "", "", outlen));
  }

  function init(
    BLAKE2s_ctx memory ctx,
    uint32 outlen,
    bytes memory key,
    uint32[2] memory salt,
    uint32[2] memory person
  ) internal view {
    if (outlen == 0 || outlen > 32 || key.length > 32) revert("outlen");

    // Initialize chained-state to IV
    for (uint i = 0; i < 8; i++) {
      ctx.h[i] = IV[i];
    }

    // Set up parameter block
    ctx.h[0] = ctx.h[0] ^ 0x01010000 ^ (uint32(key.length) << 8) ^ outlen;

    if (salt.length == 2) {
      ctx.h[4] = ctx.h[4] ^ salt[0];
      ctx.h[5] = ctx.h[5] ^ salt[1];
    }

    if (person.length == 2) {
      ctx.h[6] = ctx.h[6] ^ person[0];
      ctx.h[7] = ctx.h[7] ^ person[1];
    }

    ctx.outlen = outlen;

    // Run hash once with key as input if the key is provided
    if (key.length > 0) {
      // Padding the key to block size (64 bytes)
      bytes memory paddedKey = new bytes(64);
      for (uint i = 0; i < key.length; i++) {
        paddedKey[i] = key[i];
      }

      update(ctx, paddedKey);
      ctx.c = 64; // BLAKE2s block size is 64 bytes
    }
  }

  function update(BLAKE2s_ctx memory ctx, bytes memory input) internal view {
    for (uint i = 0; i < input.length; i++) {
      // If buffer is full, update byte counters and compress
      if (ctx.c == 64) {
        // BLAKE2s block size is 64 bytes
        ctx.t += ctx.c; // Increment counter t by the number of bytes in the buffer
        compress(ctx, false);
        ctx.c = 0; // Reset buffer counter after compressing
      }
      //Update temporary counter c
      uint c = ctx.c++;

      // b -> ctx.b
      uint[2] memory b = ctx.b;
      uint8 a = uint8(input[i]);

      uint pointer;
      uint offset;
      assembly {
        mstore8(add(b, c), a)
        pointer := mload(add(b, c))
      }
      // console.log("pointer: %s", pointer);
      // console.log("offset: %s", offset);
    }
  }

  function compress(BLAKE2s_ctx memory ctx, bool last) internal view {
    uint32[16] memory v;
    uint32[16] memory m;

    // Initialize v[0..15]
    for (uint i = 0; i < 8; i++) {
      v[i] = ctx.h[i]; // First half from the state
      v[i + 8] = IV[i]; // Second half from the IV
    }

    // Low 64 bits of t
    v[12] = v[12] ^ uint32(ctx.t & 0xFFFFFFFF);
    // High 64 bits of t (BLAKE2s uses only 32 bits for t[1], so this is often zeroed)
    v[13] = v[13] ^ uint32(ctx.t >> 32);

    // Set the last block flag if this is the last block
    if (last) {
      v[14] = ~v[14];
    }

    for (uint i = 0; i < 16; i++) {
      uint256 slice = ctx.b[i / 8];
      uint32 firstByte = uint32(slice >> (256 - (((i + 1) * 32) % 256)));
      m[i] = getWords32(firstByte);
    }

    uint8[16][10] memory sigma = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
      [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
      [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
      [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
      [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
      [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
      [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
      [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
      [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]
    ];

    // Mix the message block according to the BLAKE2s schedule

    for (uint round = 0; round < 10; round++) {
      G(v, 0, 4, 8, 12, m[sigma[round][0]], m[sigma[round][1]]);
      G(v, 1, 5, 9, 13, m[sigma[round][2]], m[sigma[round][3]]);
      G(v, 2, 6, 10, 14, m[sigma[round][4]], m[sigma[round][5]]);
      G(v, 3, 7, 11, 15, m[sigma[round][6]], m[sigma[round][7]]);
      G(v, 0, 5, 10, 15, m[sigma[round][8]], m[sigma[round][9]]);
      G(v, 1, 6, 11, 12, m[sigma[round][10]], m[sigma[round][11]]);
      G(v, 2, 7, 8, 13, m[sigma[round][12]], m[sigma[round][13]]);
      G(v, 3, 4, 9, 14, m[sigma[round][14]], m[sigma[round][15]]);
    }

    // Update the state with the result of the G mixing operations
    for (uint i = 0; i < 8; i++) {
      ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 8];
    }
  }

  function load32(uint32 p) internal pure returns (uint32) {
    uint32 b0 = p & 0xFF;
    uint32 b1 = (p >> 8) & 0xFF;
    uint32 b2 = (p >> 16) & 0xFF;
    uint32 b3 = (p >> 24) & 0xFF;

    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24));
  }

  function finalize(BLAKE2s_ctx memory ctx, uint32[8] memory out) internal view {
    // Add any uncounted bytes
    ctx.t += ctx.c;

    // Compress with finalization flag
    compress(ctx, true);

    console.log("pre finalized SOL ");
    // Flip little to big endian and store in output buffer
    for (uint i = 0; i < ctx.outlen / 4; i++) {
      out[i] = getWords32(ctx.h[i]);
    }
    // Properly pad output if it doesn't fill a full word
    if (ctx.outlen % 4 != 0) {
      out[ctx.outlen / 4] = shift_right32(getWords32(ctx.h[ctx.outlen / 4]), 32 - 8 * (ctx.outlen % 4));
    }
  }

  // Helper function to flip endianness of 32-bit words
  function getWords32(uint32 a) internal pure returns (uint32 b) {
    return (a >> 24) | ((a >> 8) & 0x0000FF00) | ((a << 8) & 0x00FF0000) | (a << 24);
  }

  // Helper function to u right a 32-bit word
  function shift_right32(uint32 a, uint shift) internal pure returns (uint32) {
    return a >> shift;
  }

  function formatInput(bytes memory input) internal pure returns (uint32[2] memory output) {
    require(input.length <= 8, "Input too long");
    for (uint i = 0; i < input.length; i++) {
      output[i / 4] ^= (uint32(uint8(input[i])) << (24 - 8 * (i % 4)));
    }
    output[0] = flipEndian(output[0]);
    output[1] = flipEndian(output[1]);
  }

  // Helper function to flip endianness of 32-bit words
  function flipEndian(uint32 input) internal pure returns (uint32) {
    return
      ((input & 0xFF000000) >> 24) |
      ((input & 0x00FF0000) >> 8) |
      ((input & 0x0000FF00) << 8) |
      ((input & 0x000000FF) << 24);
  }

  function ROTR32(uint32 x, uint8 n) internal pure returns (uint32) {
    return (x >> n) | (x << (32 - n));
  }

  function G(uint32[16] memory v, uint a, uint b, uint c, uint d, uint32 x, uint32 y) internal pure {
    unchecked {
      v[a] = v[a] + v[b] + x;
      v[d] = ROTR32(v[d] ^ v[a], 16);
      v[c] = v[c] + v[d];
      v[b] = ROTR32(v[b] ^ v[c], 12);
      v[a] = v[a] + v[b] + y;
      v[d] = ROTR32(v[d] ^ v[a], 8);
      v[c] = v[c] + v[d];
      v[b] = ROTR32(v[b] ^ v[c], 7);
    }
  }

  function _G(uint32[16] memory v, uint a, uint b, uint c, uint d, uint32 x, uint32 y) private pure {
    //    v[a] = v[a] + v[b] + x;         \
    //    v[d] = ROTR32(v[d] ^ v[a], 16); \
    //    v[c] = v[c] + v[d];             \
    //    v[b] = ROTR32(v[b] ^ v[c], 12); \
    //    v[a] = v[a] + v[b] + y;         \
    //    v[d] = ROTR32(v[d] ^ v[a], 8);  \
    //    v[c] = v[c] + v[d];             \
    //    v[b] = ROTR32(v[b] ^ v[c], 7); }
    // Dereference to decrease memory reads
    uint32 va = v[a];
    uint32 vb = v[b];
    uint32 vc = v[c];
    uint32 vd = v[d];

    // Optimised mixing function
    assembly {
      // v[a] := (v[a] + v[b] + x) mod 2**32
      va := addmod(add(va, vb), x, 0x100000000)
      // v[d] := (v[d] ^ v[a]) >>> 16
      vd := xor(shr(16, xor(vd, va)), shl(16, xor(vd, va)))
      // v[c] := (v[c] + v[d]) mod 2**32
      vc := addmod(vc, vd, 0x100000000)
      // v[b] := (v[b] ^ v[c]) >>> 12
      vb := xor(shr(12, xor(vb, vc)), shl(20, xor(vb, vc)))
      // v[a] := (v[a] + v[b] + y) mod 2**32
      va := addmod(add(va, vb), y, 0x100000000)
      // v[d] := (v[d] ^ v[a]) >>> 8
      vd := xor(shr(8, xor(vd, va)), shl(24, xor(vd, va)))
      // v[c] := (v[c] + v[d]) mod 2**32
      vc := addmod(vc, vd, 0x100000000)
      // v[b] := (v[b] ^ v[c]) >>> 7
      vb := xor(shr(7, xor(vb, vc)), shl(25, xor(vb, vc)))
    }

    v[a] = va;
    console.log("va: %s", va);
    v[b] = vb;
    v[c] = vc;
    v[d] = vd;
  }

  function formatOutput(uint32[8] memory input) public pure returns (bytes32[2] memory result) {
    // Each bytes32 will contain 4 uint32 words
    for (uint i = 0; i < 8; i++) {
      // Shift left by 32 bits for each word to pack them into bytes32
      result[i / 4] |= bytes32(uint256(input[i])) << (8 * (4 * (i % 4) + 3));
    }
    return result;
  }

  // ... rest of your contract ...

  function dumpState(BLAKE2s_ctx memory ctx) public view {
    // Dump the input buffer
    for (uint i = 0; i < ctx.b.length; i++) {
      console.log("b[%d]: %s", i, uint256(ctx.b[i]));
    }

    // Dump the chained state
    for (uint i = 0; i < ctx.h.length; i++) {
      console.log("h[%d]: %s", i, uint32(ctx.h[i]));
    }

    // Dump the total number of bytes
    console.log("t: %s", uint64(ctx.t));

    // Dump the counter for buffer
    console.log("c: %s", uint32(ctx.c));

    // Dump the digest output size
    console.log("outlen: %s", uint32(ctx.outlen));
  }

  function dumpH(uint32[8] memory h) public view {
    for (uint i = 0; i < h.length; i++) {
      console.log("h[%d]: %s", i, h[i]);
    }
  }

  // ... rest of your contract ...

  function dumpVM(uint32[16] memory v, uint32[16] memory m) public view {
    // Dump the v array
    for (uint i = 0; i < v.length; i++) {
      console.log("v[%d]: %s", i, v[i]);
    }

    // Dump the m array
    for (uint i = 0; i < m.length; i++) {
      console.log("m[%d]: %s", i, m[i]);
    }
  }
}
