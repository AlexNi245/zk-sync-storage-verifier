pragma solidity 0.8.20;

import "hardhat/console.sol";

contract Blake2s {
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
  struct Blake2sState {
    uint32[8] h; //state vector
    uint32[2] t; //total bytes
    uint32[2] f; // ??
    bytes buf; //input buffer
    uint256 buflen; //buffer length
    uint outlen; //digest size
    bool last_node;
  }

  struct Blake2sParam {
    uint8 digest_length; // 1
    uint8 key_length; // 2
    uint8 fanout; // 3
    uint8 depth; // 4
    uint32 leaf_length; // 8
    uint32 node_offset; // 12
    uint16 xof_length; // 14
    uint8 node_depth; // 15
    uint8 inner_length; // 16
    // uint8 reserved[0]; // In Solidity, we don't define empty reserved space
    bytes salt; // 24
    bytes personal; // 32
  }
  uint8 private constant BLAKE2S_BLOCKBYTES = 64;
  uint8 private constant BLAKE2S_OUTBYTES = 32;
  uint8 private constant BLAKE2S_KEYBYTES = 32;
  uint8 private constant BLAKE2S_SALTBYTES = 8;
  uint8 private constant BLAKE2S_PERSONALBYTES = 8;

  uint32 constant MASK_0 = 0xFF000000;
  uint32 constant MASK_1 = 0x00FF0000;
  uint32 constant MASK_2 = 0x0000FF00;
  uint32 constant MASK_3 = 0x000000FF;

  uint32 constant SHIFT_0 = 0x01000000;
  uint32 constant SHIFT_1 = 0x00010000;
  uint32 constant SHIFT_2 = 0x00000100;
  uint32 constant SHIFT_3 = 0x00000001;

  function hash(bytes memory input, bytes memory key, uint32 outlen) public returns (uint32[8] memory) {
    return blake2s(input, key, "", "", outlen);
  }

  function blake2s(
    bytes memory input,
    bytes memory key,
    bytes memory salt,
    bytes memory personalization,
    uint32 outlen
  ) public returns (uint32[8] memory) {
    Blake2sState memory state;
    uint32[8] memory out;
    init(state, outlen, key, formatInput(salt), formatInput(personalization));
    update(state, input);

    finalize(state, out);
    return out;
  }

  function init(
    Blake2sState memory state,
    uint32 outlen,
    bytes memory key,
    uint32[2] memory salt,
    uint32[2] memory person
  ) internal {
    require(
      (outlen == 0 || outlen > BLAKE2S_OUTBYTES || key.length > BLAKE2S_OUTBYTES),
      "invalid outlen or key length"
    );

    //Copy IV to state
    for (uint i = 0; i < 8; i++) {
      state.h[i] = IV[i];
    }

    // Set up parameter block
    state.h[0] = state.h[0] ^ 0x01010000 ^ (uint32(key.length) << 8) ^ outlen;
    state.h[4] = state.h[4] ^ salt[0];
    state.h[5] = state.h[5] ^ salt[1];
    state.h[6] = state.h[6] ^ person[0];
    state.h[7] = state.h[7] ^ person[1];

    state.outlen = outlen;
    //    i = key.length;

    //Run hash once with key as input
    if (key.length > 0) {
      update(state, key);
      //state.c = 128;
      state.buflen = 64;
    }
  }

  function update(Blake2sState memory state, bytes memory input) internal {
    uint inputLength = input.length;
    uint offset = 0;
    console.log("il");
    console.log(inputLength);

    // If there is leftover data in the state's buffer, fill it until a full block is formed
    if (inputLength > 0) {
      uint left = state.buflen;
      uint fill = BLAKE2S_BLOCKBYTES - left;
      console.log("lcheck1");

      if (inputLength > fill) {
        console.log("lcheck2");
        // Copy from input to buffer to fill it
        for (uint i = 0; i < fill; ++i) {
          console.log("lcheck3");
          state.buf[left + i] = input[offset + i];
        }
        console.log("lcheck4");
        incrementCounter(state, BLAKE2S_BLOCKBYTES);
        compress(state, false);
        offset += fill;
        inputLength -= fill;
        state.buflen = 0;

        // Process the remaining input in BLAKE2S_BLOCKBYTES chunks
        while (inputLength > BLAKE2S_BLOCKBYTES) {
          incrementCounter(state, BLAKE2S_BLOCKBYTES);
          // Here you would call compress with the next BLAKE2S_BLOCKBYTES chunk of input
          // Since Solidity doesn't support direct memory block copying, you'd need to handle this differently
          for (uint i = 0; i < BLAKE2S_BLOCKBYTES; ++i) {
            state.buf[i] = input[offset + i];
          }
          compress(state, false);
          offset += BLAKE2S_BLOCKBYTES;
          inputLength -= BLAKE2S_BLOCKBYTES;
        }
      }

      // Copy remaining input to buffer
      for (uint i = 0; i < inputLength; ++i) {
        state.buf[state.buflen + i] = input[offset + i];
      }
      state.buflen += inputLength;
    }
  }

  function compress(Blake2sState memory state, bool last) internal {
    uint32[16] memory m;
    uint32[16] memory v;

    // Load the input block into m
    for (uint i = 0; i < 16; ++i) {
      m[i] = load32(state.buf, i * 4);
    }

    // Initialize v[0..7] with the current hash state
    for (uint i = 0; i < 8; ++i) {
      v[i] = state.h[i];
    }

    // Initialize v[8..15] with the IV, including the XOR with the total bytes and finalization flag
    for (uint i = 0; i < 4; ++i) {
      v[i + 8] = IV[i];
    }
    v[12] = state.t[0] ^ IV[4];
    v[13] = state.t[1] ^ IV[5];
    v[14] = state.f[0] ^ IV[6];
    v[15] = state.f[1] ^ IV[7];

    uint8[16][10] memory SIGMA = [
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

    // BLAKE2s compression function main loop
    for (uint i = 0; i < 10; i++) {
      // Ten rounds
      // Mix the message into the state with the G function
      G(v, m, SIGMA, i, 0, 0, 4, 8, 12);
    }

    // Finalize the state by XORing the two halves of v and the current state
    for (uint i = 0; i < 8; i++) {
      state.h[i] = state.h[i] ^ v[i] ^ v[i + 8];
    }
  }

  // Helper function to load 32-bit words from the input buffer
  function load32(bytes memory input, uint index) private pure returns (uint32) {
    return
      uint32(uint8(input[index])) |
      (uint32(uint8(input[index + 1])) << 8) |
      (uint32(uint8(input[index + 2])) << 16) |
      (uint32(uint8(input[index + 3])) << 24);
  }

  function finalize(Blake2sState memory state, uint32[8] memory out) internal {
    // Add any uncounted bytes
    incrementCounter(state, uint32(state.buflen));

    // Set the finalization flag
    state.f[0] = 0xFFFFFFFF;

    // Padding
    for (uint i = state.buflen; i < BLAKE2S_BLOCKBYTES; ++i) {
      console.logBytes(state.buf);

      state.buf[i] = 0;
    }

    // Compress with finalization flag
    compress(state, true);

    // Output full hash to out array
    for (uint i = 0; i < state.outlen / 4; i++) {
      out[i] = fromLittleEndian32(state.h[i]);
    }

    // Handle the case where the output length is not a multiple of 4
    if (state.outlen % 4 != 0) {
      uint32 lastWord = fromLittleEndian32(state.h[state.outlen / 4]);
      uint remainingBytes = state.outlen % 4;
      // Shift to get only the relevant bytes
      lastWord >>= (32 - remainingBytes * 8);
      // Store the bytes into the last element of the out array
      // Cast the left-hand side to uint32 before applying the &= operator
      // Correctly cast and apply bitwise operations
      out[state.outlen / 4] = uint32(out[state.outlen / 4]) & ~(uint32(0xFFFFFFFF) << (remainingBytes * 8));
      out[state.outlen / 4] |= lastWord;
      out[state.outlen / 4] |= lastWord;
      out[state.outlen / 4] |= lastWord;
    }
  }

  // Helper function to convert from little endian to big endian
  function fromLittleEndian32(uint32 value) private pure returns (uint32) {
    return ((value & 0xFF) << 24) | ((value & 0xFF00) << 8) | ((value & 0xFF0000) >> 8) | ((value >> 24) & 0xFF);
  }

  // Helper function to increment the counter
  function incrementCounter(Blake2sState memory state, uint32 amount) private pure {
    state.t[0] += amount;
    if (state.t[0] < amount) {
      state.t[1]++;
    }
  }

  function G(
    uint32[16] memory v,
    uint32[16] memory m,
    uint8[16][10] memory sigma, // This is the permutation array
    uint r, // Current round
    uint i, // Current index
    uint a,
    uint b,
    uint c,
    uint d
  ) internal pure {
    v[a] = v[a] + v[b] + m[sigma[r][2 * i]];
    v[d] = rotr32(v[d] ^ v[a], 16);
    v[c] = v[c] + v[d];
    v[b] = rotr32(v[b] ^ v[c], 12);
    v[a] = v[a] + v[b] + m[sigma[r][2 * i + 1]];
    v[d] = rotr32(v[d] ^ v[a], 8);
    v[c] = v[c] + v[d];
    v[b] = rotr32(v[b] ^ v[c], 7);
  }

  // Rotate right function
  function rotr32(uint32 x, uint8 n) internal pure returns (uint32) {
    return (x >> n) | (x << (32 - n));
  }

  function getWords(uint32 a) private returns (uint32 b) {
    return ((a & MASK_0) / SHIFT_0) ^ ((a & MASK_1) / SHIFT_1) ^ ((a & MASK_2) / SHIFT_2) ^ ((a & MASK_3) * SHIFT_1);
  }

  function formatInput(bytes memory input) private returns (uint32[2] memory output) {
    require(input.length <= 8, "Input too long");
    for (uint i = 0; i < input.length; i++) {
      output[i / 4] ^= uint32(uint8(input[i])) << (8 * (3 - (i % 4)));
    }
    output[0] = getWords(output[0]);
    output[1] = getWords(output[1]);
    return output;
  }
}
