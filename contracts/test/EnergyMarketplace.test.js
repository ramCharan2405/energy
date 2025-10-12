const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnergyMarketplace", function () {
    let energyCredit;
    let marketplace;
    let owner;
    let seller;
    let buyer;
    let addr3;

    const INITIAL_SUPPLY = 10000; // 10,000 tokens
    const DEMO_TOKENS = 100; // Tokens to give to seller for testing

    beforeEach(async function () {
        [owner, seller, buyer, addr3] = await ethers.getSigners();

        // Deploy EnergyCredit token
        const EnergyCredit = await ethers.getContractFactory("EnergyCredit");
        energyCredit = await EnergyCredit.deploy(INITIAL_SUPPLY);
        await energyCredit.waitForDeployment();

        // Deploy Marketplace
        const EnergyMarketplace = await ethers.getContractFactory("EnergyMarketplace");
        marketplace = await EnergyMarketplace.deploy(await energyCredit.getAddress());
        await marketplace.waitForDeployment();

        // Give seller some tokens
        await energyCredit.mint(seller.address, DEMO_TOKENS);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await marketplace.owner()).to.equal(owner.address);
        });

        it("Should set the correct energy token address", async function () {
            expect(await marketplace.energyToken()).to.equal(await energyCredit.getAddress());
        });

        it("Should set initial platform fee to 2%", async function () {
            expect(await marketplace.platformFeePercent()).to.equal(200);
        });
    });

    describe("Creating Listings", function () {
        it("Should create a listing successfully", async function () {
            const amount = 10; // 10 tokens
            const pricePerToken = ethers.parseEther("0.01"); // 0.01 ETH per token

            // Approve marketplace to spend tokens
            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther(amount.toString())
            );

            // Create listing
            await expect(
                marketplace.connect(seller).createListing(amount, pricePerToken)
            ).to.emit(marketplace, "ListingCreated");

            // Check listing
            const listing = await marketplace.getListing(1);
            expect(listing.seller).to.equal(seller.address);
            expect(listing.amountInTokens).to.equal(amount);
            expect(listing.pricePerTokenInWei).to.equal(pricePerToken);
            expect(listing.isActive).to.equal(true);
        });

        it("Should fail if insufficient balance", async function () {
            const amount = 1000; // More than seller has
            const pricePerToken = ethers.parseEther("0.01");

            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther(amount.toString())
            );

            await expect(
                marketplace.connect(seller).createListing(amount, pricePerToken)
            ).to.be.revertedWith("Insufficient token balance");
        });

        it("Should fail if tokens not approved", async function () {
            const amount = 10;
            const pricePerToken = ethers.parseEther("0.01");

            await expect(
                marketplace.connect(seller).createListing(amount, pricePerToken)
            ).to.be.revertedWith("Insufficient token allowance. Please approve tokens first.");
        });

        it("Should fail if amount is zero", async function () {
            await expect(
                marketplace.connect(seller).createListing(0, ethers.parseEther("0.01"))
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("Should fail if price is zero", async function () {
            await expect(
                marketplace.connect(seller).createListing(10, 0)
            ).to.be.revertedWith("Price must be greater than 0");
        });
    });

    describe("Buying Energy", function () {
        let listingId;
        const amount = 10;
        const pricePerToken = ethers.parseEther("0.01");
        const totalPrice = pricePerToken * BigInt(amount);

        beforeEach(async function () {
            // Create a listing
            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther(amount.toString())
            );

            const tx = await marketplace.connect(seller).createListing(amount, pricePerToken);
            const receipt = await tx.wait();
            listingId = 1; // First listing
        });

        it("Should allow buying energy successfully", async function () {
            const initialSellerBalance = await ethers.provider.getBalance(seller.address);
            const initialBuyerTokens = await energyCredit.balanceOf(buyer.address);

            // Buy energy
            await expect(
                marketplace.connect(buyer).buyEnergy(listingId, { value: totalPrice })
            ).to.emit(marketplace, "EnergyPurchased");

            // Check buyer received tokens
            const finalBuyerTokens = await energyCredit.balanceOf(buyer.address);
            expect(finalBuyerTokens - initialBuyerTokens).to.equal(
                ethers.parseEther(amount.toString())
            );

            // Check seller received ETH (minus platform fee)
            const finalSellerBalance = await ethers.provider.getBalance(seller.address);
            const platformFee = (totalPrice * BigInt(200)) / BigInt(10000);
            const expectedSellerAmount = totalPrice - platformFee;

            expect(finalSellerBalance - initialSellerBalance).to.equal(expectedSellerAmount);

            // Check listing is no longer active
            const listing = await marketplace.getListing(listingId);
            expect(listing.isActive).to.equal(false);
        });

        it("Should refund excess ETH", async function () {
            const excessAmount = ethers.parseEther("0.05");
            const sentAmount = totalPrice + excessAmount;

            const initialBuyerBalance = await ethers.provider.getBalance(buyer.address);

            const tx = await marketplace.connect(buyer).buyEnergy(listingId, {
                value: sentAmount
            });
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const finalBuyerBalance = await ethers.provider.getBalance(buyer.address);
            const actualCost = initialBuyerBalance - finalBuyerBalance;

            // Should only cost total price + gas
            expect(actualCost).to.be.closeTo(totalPrice + gasUsed, ethers.parseEther("0.0001"));
        });

        it("Should fail if insufficient ETH sent", async function () {
            await expect(
                marketplace.connect(buyer).buyEnergy(listingId, {
                    value: totalPrice - ethers.parseEther("0.001")
                })
            ).to.be.revertedWith("Insufficient ETH sent");
        });

        it("Should fail if listing is not active", async function () {
            // Buy once
            await marketplace.connect(buyer).buyEnergy(listingId, { value: totalPrice });

            // Try to buy again
            await expect(
                marketplace.connect(addr3).buyEnergy(listingId, { value: totalPrice })
            ).to.be.revertedWith("Listing is not active");
        });

        it("Should fail if trying to buy own listing", async function () {
            await expect(
                marketplace.connect(seller).buyEnergy(listingId, { value: totalPrice })
            ).to.be.revertedWith("Cannot buy your own listing");
        });
    });

    describe("Cancelling Listings", function () {
        it("Should allow seller to cancel listing", async function () {
            const amount = 10;
            const pricePerToken = ethers.parseEther("0.01");

            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther(amount.toString())
            );

            await marketplace.connect(seller).createListing(amount, pricePerToken);

            await expect(marketplace.connect(seller).cancelListing(1))
                .to.emit(marketplace, "ListingCancelled")
                .withArgs(1, seller.address);

            const listing = await marketplace.getListing(1);
            expect(listing.isActive).to.equal(false);
        });

        it("Should fail if not the seller", async function () {
            const amount = 10;
            const pricePerToken = ethers.parseEther("0.01");

            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther(amount.toString())
            );

            await marketplace.connect(seller).createListing(amount, pricePerToken);

            await expect(
                marketplace.connect(buyer).cancelListing(1)
            ).to.be.revertedWith("Not the seller");
        });
    });

    describe("Querying Listings", function () {
        it("Should get active listings", async function () {
            // Create multiple listings
            const amount = 10;
            const pricePerToken = ethers.parseEther("0.01");

            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther((amount * 3).toString())
            );

            await marketplace.connect(seller).createListing(amount, pricePerToken);
            await marketplace.connect(seller).createListing(amount, pricePerToken);
            await marketplace.connect(seller).createListing(amount, pricePerToken);

            const activeListings = await marketplace.getActiveListings();
            expect(activeListings.length).to.equal(3);
        });

        it("Should get user listings", async function () {
            const amount = 10;
            const pricePerToken = ethers.parseEther("0.01");

            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther((amount * 2).toString())
            );

            await marketplace.connect(seller).createListing(amount, pricePerToken);
            await marketplace.connect(seller).createListing(amount, pricePerToken);

            const userListings = await marketplace.getUserListings(seller.address);
            expect(userListings.length).to.equal(2);
        });

        it("Should get total listings count", async function () {
            expect(await marketplace.getTotalListings()).to.equal(0);

            const amount = 10;
            const pricePerToken = ethers.parseEther("0.01");

            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther(amount.toString())
            );

            await marketplace.connect(seller).createListing(amount, pricePerToken);
            expect(await marketplace.getTotalListings()).to.equal(1);
        });
    });

    describe("Platform Fee Management", function () {
        it("Should allow owner to update platform fee", async function () {
            await expect(marketplace.updatePlatformFee(300))
                .to.emit(marketplace, "PlatformFeeUpdated")
                .withArgs(200, 300);

            expect(await marketplace.platformFeePercent()).to.equal(300);
        });

        it("Should not allow fee greater than 10%", async function () {
            await expect(
                marketplace.updatePlatformFee(1001)
            ).to.be.revertedWith("Fee cannot exceed 10%");
        });

        it("Should not allow non-owner to update fee", async function () {
            await expect(
                marketplace.connect(seller).updatePlatformFee(300)
            ).to.be.reverted;
        });

        it("Should allow owner to withdraw fees", async function () {
            // Create and execute a purchase to generate fees
            const amount = 10;
            const pricePerToken = ethers.parseEther("0.01");
            const totalPrice = pricePerToken * BigInt(amount);

            await energyCredit.connect(seller).approve(
                await marketplace.getAddress(),
                ethers.parseEther(amount.toString())
            );

            await marketplace.connect(seller).createListing(amount, pricePerToken);
            await marketplace.connect(buyer).buyEnergy(1, { value: totalPrice });

            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
            const contractBalance = await marketplace.getContractBalance();

            const tx = await marketplace.withdrawFees();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

            expect(finalOwnerBalance - initialOwnerBalance + gasUsed).to.equal(contractBalance);
        });
    });
});
