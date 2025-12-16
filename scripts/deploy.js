const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const SkinsNFT = await hre.ethers.getContractFactory("SkinsNFT");
  const skinsNFT = await SkinsNFT.deploy(deployer.address);

  await skinsNFT.waitForDeployment();
  const address = await skinsNFT.getAddress();

  console.log("SkinsNFT deployed to:", address);
  console.log("\nAdd this to your .env file:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


