const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("Starting deployment to", hre.network.name, "network...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Get account balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Deploy EnergyCredit Token
    console.log("Deploying EnergyCredit token...");
    const initialSupply = 1000000; // 1 million tokens initial supply

    const EnergyCredit = await ethers.getContractFactory("EnergyCredit");
    const energyCredit = await EnergyCredit.deploy(initialSupply);
    await energyCredit.waitForDeployment();

    const energyCreditAddress = await energyCredit.getAddress();
    console.log("✅ EnergyCredit deployed to:", energyCreditAddress);

    // Deploy EnergyMarketplace
    console.log("\nDeploying EnergyMarketplace...");
    const EnergyMarketplace = await ethers.getContractFactory("EnergyMarketplace");
    const energyMarketplace = await EnergyMarketplace.deploy(energyCreditAddress);
    await energyMarketplace.waitForDeployment();

    const marketplaceAddress = await energyMarketplace.getAddress();
    console.log("✅ EnergyMarketplace deployed to:", marketplaceAddress);

    // Optional: Transfer ownership of token to marketplace for minting
    // Uncomment if you want marketplace to control token minting
    // console.log("\nTransferring EnergyCredit ownership to marketplace...");
    // await energyCredit.transferOwnership(marketplaceAddress);
    // console.log("✅ Ownership transferred");

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("EnergyCredit (ENGC):", energyCreditAddress);
    console.log("EnergyMarketplace:", marketplaceAddress);
    console.log("Initial Token Supply:", initialSupply, "ENGC");
    console.log("=".repeat(60));

    // Save deployment addresses to a file
    const fs = require("fs");
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        contracts: {
            EnergyCredit: energyCreditAddress,
            EnergyMarketplace: marketplaceAddress
        },
        timestamp: new Date().toISOString(),
        initialSupply: initialSupply
    };

    const deploymentsDir = "./deployments";
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const filename = `${deploymentsDir}/${hre.network.name}-deployment.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📝 Deployment info saved to:", filename);

    // Verification instructions
    if (hre.network.name === "sepolia") {
        console.log("\n" + "=".repeat(60));
        console.log("VERIFICATION COMMANDS (run after deployment)");
        console.log("=".repeat(60));
        console.log("\nVerify EnergyCredit:");
        console.log(`npx hardhat verify --network sepolia ${energyCreditAddress} ${initialSupply}`);
        console.log("\nVerify EnergyMarketplace:");
        console.log(`npx hardhat verify --network sepolia ${marketplaceAddress} ${energyCreditAddress}`);
        console.log("=".repeat(60));
    }

    console.log("\n✨ Deployment completed successfully!\n");
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });
