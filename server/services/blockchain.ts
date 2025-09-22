import { ethers } from "ethers";

// Contract addresses (will be set after deployment)
const ENERGY_TOKEN_ADDRESS = process.env.ENERGY_TOKEN_ADDRESS || "";
const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || "";

// Sepolia RPC URL
const RPC_URL = process.env.RPC_URL || process.env.ALCHEMY_URL || "https://eth-sepolia.g.alchemy.com/v2/demo";

// Private key for demo energy minting (should be set in environment)
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || "";

// ABIs (simplified for demo)
const ENERGY_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const MARKETPLACE_ABI = [
  "function createListing(uint256 amountKWh, uint256 ratePerKWh) external",
  "function buyEnergy(uint256 listingId, uint256 amount) external payable",
  "function cancelListing(uint256 listingId) external",
  "function getListings() view returns (tuple(address seller, uint256 amountKWh, uint256 ratePerKWh, bool active)[])"
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

  async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
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
        console.warn("Energy token contract not initialized");
        return 0;
      }
      
      const balance = await this.energyTokenContract.balanceOf(address);
      return parseFloat(ethers.formatUnits(balance, 18));
    } catch (error) {
      console.error("Error getting energy balance:", error);
      return 0;
    }
  }

  async mintDemoEnergy(address: string, amount: string): Promise<string> {
    try {
      if (!this.energyTokenContract || !this.adminWallet) {
        throw new Error("Contract or admin wallet not initialized");
      }

      const amountWei = ethers.parseUnits(amount, 18);
      const tx = await this.energyTokenContract.mint(address, amountWei);
      await tx.wait();
      
      return tx.hash;
    } catch (error) {
      console.error("Error minting demo energy:", error);
      throw error;
    }
  }

  async createListing(sellerAddress: string, amountKWh: string, ratePerKWh: string): Promise<string> {
    try {
      // For demo purposes, return a mock transaction hash
      // In production, this would interact with the smart contract
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
      console.log(`Mock listing creation for ${sellerAddress}: ${amountKWh} kWh at ${ratePerKWh} ETH/kWh`);
      return mockTxHash;
    } catch (error) {
      console.error("Error creating listing:", error);
      throw error;
    }
  }

  async buyEnergy(buyerAddress: string, sellerAddress: string, amount: string, totalCost: string): Promise<string> {
    try {
      // For demo purposes, return a mock transaction hash
      // In production, this would interact with the smart contract
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
      console.log(`Mock energy purchase: ${buyerAddress} buying ${amount} kWh from ${sellerAddress} for ${totalCost} ETH`);
      return mockTxHash;
    } catch (error) {
      console.error("Error buying energy:", error);
      throw error;
    }
  }

  async cancelListing(sellerAddress: string, listingId: string): Promise<string> {
    try {
      // For demo purposes, return a mock transaction hash
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
      console.log(`Mock listing cancellation for ${sellerAddress}: listing ${listingId}`);
      return mockTxHash;
    } catch (error) {
      console.error("Error cancelling listing:", error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();
