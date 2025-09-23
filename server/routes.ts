import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { SiweMessage } from "siwe";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { insertUserSchema, insertEnergyListingSchema, insertTransactionSchema } from "@shared/schema";
import { blockchainService } from "./services/blockchain";
import { z } from "zod";

// Session type augmentation
declare module 'express-session' {
  interface SessionData {
    nonce?: string;
    userId?: string;
    walletAddress?: string;
  }
}

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // SIWE Auth routes
  app.get("/api/auth/nonce", (req, res) => {
    const nonce = uuidv4();
    req.session.nonce = nonce;
    res.json({ nonce });
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { message, signature } = req.body;
      
      if (!message || !signature) {
        return res.status(400).json({ message: "Missing message or signature" });
      }

      const siweMessage = new SiweMessage(message);
      const { data: fields } = await siweMessage.verify({
        signature,
        nonce: req.session.nonce
      });

      if (fields.nonce !== req.session.nonce) {
        return res.status(401).json({ message: "Invalid nonce" });
      }

      const walletAddress = fields.address;
      
      // Check if user exists
      let user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        // Create new user and mint demo energy
        user = await storage.createUser({
          walletAddress,
          energyBalance: "1000", // Demo energy for new users
          ethBalance: "0",
          totalEarnings: "0",
          isNewUser: true
        });

        // Mint demo energy tokens on blockchain
        try {
          await blockchainService.mintDemoEnergy(walletAddress, "1000");
        } catch (error) {
          console.error("Failed to mint demo energy:", error);
        }
      } else {
        // Update ETH balance from blockchain
        try {
          const ethBalance = await blockchainService.getEthBalance(walletAddress);
          const energyBalance = await blockchainService.getEnergyBalance(walletAddress);
          
          await storage.updateUser(user.id, { 
            ethBalance: ethBalance.toString(),
            energyBalance: energyBalance.toString()
          });
          
          user = await storage.getUser(user.id);
        } catch (error) {
          console.error("Failed to update balances from blockchain:", error);
        }
      }

      // Set session
      req.session.userId = user!.id;
      req.session.walletAddress = walletAddress;
      delete req.session.nonce; // Clear nonce after use

      res.json({ user });
    } catch (error) {
      console.error("SIWE verification error:", error);
      res.status(401).json({ message: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Legacy auth route (deprecated)
  app.post("/api/auth/connect", async (req, res) => {
    try {
      const { walletAddress, signature, message } = req.body;
      
      if (!walletAddress || !signature || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify signature with blockchain service
      const isValidSignature = await blockchainService.verifySignature(walletAddress, message, signature);
      if (!isValidSignature) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      // Check if user exists
      let user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        // Create new user and mint demo energy
        user = await storage.createUser({
          walletAddress,
          energyBalance: "1000", // Demo energy for new users
          ethBalance: "0",
          totalEarnings: "0",
          isNewUser: true
        });

        // Mint demo energy tokens on blockchain
        try {
          await blockchainService.mintDemoEnergy(walletAddress, "1000");
        } catch (error) {
          console.error("Failed to mint demo energy:", error);
        }
      } else {
        // Update ETH balance from blockchain
        const ethBalance = await blockchainService.getEthBalance(walletAddress);
        const energyBalance = await blockchainService.getEnergyBalance(walletAddress);
        
        await storage.updateUser(user.id, { 
          ethBalance: ethBalance.toString(),
          energyBalance: energyBalance.toString()
        });
        
        user = await storage.getUser(user.id);
      }

      res.json({ user });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // User routes
  app.get("/api/users/:walletAddress", requireAuth, async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update balances from blockchain
      const ethBalance = await blockchainService.getEthBalance(walletAddress);
      const energyBalance = await blockchainService.getEnergyBalance(walletAddress);
      
      const updatedUser = await storage.updateUser(user.id, { 
        ethBalance: ethBalance.toString(),
        energyBalance: energyBalance.toString()
      });

      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Energy listing routes
  app.get("/api/listings", async (req, res) => {
    try {
      const listings = await storage.getActiveEnergyListings();
      
      // Enrich with seller information
      const enrichedListings = await Promise.all(
        listings.map(async (listing) => {
          const seller = await storage.getUser(listing.sellerId);
          return {
            ...listing,
            seller: seller ? {
              id: seller.id,
              walletAddress: seller.walletAddress
            } : null
          };
        })
      );

      res.json({ listings: enrichedListings });
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get("/api/listings/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const listings = await storage.getUserEnergyListings(userId);
      res.json({ listings });
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(500).json({ message: "Failed to fetch user listings" });
    }
  });

  app.post("/api/listings", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEnergyListingSchema.parse(req.body);
      
      // Verify user has enough energy balance
      const user = await storage.getUser(validatedData.sellerId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userEnergyBalance = parseFloat(user.energyBalance);
      const listingAmount = parseFloat(validatedData.amountKWh);
      
      if (userEnergyBalance < listingAmount) {
        return res.status(400).json({ message: "Insufficient energy balance" });
      }

      // Create listing on blockchain
      const txHash = await blockchainService.createListing(
        user.walletAddress,
        validatedData.amountKWh,
        validatedData.ratePerKWh
      );

      const listing = await storage.createEnergyListing({
        sellerId: validatedData.sellerId,
        amountKWh: validatedData.amountKWh,
        ratePerKWh: validatedData.ratePerKWh,
        totalValue: validatedData.totalValue,
        isActive: validatedData.isActive,
        blockchainTxHash: txHash
      });

      res.json({ listing });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating listing:", error);
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.delete("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const listing = await storage.getEnergyListing(id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      if (listing.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Cancel listing on blockchain
      const user = await storage.getUser(userId);
      if (user) {
        await blockchainService.cancelListing(user.walletAddress, id);
      }

      await storage.deactivateEnergyListing(id);
      res.json({ message: "Listing cancelled" });
    } catch (error) {
      console.error("Error cancelling listing:", error);
      res.status(500).json({ message: "Failed to cancel listing" });
    }
  });

  // Transaction routes
  app.post("/api/transactions/buy", requireAuth, async (req, res) => {
    try {
      const { buyerId, listingId, amount } = req.body;

      if (!buyerId || !listingId || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const listing = await storage.getEnergyListing(listingId);
      if (!listing || !listing.isActive) {
        return res.status(404).json({ message: "Listing not found or inactive" });
      }

      const buyer = await storage.getUser(buyerId);
      const seller = await storage.getUser(listing.sellerId);
      
      if (!buyer || !seller) {
        return res.status(404).json({ message: "User not found" });
      }

      const amountNum = parseFloat(amount);
      const rateNum = parseFloat(listing.ratePerKWh);
      const totalCost = amountNum * rateNum;

      // Check buyer's ETH balance
      const buyerEthBalance = parseFloat(buyer.ethBalance);
      if (buyerEthBalance < totalCost) {
        return res.status(400).json({ message: "Insufficient ETH balance" });
      }

      // Check listing has enough energy
      const listingAmount = parseFloat(listing.amountKWh);
      if (listingAmount < amountNum) {
        return res.status(400).json({ message: "Insufficient energy available" });
      }

      // Execute transaction on blockchain
      const txHash = await blockchainService.buyEnergy(
        buyer.walletAddress,
        seller.walletAddress,
        amount,
        totalCost.toString()
      );

      // Create transaction record
      const transaction = await storage.createTransaction({
        buyerId,
        sellerId: listing.sellerId,
        listingId,
        amountKWh: amount,
        ratePerKWh: listing.ratePerKWh,
        totalCost: totalCost.toString(),
        transactionType: "buy",
        blockchainTxHash: txHash,
        status: "completed"
      });

      // Update user balances
      await storage.updateUser(buyerId, {
        ethBalance: (buyerEthBalance - totalCost).toString(),
        energyBalance: (parseFloat(buyer.energyBalance) + amountNum).toString()
      });

      await storage.updateUser(listing.sellerId, {
        ethBalance: (parseFloat(seller.ethBalance) + totalCost).toString(),
        energyBalance: (parseFloat(seller.energyBalance) - amountNum).toString(),
        totalEarnings: (parseFloat(seller.totalEarnings) + totalCost).toString()
      });

      // Update or deactivate listing
      const remainingAmount = listingAmount - amountNum;
      if (remainingAmount <= 0) {
        await storage.deactivateEnergyListing(listingId);
      } else {
        await storage.updateEnergyListing(listingId, {
          amountKWh: remainingAmount.toString(),
          totalValue: (remainingAmount * rateNum).toString()
        });
      }

      res.json({ transaction });
    } catch (error) {
      console.error("Error processing purchase:", error);
      res.status(500).json({ message: "Failed to process purchase" });
    }
  });

  app.get("/api/transactions/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const transactions = await storage.getUserTransactions(userId);
      
      // Enrich with counterparty information
      const enrichedTransactions = await Promise.all(
        transactions.map(async (transaction) => {
          const buyer = await storage.getUser(transaction.buyerId);
          const seller = await storage.getUser(transaction.sellerId);
          
          return {
            ...transaction,
            buyer: buyer ? {
              id: buyer.id,
              walletAddress: buyer.walletAddress
            } : null,
            seller: seller ? {
              id: seller.id,
              walletAddress: seller.walletAddress
            } : null
          };
        })
      );

      res.json({ transactions: enrichedTransactions });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
