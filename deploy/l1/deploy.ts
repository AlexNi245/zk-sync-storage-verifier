import { ethers } from 'hardhat';

async function main() {
  // Get the ContractFactory and Signer
  const ZkSyncStorageVerifier = await ethers.getContractFactory('BLAKE2b');
  const signer = (await ethers.getSigners())[0];

  // Deploy the contract
  const zkSyncStorageVerifier = await ZkSyncStorageVerifier.connect(signer).deploy();

  // Wait for the contract to be deployed
  await zkSyncStorageVerifier.waitForDeployment();

  console.log('ZkSyncStorageVerifier deployed to:', zkSyncStorageVerifier.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });