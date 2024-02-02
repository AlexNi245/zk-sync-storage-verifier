import crypto from 'crypto';

export function verifyStorageProof(
  account: string,
  key: string,
  proof: string[],
  value: string,
  index: number,
  roothash: string,
): boolean {


  if (account.length !== 42) {
    throw new Error(`Wrong account length ${account.length} expected 42 (including 0x prefix)`);
  }

  const treeKey = Buffer.concat([
    Buffer.alloc(12, 0),
    Buffer.from(account.slice(2), 'hex'),
    Buffer.from(key.slice(2), 'hex')
  ]);

  if (treeKey.length !== 64) {
    throw new Error(`Wrong tree key length ${treeKey.length} expected 64`);
  }

  const treeKeyHash = crypto.createHash('blake2s256').update(treeKey).digest();


  let emptyHash = crypto.createHash('blake2s256').update(Buffer.alloc(40)).digest();

  const getEncodeValue = (index, value) => {
    // Convert the index to a buffer of 8 bytes in big-endian order
    const indexBuffer = Buffer.alloc(8);
    indexBuffer.writeBigUInt64BE(BigInt(index));

    // Remove the '0x' prefix from the value and convert to a buffer
    const valueBuffer = Buffer.from(value.slice(2), 'hex');

    // Concatenate the two buffers
    const encodedValue = Buffer.concat([indexBuffer, valueBuffer]);

    return encodedValue;
  }

  const encodedValue = getEncodeValue(index, value)

  console.log('get encoded value ', encodedValue.toString('hex'))

  
  if (encodedValue.length !== 40) {
    throw new Error(`Wrong encoded value length: ${encodedValue.length} - expected 40.`);
  }

  let valueHash = crypto.createHash('blake2s256').update(encodedValue).digest();

  let depth = 255;
  let currentHash = valueHash;
  let otherHash;

  for (let u64pos = 0; u64pos < treeKeyHash.length; u64pos += 8) {
    for (let i = 0; i < 64; i++) {
      const bit = getBit(treeKeyHash, i, u64pos);
      if (proof.length > depth) {
        otherHash = Buffer.from(proof[depth].slice(2), 'hex');
      } else {
        otherHash = emptyHash;
      }
      emptyHash = crypto.createHash('blake2s256').update(Buffer.concat([emptyHash, emptyHash])).digest();
      if (bit) {
        currentHash = crypto.createHash('blake2s256').update(Buffer.concat([otherHash, currentHash])).digest();
      } else {
        currentHash = crypto.createHash('blake2s256').update(Buffer.concat([currentHash, otherHash])).digest();
      }
      depth -= 1;
    }
  }

  const isValid = currentHash.toString('hex') === roothash.slice(2);

  if (!isValid) {
    throw new Error(`Root hash doesn't match - proof is wrong - comparing ${currentHash.toString('hex')} with ${roothash}`);
  }


  return isValid;
}

function getBit(buffer: Buffer, index: number, offset: number): bigint {
  const slice = buffer.slice(offset, offset + 8);
  const bn = slice.readBigUInt64LE(0);
  return (bn >> BigInt(index)) & BigInt(1);
}