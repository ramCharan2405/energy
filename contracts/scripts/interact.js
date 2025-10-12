const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Example script showing how to interact with deployed contracts
 * This demonstrates the full flow of the energy marketplace
 */
async function main() {
    console.log("🔄 Starting interaction example...\n");

    // Get signers
    const [owner, seller, buyer] = await ethers.getSigners();
    console.log("👥 Using accounts:");
    console.log("  Owner:", owner.address);
    console.log("  Seller:", seller.address);
    console.log("  Buyer:", buyer.address);
    console.log();

    // Deploy contracts (or connect to existing)
    console.log("📦 Deploying contracts...");

    const EnergyCredit = await ethers.getContractFactory("EnergyCredit");
    const energyCredit = await EnergyCredit.deploy(10000); // 10,000 tokens
    await energyCredit.waitForDeployment();
    const tokenAddress = await energyCredit.getAddress();
    console.log("✅ EnergyCredit deployed:", tokenAddress);

    const EnergyMarketplace = await ethers.getContractFactory("EnergyMarketplace");
    const marketplace = await EnergyMarketplace.deploy(tokenAddress);
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ EnergyMarketplace deployed:", marketplaceAddress);
    console.log();

    // Step 1: Mint tokens to seller (simulating registration)
    console.log("🪙 Step 1: Minting 50 ENGC to seller for demo...");
    await energyCredit.mintForDemo(seller.address, 50, "Registration bonus");

    let sellerBalance = await energyCredit.balanceOfInTokens(seller.address);
    console.log(`  Seller balance: ${sellerBalance} ENGC`);
    console.log();

    // Step 2: Seller approves marketplace to spend tokens
    console.log("✅ Step 2: Seller approves marketplace...");
    const amountToSell = 10; // 10 ENGC tokens
    await energyCredit.connect(seller).approve(
        marketplaceAddress,
        ethers.parseEther(amountToSell.toString())
    );
    console.log(`  Approved ${amountToSell} ENGC`);
    console.log();

    // Step 3: Seller creates a listing
    console.log("📝 Step 3: Seller creates listing...");
    const pricePerToken = ethers.parseEther("0.01"); // 0.01 ETH per token
    const tx = await marketplace.connect(seller).createListing(amountToSell, pricePerToken);
    const receipt = await tx.wait();

    const listingId = 1; // First listing
    const listing = await marketplace.getListing(listingId);
    console.log(`  Listing ID: ${listingId}`);
    console.log(`  Amount: ${listing.amountInTokens} ENGC`);
    console.log(`  Price per token: ${ethers.formatEther(listing.pricePerTokenInWei)} ETH`);
    console.log(`  Total price: ${ethers.formatEther(listing.totalPriceInWei)} ETH`);
    console.log();

    // Step 4: Check active listings
    console.log("📋 Step 4: Checking active listings...");
    const activeListings = await marketplace.getActiveListings();
    console.log(`  Active listings: ${activeListings.length}`);
    console.log();

    // Step 5: Buyer purchases energy
    console.log("💰 Step 5: Buyer purchases energy...");
    const totalPrice = listing.totalPriceInWei;

    const buyerEthBefore = await ethers.provider.getBalance(buyer.address);
    const sellerEthBefore = await ethers.provider.getBalance(seller.address);
    const buyerTokensBefore = await energyCredit.balanceOf(buyer.address);

    console.log("  Before purchase:");
    console.log(`    Buyer ETH: ${ethers.formatEther(buyerEthBefore)} ETH`);
    console.log(`    Buyer ENGC: ${ethers.formatEther(buyerTokensBefore)} ENGC`);
    console.log(`    Seller ETH: ${ethers.formatEther(sellerEthBefore)} ETH`);

    await marketplace.connect(buyer).buyEnergy(listingId, { value: totalPrice });

    const buyerEthAfter = await ethers.provider.getBalance(buyer.address);
    const sellerEthAfter = await ethers.provider.getBalance(seller.address);
    const buyerTokensAfter = await energyCredit.balanceOf(buyer.address);

    console.log("\n  After purchase:");
    console.log(`    Buyer ETH: ${ethers.formatEther(buyerEthAfter)} ETH`);
    console.log(`    Buyer ENGC: ${ethers.formatEther(buyerTokensAfter)} ENGC`);
    console.log(`    Seller ETH: ${ethers.formatEther(sellerEthAfter)} ETH`);

    const platformFee = (totalPrice * BigInt(200)) / BigInt(10000); // 2%
    const sellerReceived = totalPrice - platformFee;
    console.log(`\n  Platform fee (2%): ${ethers.formatEther(platformFee)} ETH`);
    console.log(`  Seller received: ${ethers.formatEther(sellerReceived)} ETH`);
    console.log();

    // Step 6: Check listing status
    console.log("🔍 Step 6: Checking listing status...");
    const updatedListing = await marketplace.getListing(listingId);
    console.log(`  Listing active: ${updatedListing.isActive}`);
    console.log();

    // Step 7: Check marketplace stats
    console.log("📊 Step 7: Marketplace statistics...");
    const totalListings = await marketplace.getTotalListings();
    const contractBalance = await marketplace.getContractBalance();
    const activeListingsAfter = await marketplace.getActiveListings();

    console.log(`  Total listings created: ${totalListings}`);
    console.log(`  Active listings: ${activeListingsAfter.length}`);
    console.log(`  Contract balance (fees): ${ethers.formatEther(contractBalance)} ETH`);
    console.log();

    // Step 8: Create another listing and cancel it
    console.log("❌ Step 8: Testing listing cancellation...");

    await energyCredit.connect(seller).approve(
        marketplaceAddress,
        ethers.parseEther("5")
    );

    await marketplace.connect(seller).createListing(5, pricePerToken);
    console.log("  Created listing ID 2");

    await marketplace.connect(seller).cancelListing(2);
    console.log("  Cancelled listing ID 2");

    const cancelledListing = await marketplace.getListing(2);
    console.log(`  Listing 2 active: ${cancelledListing.isActive}`);
    console.log();

    // Step 9: Get user's listings
    console.log("👤 Step 9: Getting seller's listings...");
    const sellerListings = await marketplace.getUserListings(seller.address);
    console.log(`  Seller has ${sellerListings.length} listings total`);
    for (let i = 0; i < sellerListings.length; i++) {
        console.log(`    Listing ${i + 1}: ${sellerListings[i].amountInTokens} ENGC, Active: ${sellerListings[i].isActive}`);
    }
    console.log();

    console.log("✨ Interaction example completed successfully!\n");
    console.log("=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`Token Address: ${tokenAddress}`);
    console.log(`Marketplace Address: ${marketplaceAddress}`);
    console.log(`Tokens traded: ${amountToSell} ENGC`);
    console.log(`Transaction completed successfully! 🎉`);
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:");
        console.error(error);
        process.exit(1);
    });
