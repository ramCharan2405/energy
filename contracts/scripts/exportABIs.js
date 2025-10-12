/**
 * Contract ABIs Exporter
 * 
 * This script exports the compiled contract ABIs and addresses
 * for use in the frontend application
 * 
 * Run after deployment: node scripts/exportABIs.js
 */

const fs = require("fs");
const path = require("path");

function exportABIs() {
    console.log("📦 Exporting contract ABIs for frontend...\n");

    // Paths
    const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
    const exportDir = path.join(__dirname, "..", "exports");

    // Create export directory if it doesn't exist
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }

    // Contract names and their paths
    const contracts = [
        {
            name: "EnergyCredit",
            path: path.join(artifactsDir, "EnergyCredit.sol", "EnergyCredit.json")
        },
        {
            name: "EnergyMarketplace",
            path: path.join(artifactsDir, "EnergyMarketplace.sol", "EnergyMarketplace.json")
        }
    ];

    // Export each contract ABI
    contracts.forEach(contract => {
        try {
            const artifact = JSON.parse(fs.readFileSync(contract.path, "utf8"));

            const exportData = {
                contractName: contract.name,
                abi: artifact.abi,
                bytecode: artifact.bytecode
            };

            const exportPath = path.join(exportDir, `${contract.name}.json`);
            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

            console.log(`✅ Exported ${contract.name} ABI to: ${exportPath}`);
        } catch (error) {
            console.error(`❌ Failed to export ${contract.name}:`, error.message);
        }
    });

    // Try to read deployment addresses if they exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");

    if (fs.existsSync(deploymentsDir)) {
        const deploymentFiles = fs.readdirSync(deploymentsDir);

        if (deploymentFiles.length > 0) {
            console.log("\n📍 Available deployments:");

            deploymentFiles.forEach(file => {
                if (file.endsWith(".json")) {
                    const deploymentPath = path.join(deploymentsDir, file);
                    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

                    console.log(`\n  Network: ${deployment.network}`);
                    console.log(`  File: ${file}`);
                    console.log(`  EnergyCredit: ${deployment.contracts.EnergyCredit}`);
                    console.log(`  EnergyMarketplace: ${deployment.contracts.EnergyMarketplace}`);
                }
            });

            // Create a combined export file with latest deployment
            const latestDeploymentFile = deploymentFiles[deploymentFiles.length - 1];
            const latestDeployment = JSON.parse(
                fs.readFileSync(path.join(deploymentsDir, latestDeploymentFile), "utf8")
            );

            const combinedExport = {
                network: latestDeployment.network,
                timestamp: latestDeployment.timestamp,
                contracts: {
                    EnergyCredit: {
                        address: latestDeployment.contracts.EnergyCredit,
                        abi: JSON.parse(
                            fs.readFileSync(path.join(exportDir, "EnergyCredit.json"), "utf8")
                        ).abi
                    },
                    EnergyMarketplace: {
                        address: latestDeployment.contracts.EnergyMarketplace,
                        abi: JSON.parse(
                            fs.readFileSync(path.join(exportDir, "EnergyMarketplace.json"), "utf8")
                        ).abi
                    }
                }
            };

            const combinedPath = path.join(exportDir, "contracts-combined.json");
            fs.writeFileSync(combinedPath, JSON.stringify(combinedExport, null, 2));
            console.log(`\n✅ Created combined export: ${combinedPath}`);
        }
    } else {
        console.log("\n⚠️  No deployments found. Deploy contracts first.");
    }

    console.log("\n✨ Export completed!");
    console.log("\n💡 To use in frontend:");
    console.log("   1. Copy the 'exports' folder to your frontend directory");
    console.log("   2. Import ABIs: import { abi } from './exports/EnergyCredit.json'");
    console.log("   3. Use with ethers.js to interact with contracts\n");
}

// Run if called directly
if (require.main === module) {
    try {
        exportABIs();
    } catch (error) {
        console.error("❌ Export failed:");
        console.error(error);
        process.exit(1);
    }
}

module.exports = { exportABIs };
