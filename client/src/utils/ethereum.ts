import { keccak256 } from "crypto-js";
import { ethers } from "ethers";

// Proper EIP-55 checksum implementation
export function toChecksumAddress(address: string): string {
  if (!address) return address;

  try {
    // Remove 0x prefix and convert to lowercase
    const cleanAddress = address.toLowerCase().replace(/^0x/, "");

    // Calculate keccak256 hash of the lowercase address
    const hash = keccak256(cleanAddress).toString();

    // Apply EIP-55 checksum rules
    let checksumAddress = "0x";
    for (let i = 0; i < cleanAddress.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        checksumAddress += cleanAddress[i].toUpperCase();
      } else {
        checksumAddress += cleanAddress[i];
      }
    }

    console.log("Proper EIP-55 checksum:", address, "->", checksumAddress);
    return checksumAddress;
  } catch (error) {
    console.error("Error creating proper checksum:", error);
    return address.toLowerCase(); // Fallback to lowercase
  }
} // Simple hash function for checksum (not cryptographically secure, but sufficient for SIWE)
function simpleHash(input: string): string {
  let hash = "";
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    const hashChar = ((char * 31) % 16).toString(16);
    hash += hashChar;
  }
  return hash.padEnd(input.length, "0").slice(0, input.length);
}

// Alternative: Get checksummed address from MetaMask directly
export async function getChecksummedAddress(): Promise<string | null> {
  try {
    if (typeof window !== "undefined" && window.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts && accounts.length > 0) {
        // MetaMask should provide properly checksummed addresses
        return accounts[0];
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting checksummed address:", error);
    return null;
  }
}

// Validate Ethereum address format
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Format address for display
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Check if user has enough energy tokens and proper approvals
export async function checkEnergyTokenStatus(amountKWh: string): Promise<{
  hasEnoughTokens: boolean;
  needsApproval: boolean;
  currentBalance: string;
  currentAllowance: string;
}> {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    const energyTokenContract = new ethers.Contract(
      CONTRACTS.ENERGY_TOKEN,
      ENERGY_TOKEN_ABI,
      signer
    );

    const amountWei = ethers.parseUnits(amountKWh, 18);

    // Check user's energy token balance
    const balance = await energyTokenContract.balanceOf(userAddress);

    // Check allowance for marketplace contract
    const allowance = await energyTokenContract.allowance(
      userAddress,
      CONTRACTS.MARKETPLACE
    );

    const hasEnoughTokens = balance >= amountWei;
    const needsApproval = allowance < amountWei;

    console.log("Energy Token Status:", {
      userAddress,
      requestedAmount: amountWei.toString(),
      currentBalance: balance.toString(),
      currentAllowance: allowance.toString(),
      hasEnoughTokens,
      needsApproval,
    });

    return {
      hasEnoughTokens,
      needsApproval,
      currentBalance: ethers.formatUnits(balance, 18),
      currentAllowance: ethers.formatUnits(allowance, 18),
    };
  } catch (error) {
    console.error("Error checking energy token status:", error);
    return {
      hasEnoughTokens: false,
      needsApproval: true,
      currentBalance: "0",
      currentAllowance: "0",
    };
  }
}

// Give initial energy tokens to new users (1000 kWh)
export async function giveInitialTokens(userAddress: string): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const energyTokenContract = new ethers.Contract(
      CONTRACTS.ENERGY_TOKEN,
      ENERGY_TOKEN_ABI,
      signer
    );

    console.log(`Giving 1000 kWh initial tokens to ${userAddress}`);

    // Call the mint function to give initial tokens (1000 kWh)
    const initialAmount = ethers.parseUnits("1000", 18); // 1000 tokens with 18 decimals

    const tx = await energyTokenContract.mint(userAddress, initialAmount, {
      gasLimit: 200000,
    });

    console.log("Initial token minting transaction sent:", tx.hash);
    await tx.wait();
    console.log("Initial tokens minted successfully!");

    return tx.hash;
  } catch (error) {
    console.error("Error giving initial tokens:", error);
    throw error;
  }
}

// Contract addresses on Sepolia testnet
export const CONTRACTS = {
  ENERGY_TOKEN: "0x25d95c144b4b2F3Fef0672eD1bb6f4997E8D1C39",
  MARKETPLACE: "0x0164cac19246C0674F8265d7090Bb9EB55d1c427",
};

// Contract ABIs
export const ENERGY_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function mint(address to, uint256 amount) external", // Give initial tokens to new users
];

export const MARKETPLACE_ABI = [
  "function buyEnergy(uint256 listingId, uint256 amount) external payable",
  "function createListing(uint256 amountKWh, uint256 ratePerKWh) external",
  "function cancelListing(uint256 listingId) external",
];

// Execute real blockchain transaction for buying energy
export async function buyEnergyOnBlockchain(
  blockchainListingId: number,
  amount: string,
  totalCostEth: string
): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Create ethers provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Convert amounts to proper units
    const amountWei = ethers.parseUnits(amount, 18);
    const valueWei = ethers.parseEther(totalCostEth);

    // Check if user has enough ETH
    const balance = await provider.getBalance(userAddress);
    const gasEstimate = ethers.parseEther("0.001"); // Rough gas estimate

    if (balance < valueWei + gasEstimate) {
      throw new Error(
        `❌ Insufficient ETH balance!\n\n` +
          `• You have: ${ethers.formatEther(balance)} ETH\n` +
          `• You need: ${totalCostEth} ETH + gas fees (~0.001 ETH)\n\n` +
          `💡 Solution: Add more Sepolia ETH to your wallet from a faucet.`
      );
    }

    // Create contract instance
    const marketplaceContract = new ethers.Contract(
      CONTRACTS.MARKETPLACE,
      MARKETPLACE_ABI,
      signer
    );

    console.log(`Executing blockchain transaction:`, {
      blockchainListingId,
      amount: amountWei.toString(),
      value: valueWei.toString(),
    });

    // Execute the transaction - use the numeric blockchain listing ID
    const tx = await marketplaceContract.buyEnergy(
      blockchainListingId,
      amountWei,
      {
        value: valueWei,
        gasLimit: 300000,
      }
    );

    console.log("Transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);

    return tx.hash;
  } catch (error) {
    console.error("Blockchain transaction failed:", error);
    throw error;
  }
}

// Execute real blockchain transaction for creating listing
export async function createListingOnBlockchain(
  amountKWh: string,
  ratePerKWh: string
): Promise<{ txHash: string; blockchainListingId: number }> {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Check token status first
    const tokenStatus = await checkEnergyTokenStatus(amountKWh);

    if (!tokenStatus.hasEnoughTokens) {
      throw new Error(
        `❌ Insufficient energy tokens!\n\n` +
          `• You have: ${parseFloat(tokenStatus.currentBalance).toFixed(
            2
          )} kWh\n` +
          `• You need: ${amountKWh} kWh\n\n` +
          `💡 Solution: This is a demo app. In a real dApp, you would need to:\n` +
          `1. Purchase energy tokens\n` +
          `2. Or generate energy (solar panels, etc.)\n` +
          `3. Or receive tokens from another user\n\n` +
          `For now, the app will fall back to mock transactions.`
      );
    }

    // Create ethers provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // First approve energy token spending if needed
    const energyTokenContract = new ethers.Contract(
      CONTRACTS.ENERGY_TOKEN,
      ENERGY_TOKEN_ABI,
      signer
    );

    const amountWei = ethers.parseUnits(amountKWh, 18);
    const rateWei = ethers.parseEther(ratePerKWh);

    if (tokenStatus.needsApproval) {
      console.log("Approving energy token spending...");
      const approveTx = await energyTokenContract.approve(
        CONTRACTS.MARKETPLACE,
        amountWei
      );
      console.log("Approval transaction sent:", approveTx.hash);
      await approveTx.wait();
      console.log("Energy token approved successfully");
    }

    // Create marketplace contract instance
    const marketplaceContract = new ethers.Contract(
      CONTRACTS.MARKETPLACE,
      MARKETPLACE_ABI,
      signer
    );

    console.log(`Creating listing on blockchain:`, {
      amountKWh: amountWei.toString(),
      ratePerKWh: rateWei.toString(),
    });

    // Execute the transaction
    const tx = await marketplaceContract.createListing(amountWei, rateWei);

    console.log("Listing transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Listing transaction confirmed:", receipt);

    // Extract the listing ID from the event logs
    let blockchainListingId = 0;
    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = marketplaceContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "ListingCreated") {
            blockchainListingId = Number(parsedLog.args[0]); // First argument is listingId
            console.log(
              "Extracted blockchain listing ID:",
              blockchainListingId
            );
            break;
          }
        } catch (error) {
          // Skip logs that can't be parsed by our contract interface
        }
      }
    }

    if (blockchainListingId === 0) {
      throw new Error("Could not extract listing ID from transaction receipt");
    }

    return {
      txHash: tx.hash,
      blockchainListingId,
    };
  } catch (error) {
    console.error("Blockchain listing creation failed:", error);
    throw error;
  }
}
