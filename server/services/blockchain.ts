import { ethers } from "ethers";

// Validate required environment variables
const validateEnvironment = () => {
  if (!process.env.ENERGY_TOKEN_ADDRESS) {
    console.warn(
      "⚠️  ENERGY_TOKEN_ADDRESS not set - using mock mode for energy tokens"
    );
  }
  if (!process.env.MARKETPLACE_ADDRESS) {
    console.warn(
      "⚠️  MARKETPLACE_ADDRESS not set - using mock mode for marketplace"
    );
  }
  if (!process.env.ALCHEMY_API_KEY) {
    console.warn("⚠️  ALCHEMY_API_KEY not set - using demo RPC endpoint");
  }
  if (!process.env.ADMIN_PRIVATE_KEY) {
    console.warn("⚠️  ADMIN_PRIVATE_KEY not set - energy minting will fail");
  }
};

// Contract addresses (required for production)
const ENERGY_TOKEN_ADDRESS = process.env.ENERGY_TOKEN_ADDRESS;
const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS;

// Sepolia RPC URL with Alchemy API key
const RPC_URL = process.env.ALCHEMY_API_KEY
  ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : "https://eth-sepolia.g.alchemy.com/v2/demo";

// Private key for demo energy minting (required for minting)
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Initialize environment validation
validateEnvironment();

// ABIs (matching the actual smart contracts)
const ENERGY_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const MARKETPLACE_ABI = [
  "function createListing(uint256 amountKWh, uint256 ratePerKWh) external",
  "function buyEnergy(uint256 listingId, uint256 amount) external payable",
  "function cancelListing(uint256 listingId) external",
  "function getActiveListings() external view returns (tuple(uint256 id, address seller, uint256 amountKWh, uint256 ratePerKWh, uint256 totalValue, bool active, uint256 createdAt)[])",
  "function listings(uint256) external view returns (uint256 id, address seller, uint256 amountKWh, uint256 ratePerKWh, uint256 totalValue, bool active, uint256 createdAt)",
  "event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 amountKWh, uint256 ratePerKWh)",
  "event EnergyPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 amount, uint256 totalCost)",
];

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private adminWallet?: ethers.Wallet;
  private energyTokenContract?: ethers.Contract;
  private marketplaceContract?: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);

    if (ADMIN_PRIVATE_KEY) {
      this.adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, this.provider);
    }

    if (ENERGY_TOKEN_ADDRESS && this.adminWallet) {
      this.energyTokenContract = new ethers.Contract(
        ENERGY_TOKEN_ADDRESS,
        ENERGY_TOKEN_ABI,
        this.adminWallet
      );
    }

    if (MARKETPLACE_ADDRESS && this.adminWallet) {
      this.marketplaceContract = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        this.adminWallet
      );
    }
  }

  async verifySignature(
    address: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  async getEthBalance(address: string): Promise<number> {
    try {
      const balance = await this.provider.getBalance(address);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      console.error("Error getting ETH balance:", error);
      return 0;
    }
  }

  async getEnergyBalance(address: string): Promise<number> {
    try {
      if (!this.energyTokenContract) {
        console.warn(
          "Energy token contract not initialized - returning mock balance"
        );
        return 1000; // Mock balance for demo
      }

      const balance = await this.energyTokenContract.balanceOf(address);
      return parseFloat(ethers.formatUnits(balance, 18));
    } catch (error) {
      console.error("Error getting energy balance:", error);
      return 1000; // Mock balance for demo on error
    }
  }

  async mintInitialTokens(address: string, amount: string): Promise<string> {
    try {
      if (!this.energyTokenContract || !this.adminWallet) {
        console.warn(
          "Contract or admin wallet not initialized - skipping mint"
        );
        return "0x" + Math.random().toString(16).substr(2, 64); // Mock transaction hash
      }

      const amountWei = ethers.parseUnits(amount, 18);
      console.log(`🎯 Minting ${amount} real energy tokens to ${address}`);

      const tx = await this.energyTokenContract.mint(address, amountWei);
      await tx.wait();

      console.log(`✅ Successfully minted ${amount} tokens! TX: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error("Error minting initial tokens:", error);
      // Return mock hash instead of throwing to prevent auth failures
      return "0x" + Math.random().toString(16).substr(2, 64);
    }
  }

  async createListing(
    sellerAddress: string,
    amountKWh: string,
    ratePerKWh: string
  ): Promise<string> {
    try {
      if (!this.marketplaceContract || !MARKETPLACE_ADDRESS) {
        console.log(
          `Mock listing creation for ${sellerAddress}: ${amountKWh} kWh at ${ratePerKWh} ETH/kWh`
        );
        return "0x" + Math.random().toString(16).substr(2, 64);
      }

      // In production, this would interact with the smart contract
      // const tx = await this.marketplaceContract.createListing(amountKWh, ratePerKWh);
      // await tx.wait();
      // return tx.hash;

      // For now, return mock hash until contracts are deployed
      console.log(
        `Mock listing creation for ${sellerAddress}: ${amountKWh} kWh at ${ratePerKWh} ETH/kWh`
      );
      return "0x" + Math.random().toString(16).substr(2, 64);
    } catch (error) {
      console.error("Error creating listing:", error);
      throw error;
    }
  }

  async buyEnergy(
    buyerAddress: string,
    sellerAddress: string,
    amount: string,
    totalCost: string
  ): Promise<string> {
    try {
      console.log("🔍 Starting buyEnergy transaction...");
      console.log(`Buyer: ${buyerAddress}`);
      console.log(`Seller: ${sellerAddress}`);
      console.log(`Amount: ${amount} kWh`);
      console.log(`Total Cost: ${totalCost} ETH`);

      if (!this.marketplaceContract || !MARKETPLACE_ADDRESS) {
        console.warn(
          "⚠️ Marketplace contract not initialized - using mock transaction"
        );
        console.log(
          `Mock energy purchase: ${buyerAddress} buying ${amount} kWh from ${sellerAddress} for ${totalCost} ETH`
        );
        return "0x" + Math.random().toString(16).substr(2, 64);
      }

      // Convert amounts to proper units
      const amountWei = ethers.parseUnits(amount, 18); // Energy amount in wei
      const totalCostWei = ethers.parseEther(totalCost); // ETH amount in wei

      console.log("💰 Transaction Details:");
      console.log(`Amount in wei: ${amountWei.toString()}`);
      console.log(`Cost in wei: ${totalCostWei.toString()}`);
      console.log(`Admin wallet address: ${this.adminWallet?.address}`);

      // Check admin wallet balance
      if (this.adminWallet) {
        const adminBalance = await this.provider.getBalance(
          this.adminWallet.address
        );
        console.log(
          `Admin wallet balance: ${ethers.formatEther(adminBalance)} ETH`
        );

        if (adminBalance < totalCostWei) {
          console.error("❌ Admin wallet has insufficient ETH balance!");
          throw new Error(
            `Admin wallet needs ${totalCost} ETH but only has ${ethers.formatEther(
              adminBalance
            )} ETH`
          );
        }
      }

      console.log("🚀 Executing blockchain transaction...");

      // Call the smart contract buyEnergy function
      // Note: In production, the buyer would call this directly from their wallet
      // For demo purposes, we're using listingId = 1 (you should pass the actual listingId)
      const listingId = 1; // This should be passed as a parameter in production
      const tx = await this.marketplaceContract.buyEnergy(
        listingId,
        amountWei,
        {
          value: totalCostWei,
          gasLimit: 500000, // Increased gas limit for complex transactions
        }
      );

      console.log(`✅ Transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log(`🎉 Transaction confirmed in block: ${receipt.blockNumber}`);

      return tx.hash;
    } catch (error: any) {
      console.error("❌ Error buying energy:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        reason: error.reason,
      });

      // Return mock hash on error to prevent breaking the flow
      console.warn("🔄 Falling back to mock transaction");
      return "0x" + Math.random().toString(16).substr(2, 64);
    }
  }

  async cancelListing(
    sellerAddress: string,
    listingId: string
  ): Promise<string> {
    try {
      // For demo purposes, return a mock transaction hash
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
      console.log(
        `Mock listing cancellation for ${sellerAddress}: listing ${listingId}`
      );
      return mockTxHash;
    } catch (error) {
      console.error("Error cancelling listing:", error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();
