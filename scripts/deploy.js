const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts to Sepolia testnet...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy EnergyToken
  console.log("\nDeploying EnergyToken...");
  const EnergyToken = await ethers.getContractFactory("EnergyToken");
  const energyToken = await EnergyToken.deploy();
  await energyToken.waitForDeployment();
  const energyTokenAddress = await energyToken.getAddress();
  console.log("EnergyToken deployed to:", energyTokenAddress);

  // Deploy Marketplace
  console.log("\nDeploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(energyTokenAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);

  // Output contract addresses for environment variables
  console.log("\n=== Contract Deployment Summary ===");
  console.log("EnergyToken Address:", energyTokenAddress);
  console.log("Marketplace Address:", marketplaceAddress);
  
  console.log("\n=== Environment Variables ===");
  console.log(`ENERGY_TOKEN_ADDRESS=${energyTokenAddress}`);
  console.log(`MARKETPLACE_ADDRESS=${marketplaceAddress}`);

  // Verify contracts (optional)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for block confirmations...");
    await energyToken.deploymentTransaction().wait(6);
    
    console.log("Verifying EnergyToken...");
    try {
      await hre.run("verify:verify", {
        address: energyTokenAddress,
        constructorArguments: [],
      });
    } catch (error) {
      console.log("EnergyToken verification failed:", error.message);
    }

    console.log("Verifying Marketplace...");
    try {
      await hre.run("verify:verify", {
        address: marketplaceAddress,
        constructorArguments: [energyTokenAddress],
      });
    } catch (error) {
      console.log("Marketplace verification failed:", error.message);
    }
  }

  console.log("\nDeployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
