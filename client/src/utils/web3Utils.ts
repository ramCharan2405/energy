import { ethers } from "ethers";
import {
  CONTRACT_ADDRESSES,
  NETWORK_CONFIG,
  ENERGY_TOKEN_ABI,
  MARKETPLACE_ABI,
  GAS_LIMITS,
  TOKEN_DECIMALS,
} from "./contractConfig";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class Web3Utils {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private energyTokenContract: ethers.Contract | null = null;
  private marketplaceContract: ethers.Contract | null = null;

  constructor() {
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
  }

  // Initialize contracts with signer
  async initializeContracts(): Promise<void> {
    if (!this.provider) {
      throw new Error("Web3 provider not available");
    }

    this.signer = await this.provider.getSigner();

    if (CONTRACT_ADDRESSES.ENERGY_TOKEN) {
      this.energyTokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.ENERGY_TOKEN,
        ENERGY_TOKEN_ABI,
        this.signer
      );
    }

    if (CONTRACT_ADDRESSES.MARKETPLACE) {
      this.marketplaceContract = new ethers.Contract(
        CONTRACT_ADDRESSES.MARKETPLACE,
        MARKETPLACE_ABI,
        this.signer
      );
    }
  }

  // Network management
  async switchToSepolia(): Promise<void> {
    if (!window.ethereum) {
      throw new Error("MetaMask not found");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${NETWORK_CONFIG.CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Chain hasn't been added to MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: `0x${NETWORK_CONFIG.CHAIN_ID.toString(16)}`,
            chainName: NETWORK_CONFIG.CHAIN_NAME,
            rpcUrls: [NETWORK_CONFIG.RPC_URL],
            nativeCurrency: NETWORK_CONFIG.NATIVE_CURRENCY,
            blockExplorerUrls: [NETWORK_CONFIG.BLOCK_EXPLORER],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }

  // Account management
  async connectWallet(): Promise<string[]> {
    if (!window.ethereum) {
      throw new Error("MetaMask not found");
    }

    await this.switchToSepolia();
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (accounts.length === 0) {
      throw new Error("No accounts found");
    }

    await this.initializeContracts();
    return accounts;
  }

  async getAccounts(): Promise<string[]> {
    if (!window.ethereum) {
      return [];
    }

    return await window.ethereum.request({
      method: "eth_accounts",
    });
  }

  // Balance queries
  async getEthBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getEnergyBalance(address: string): Promise<string> {
    if (!this.energyTokenContract) {
      throw new Error("Energy token contract not initialized");
    }

    const balance = await this.energyTokenContract.balanceOf(address);
    return ethers.formatUnits(balance, TOKEN_DECIMALS);
  }

  async getEnergyAllowance(owner: string, spender: string): Promise<string> {
    if (!this.energyTokenContract) {
      throw new Error("Energy token contract not initialized");
    }

    const allowance = await this.energyTokenContract.allowance(owner, spender);
    return ethers.formatUnits(allowance, TOKEN_DECIMALS);
  }

  // Energy token operations
  async approveEnergySpending(spender: string, amount: string): Promise<string> {
    if (!this.energyTokenContract) {
      throw new Error("Energy token contract not initialized");
    }

    const amountWei = ethers.parseUnits(amount, TOKEN_DECIMALS);
    const tx = await this.energyTokenContract.approve(spender, amountWei, {
      gasLimit: GAS_LIMITS.APPROVE,
    });

    return tx.hash;
  }

  async mintDemoEnergy(address: string): Promise<string> {
    if (!this.energyTokenContract) {
      throw new Error("Energy token contract not initialized");
    }

    const tx = await this.energyTokenContract.mintDemoEnergy(address, {
      gasLimit: GAS_LIMITS.MINT_DEMO_ENERGY,
    });

    return tx.hash;
  }

  // Marketplace operations
  async createEnergyListing(amountKWh: string, ratePerKWh: string): Promise<string> {
    if (!this.marketplaceContract || !this.energyTokenContract) {
      throw new Error("Contracts not initialized");
    }

    const amountWei = ethers.parseUnits(amountKWh, TOKEN_DECIMALS);
    const rateWei = ethers.parseUnits(ratePerKWh, TOKEN_DECIMALS);

    // First approve the marketplace to spend energy tokens
    const approveTx = await this.energyTokenContract.approve(
      CONTRACT_ADDRESSES.MARKETPLACE,
      amountWei,
      { gasLimit: GAS_LIMITS.APPROVE }
    );
    await approveTx.wait();

    // Then create the listing
    const tx = await this.marketplaceContract.createListing(amountWei, rateWei, {
      gasLimit: GAS_LIMITS.CREATE_LISTING,
    });

    return tx.hash;
  }

  async buyEnergy(listingId: string, amount: string, totalCost: string): Promise<string> {
    if (!this.marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    const amountWei = ethers.parseUnits(amount, TOKEN_DECIMALS);
    const costWei = ethers.parseEther(totalCost);

    const tx = await this.marketplaceContract.buyEnergy(listingId, amountWei, {
      value: costWei,
      gasLimit: GAS_LIMITS.BUY_ENERGY,
    });

    return tx.hash;
  }

  async cancelListing(listingId: string): Promise<string> {
    if (!this.marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    const tx = await this.marketplaceContract.cancelListing(listingId, {
      gasLimit: GAS_LIMITS.CANCEL_LISTING,
    });

    return tx.hash;
  }

  // Query marketplace data
  async getActiveListings(): Promise<any[]> {
    if (!this.marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    const listings = await this.marketplaceContract.getActiveListings();
    return listings.map((listing: any) => ({
      id: listing.id.toString(),
      seller: listing.seller,
      amountKWh: ethers.formatUnits(listing.amountKWh, TOKEN_DECIMALS),
      ratePerKWh: ethers.formatUnits(listing.ratePerKWh, TOKEN_DECIMALS),
      totalValue: ethers.formatEther(listing.totalValue),
      active: listing.active,
      createdAt: new Date(Number(listing.createdAt) * 1000),
    }));
  }

  async getUserListings(address: string): Promise<string[]> {
    if (!this.marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    const listingIds = await this.marketplaceContract.getUserListings(address);
    return listingIds.map((id: any) => id.toString());
  }

  async getListing(listingId: string): Promise<any> {
    if (!this.marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    const listing = await this.marketplaceContract.listings(listingId);
    return {
      id: listing.id.toString(),
      seller: listing.seller,
      amountKWh: ethers.formatUnits(listing.amountKWh, TOKEN_DECIMALS),
      ratePerKWh: ethers.formatUnits(listing.ratePerKWh, TOKEN_DECIMALS),
      totalValue: ethers.formatEther(listing.totalValue),
      active: listing.active,
      createdAt: new Date(Number(listing.createdAt) * 1000),
    };
  }

  // Utility functions
  formatEther(value: string): string {
    return ethers.formatEther(value);
  }

  parseEther(value: string): bigint {
    return ethers.parseEther(value);
  }

  formatUnits(value: string, decimals: number = TOKEN_DECIMALS): string {
    return ethers.formatUnits(value, decimals);
  }

  parseUnits(value: string, decimals: number = TOKEN_DECIMALS): bigint {
    return ethers.parseUnits(value, decimals);
  }

  isAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // Transaction utilities
  async waitForTransaction(txHash: string): Promise<any> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    return await this.provider.waitForTransaction(txHash);
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    return await this.provider.getTransactionReceipt(txHash);
  }

  // Event listeners
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (window.ethereum) {
      window.ethereum.on("chainChanged", callback);
    }
  }

  removeAllListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners();
    }
  }
}

// Export singleton instance
export const web3Utils = new Web3Utils();

// Export utility functions
export const {
  connectWallet,
  getAccounts,
  getEthBalance,
  getEnergyBalance,
  switchToSepolia,
  formatEther,
  parseEther,
  formatUnits,
  parseUnits,
  isAddress,
} = web3Utils;

export default web3Utils;
