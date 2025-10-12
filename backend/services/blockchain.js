const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Import contract ABIs
const EnergyTokenABI = require('../contracts/EnergyCredit.json');
const MarketplaceABI = require('../contracts/EnergyMarketplace.json');

/**
 * Blockchain Service Configuration
 */
class BlockchainService {
    constructor() {
        this.provider = null;
        this.platformWallet = null;
        this.tokenContract = null;
        this.marketplaceContract = null;
        this.isInitialized = false;
    }

    /**
     * Initialize blockchain connection
     */
    async initialize() {
        try {
            // Initialize provider
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

            // Test connection
            const network = await this.provider.getNetwork();
            logger.info(`Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`);

            // Initialize platform wallet
            this.platformWallet = new ethers.Wallet(
                process.env.PLATFORM_PRIVATE_KEY,
                this.provider
            );
            logger.info(`Platform wallet address: ${this.platformWallet.address}`);

            // Initialize contracts
            this.tokenContract = new ethers.Contract(
                process.env.ENERGY_TOKEN_ADDRESS,
                EnergyTokenABI.abi,
                this.platformWallet
            );

            this.marketplaceContract = new ethers.Contract(
                process.env.ENERGY_MARKETPLACE_ADDRESS,
                MarketplaceABI.abi,
                this.platformWallet
            );

            // Verify contracts are deployed
            const tokenCode = await this.provider.getCode(process.env.ENERGY_TOKEN_ADDRESS);
            const marketplaceCode = await this.provider.getCode(process.env.ENERGY_MARKETPLACE_ADDRESS);

            if (tokenCode === '0x') {
                throw new Error('Token contract not deployed at specified address');
            }
            if (marketplaceCode === '0x') {
                throw new Error('Marketplace contract not deployed at specified address');
            }

            logger.info('✓ Token contract verified');
            logger.info('✓ Marketplace contract verified');

            this.isInitialized = true;
            return true;
        } catch (error) {
            logger.error('Blockchain initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Get current gas price
     */
    async getGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            return {
                gasPrice: feeData.gasPrice,
                maxFeePerGas: feeData.maxFeePerGas,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            };
        } catch (error) {
            logger.error('Error getting gas price:', error.message);
            throw error;
        }
    }

    /**
     * Get ETH balance
     */
    async getEthBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            logger.error('Error getting ETH balance:', error.message);
            throw error;
        }
    }

    /**
     * Get token balance
     */
    async getTokenBalance(address) {
        try {
            const balance = await this.tokenContract.balanceOf(address);
            return ethers.formatEther(balance);
        } catch (error) {
            logger.error('Error getting token balance:', error.message);
            throw error;
        }
    }

    /**
     * Mint tokens to new user (signup bonus)
     */
    async mintSignupBonus(userAddress, amount = 50) {
        try {
            logger.info(`Minting ${amount} ENGC to ${userAddress}`);

            const tx = await this.tokenContract.mintForDemo(
                userAddress,
                amount,
                'Registration bonus'
            );

            logger.info(`Mint transaction submitted: ${tx.hash}`);

            const receipt = await tx.wait(process.env.BLOCK_CONFIRMATION_COUNT || 1);

            logger.info(`Mint transaction confirmed in block ${receipt.blockNumber}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: amount,
            };
        } catch (error) {
            logger.error('Error minting signup bonus:', error.message);
            throw error;
        }
    }

    /**
     * Get listing details
     */
    async getListing(listingId) {
        try {
            const listing = await this.marketplaceContract.getListing(listingId);
            return {
                id: listing.id.toString(),
                seller: listing.seller,
                amountInTokens: listing.amountInTokens.toString(),
                pricePerTokenInWei: ethers.formatEther(listing.pricePerTokenInWei),
                totalPriceInWei: ethers.formatEther(listing.totalPriceInWei),
                isActive: listing.isActive,
                createdAt: new Date(Number(listing.createdAt) * 1000),
            };
        } catch (error) {
            logger.error('Error getting listing:', error.message);
            throw error;
        }
    }

    /**
     * Get all active listings
     */
    async getActiveListings() {
        try {
            const listings = await this.marketplaceContract.getActiveListings();
            return listings.map(listing => ({
                id: listing.id.toString(),
                seller: listing.seller,
                amountInTokens: listing.amountInTokens.toString(),
                pricePerTokenInWei: ethers.formatEther(listing.pricePerTokenInWei),
                totalPriceInWei: ethers.formatEther(listing.totalPriceInWei),
                isActive: listing.isActive,
                createdAt: new Date(Number(listing.createdAt) * 1000),
            }));
        } catch (error) {
            logger.error('Error getting active listings:', error.message);
            throw error;
        }
    }

    /**
     * Get user's listings
     */
    async getUserListings(userAddress) {
        try {
            const listings = await this.marketplaceContract.getUserListings(userAddress);
            return listings.map(listing => ({
                id: listing.id.toString(),
                seller: listing.seller,
                amountInTokens: listing.amountInTokens.toString(),
                pricePerTokenInWei: ethers.formatEther(listing.pricePerTokenInWei),
                totalPriceInWei: ethers.formatEther(listing.totalPriceInWei),
                isActive: listing.isActive,
                createdAt: new Date(Number(listing.createdAt) * 1000),
            }));
        } catch (error) {
            logger.error('Error getting user listings:', error.message);
            throw error;
        }
    }

    /**
     * Listen to contract events
     */
    setupEventListeners(callbacks) {
        try {
            // Listen to TokensMinted events
            this.tokenContract.on('TokensMinted', (to, amount, reason, event) => {
                logger.info(`TokensMinted event: ${to} received ${ethers.formatEther(amount)} ENGC`);
                if (callbacks.onTokensMinted) {
                    callbacks.onTokensMinted({
                        to,
                        amount: ethers.formatEther(amount),
                        reason,
                        transactionHash: event.log.transactionHash,
                        blockNumber: event.log.blockNumber,
                    });
                }
            });

            // Listen to ListingCreated events
            this.marketplaceContract.on('ListingCreated', (listingId, seller, amount, price, total, event) => {
                logger.info(`ListingCreated event: Listing ${listingId} by ${seller}`);
                if (callbacks.onListingCreated) {
                    callbacks.onListingCreated({
                        listingId: listingId.toString(),
                        seller,
                        amountInTokens: amount.toString(),
                        pricePerTokenInWei: ethers.formatEther(price),
                        totalPriceInWei: ethers.formatEther(total),
                        transactionHash: event.log.transactionHash,
                        blockNumber: event.log.blockNumber,
                    });
                }
            });

            // Listen to EnergyPurchased events
            this.marketplaceContract.on('EnergyPurchased', (listingId, buyer, seller, amount, price, fee, event) => {
                logger.info(`EnergyPurchased event: Listing ${listingId} purchased by ${buyer}`);
                if (callbacks.onEnergyPurchased) {
                    callbacks.onEnergyPurchased({
                        listingId: listingId.toString(),
                        buyer,
                        seller,
                        amountInTokens: amount.toString(),
                        totalPriceInWei: ethers.formatEther(price),
                        platformFee: ethers.formatEther(fee),
                        transactionHash: event.log.transactionHash,
                        blockNumber: event.log.blockNumber,
                    });
                }
            });

            // Listen to ListingCancelled events
            this.marketplaceContract.on('ListingCancelled', (listingId, seller, event) => {
                logger.info(`ListingCancelled event: Listing ${listingId} cancelled by ${seller}`);
                if (callbacks.onListingCancelled) {
                    callbacks.onListingCancelled({
                        listingId: listingId.toString(),
                        seller,
                        transactionHash: event.log.transactionHash,
                        blockNumber: event.log.blockNumber,
                    });
                }
            });

            logger.info('Event listeners set up successfully');
        } catch (error) {
            logger.error('Error setting up event listeners:', error.message);
            throw error;
        }
    }

    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(txHash) {
        try {
            const receipt = await this.provider.getTransactionReceipt(txHash);
            if (!receipt) {
                return null;
            }

            return {
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                from: receipt.from,
                to: receipt.to,
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status === 1 ? 'success' : 'failed',
            };
        } catch (error) {
            logger.error('Error getting transaction receipt:', error.message);
            throw error;
        }
    }

    /**
     * Get current block number
     */
    async getCurrentBlockNumber() {
        try {
            return await this.provider.getBlockNumber();
        } catch (error) {
            logger.error('Error getting block number:', error.message);
            throw error;
        }
    }

    /**
     * Validate Ethereum address
     */
    isValidAddress(address) {
        return ethers.isAddress(address);
    }

    /**
     * Format ether value
     */
    formatEther(value) {
        return ethers.formatEther(value);
    }

    /**
     * Parse ether value
     */
    parseEther(value) {
        return ethers.parseEther(value.toString());
    }
}

// Export singleton instance
const blockchainService = new BlockchainService();
module.exports = blockchainService;
