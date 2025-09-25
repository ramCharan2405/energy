import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertEnergyListingSchema,
  insertTransactionSchema,
} from "@shared/schema";
import { blockchainService } from "./services/blockchain";
import { wsService } from "./websocket";
import { z } from "zod";

// Session type augmentation
declare module "express-session" {
  interface SessionData {
    userId?: string;
    walletAddress?: string;
    nonce?: string;
  }
}

// Manual SIWE message parser
interface ParsedSiweMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

function parseSiweMessage(message: string): ParsedSiweMessage | null {
  try {
    const lines = message.split("\n");

    if (lines.length < 8) {
      console.log("❌ Invalid message format: too few lines");
      return null;
    }

    // Parse line by line
    const firstLine = lines[0]; // "domain wants you to sign in with your Ethereum account:"
    const address = lines[1].trim(); // "0x..."
    const statement = lines[3].trim(); // "Sign in with Ethereum to EnergyMarket"

    // Parse key-value pairs from remaining lines
    const kvPairs: { [key: string]: string } = {};
    for (let i = 5; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes(":")) {
        const colonIndex = line.indexOf(":");
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        kvPairs[key] = value;
      }
    }

    // Extract domain from first line
    const domainMatch = firstLine.match(/^(.+) wants you to sign in/);
    if (!domainMatch) {
      console.log("❌ Could not extract domain from first line");
      return null;
    }
    const domain = domainMatch[1];

    // Validate required fields
    if (
      !kvPairs["URI"] ||
      !kvPairs["Version"] ||
      !kvPairs["Chain ID"] ||
      !kvPairs["Nonce"] ||
      !kvPairs["Issued At"]
    ) {
      console.log("❌ Missing required fields in SIWE message");
      return null;
    }

    return {
      domain,
      address,
      statement,
      uri: kvPairs["URI"],
      version: kvPairs["Version"],
      chainId: parseInt(kvPairs["Chain ID"]),
      nonce: kvPairs["Nonce"],
      issuedAt: kvPairs["Issued At"],
    };
  } catch (error) {
    console.log("❌ Error parsing SIWE message:", error);
    return null;
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

      console.log("=== Manual SIWE Verification ===");
      console.log("Received message:", message);
      console.log("Received signature:", signature);

      if (!message || !signature) {
        console.log("❌ Missing message or signature");
        return res
          .status(400)
          .json({ message: "Missing message or signature" });
      }

      if (!req.session.nonce) {
        console.log("❌ No nonce in session");
        return res
          .status(401)
          .json({ message: "No nonce found, please request a new one" });
      }

      console.log("✅ Session nonce:", req.session.nonce);

      // Manual SIWE message parsing
      console.log("Parsing SIWE message manually...");
      const parsedMessage = parseSiweMessage(message);

      if (!parsedMessage) {
        console.log("❌ Failed to parse SIWE message");
        return res.status(400).json({ message: "Invalid SIWE message format" });
      }

      console.log("✅ Message parsed successfully:", parsedMessage);

      // Validate message fields
      const expectedDomain = req.get("host") || "localhost";
      console.log(
        "Expected domain:",
        expectedDomain,
        "| Actual domain:",
        parsedMessage.domain
      );
      if (parsedMessage.domain !== expectedDomain) {
        console.log("❌ Domain mismatch");
        return res
          .status(401)
          .json({ message: "Invalid domain in SIWE message" });
      }

      const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
      const expectedUri = `${protocol}://${expectedDomain}`;
      console.log(
        "Expected URI:",
        expectedUri,
        "| Actual URI:",
        parsedMessage.uri
      );
      if (parsedMessage.uri !== expectedUri) {
        console.log("❌ URI mismatch");
        return res.status(401).json({ message: "Invalid URI in SIWE message" });
      }

      console.log(
        "Expected chainId: 11155111 | Actual chainId:",
        parsedMessage.chainId
      );
      if (parsedMessage.chainId !== 11155111) {
        console.log("❌ Chain ID mismatch");
        return res
          .status(401)
          .json({ message: "Invalid chain ID, must be Sepolia (11155111)" });
      }

      console.log(
        "Expected nonce:",
        req.session.nonce,
        "| Actual nonce:",
        parsedMessage.nonce
      );
      if (parsedMessage.nonce !== req.session.nonce) {
        console.log("❌ Nonce mismatch");
        return res.status(401).json({ message: "Invalid nonce" });
      }

      // Verify signature using ethers
      console.log("Verifying signature with ethers...");
      const messageHash = ethers.id(message);
      const recoveredAddress = ethers.verifyMessage(message, signature);

      console.log("Expected address:", parsedMessage.address);
      console.log("Recovered address:", recoveredAddress);

      // Compare addresses (case insensitive)
      if (
        recoveredAddress.toLowerCase() !== parsedMessage.address.toLowerCase()
      ) {
        console.log("❌ Signature verification failed");
        return res.status(401).json({ message: "Invalid signature" });
      }

      console.log("✅ Signature verification successful!");
      const walletAddress = parsedMessage.address; // Check if user exists
      let user = await storage.getUserByWalletAddress(walletAddress);

      if (!user) {
        // Create new user and give initial energy tokens
        user = await storage.createUser({
          walletAddress,
          energyBalance: "1000", // 1000 kWh initial energy for new users
          ethBalance: "0",
          totalEarnings: "0",
          isNewUser: true,
        });

        // Mint real initial energy tokens on blockchain
        try {
          await blockchainService.mintInitialTokens(walletAddress, "1000");
          console.log(
            `🎉 New user ${walletAddress} received 1000 kWh initial tokens`
          );
        } catch (error) {
          console.error("Failed to mint initial tokens:", error);
        }
      } else {
        // Update ETH balance from blockchain
        try {
          const ethBalance = await blockchainService.getEthBalance(
            walletAddress
          );
          const energyBalance = await blockchainService.getEnergyBalance(
            walletAddress
          );

          await storage.updateUser(user.id, {
            ethBalance: ethBalance.toString(),
            energyBalance: energyBalance.toString(),
          });

          user = await storage.getUser(user.id);
        } catch (error) {
          console.error("Failed to update balances from blockchain:", error);
        }
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Session error" });
        }

        // Set session data after regeneration
        req.session.userId = user!.id;
        req.session.walletAddress = walletAddress;

        // Save the session
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ message: "Session error" });
          }

          res.json({ user });
        });
      });
    } catch (error: any) {
      console.error("❌ SIWE verification error:", error);
      console.log("Error type:", error?.constructor?.name);
      console.log("Error message:", error?.message);
      console.log("Full error object:", error);
      res.status(401).json({
        message: "Authentication failed",
        error: error?.message || "Unknown error",
      });
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
      const isValidSignature = await blockchainService.verifySignature(
        walletAddress,
        message,
        signature
      );
      if (!isValidSignature) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      // Check if user exists
      let user = await storage.getUserByWalletAddress(walletAddress);

      if (!user) {
        // Create new user and give initial energy tokens
        user = await storage.createUser({
          walletAddress,
          energyBalance: "1000", // 1000 kWh initial energy for new users
          ethBalance: "0",
          totalEarnings: "0",
          isNewUser: true,
        });

        // Mint real initial energy tokens on blockchain
        try {
          await blockchainService.mintInitialTokens(walletAddress, "1000");
          console.log(
            `🎉 New user ${walletAddress} received 1000 kWh initial tokens`
          );
        } catch (error) {
          console.error("Failed to mint initial tokens:", error);
        }
      } else {
        // Update ETH balance from blockchain
        const ethBalance = await blockchainService.getEthBalance(walletAddress);
        const energyBalance = await blockchainService.getEnergyBalance(
          walletAddress
        );

        await storage.updateUser(user.id, {
          ethBalance: ethBalance.toString(),
          energyBalance: energyBalance.toString(),
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
      const energyBalance = await blockchainService.getEnergyBalance(
        walletAddress
      );

      const updatedUser = await storage.updateUser(user.id, {
        ethBalance: ethBalance.toString(),
        energyBalance: energyBalance.toString(),
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
            seller: seller
              ? {
                  id: seller.id,
                  walletAddress: seller.walletAddress,
                }
              : null,
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
      const { blockchainTxHash, blockchainListingId, ...listingData } =
        req.body;
      const validatedData = insertEnergyListingSchema.parse(listingData);

      // Security: Ensure the authenticated user matches the sellerId
      if (validatedData.sellerId !== req.session.userId) {
        return res
          .status(403)
          .json({ message: "Cannot create listing for another user" });
      }

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

      // Use the blockchain transaction hash from the frontend
      const txHash =
        blockchainTxHash ||
        (await blockchainService.createListing(
          user.walletAddress,
          validatedData.amountKWh,
          validatedData.ratePerKWh
        ));

      const listing = await storage.createEnergyListing({
        sellerId: validatedData.sellerId,
        amountKWh: validatedData.amountKWh,
        ratePerKWh: validatedData.ratePerKWh,
        totalValue: validatedData.totalValue,
        isActive: validatedData.isActive,
        blockchainTxHash: txHash,
        blockchainListingId: blockchainListingId || null,
      });

      res.json({ listing });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating listing:", error);
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.delete("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const listing = await storage.getEnergyListing(id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Security: Verify ownership based on session, not request body
      if (listing.sellerId !== req.session.userId) {
        return res.status(403).json({
          message: "Unauthorized - you can only cancel your own listings",
        });
      }

      // Cancel listing on blockchain
      const user = await storage.getUser(req.session.userId!);
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

  // Debug route for blockchain status
  app.get("/api/debug/blockchain", async (req, res) => {
    try {
      const status = {
        environment: {
          ENERGY_TOKEN_ADDRESS: process.env.ENERGY_TOKEN_ADDRESS,
          MARKETPLACE_ADDRESS: process.env.MARKETPLACE_ADDRESS,
          ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY
            ? "***SET***"
            : "NOT_SET",
          ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY
            ? "***SET***"
            : "NOT_SET",
          RPC_URL: process.env.ALCHEMY_API_KEY
            ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
            : "https://eth-sepolia.g.alchemy.com/v2/demo",
        },
        blockchain: {},
      };

      // Test blockchain connection
      try {
        const adminBalance = await blockchainService.getEthBalance(
          "0x7d63fb667bed96d864e8a259d4cf3f0c2f5a8259" // Test address
        );
        status.blockchain = {
          connected: true,
          testBalance: adminBalance,
        };
      } catch (error: any) {
        status.blockchain = {
          connected: false,
          error: error?.message || "Unknown error",
        };
      }

      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Unknown error" });
    }
  });

  // Transaction routes
  app.post("/api/transactions/buy", requireAuth, async (req, res) => {
    try {
      const { listingId, amount, blockchainTxHash } = req.body;
      const buyerId = req.session.userId!; // Use authenticated user ID

      if (!listingId || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const listing = await storage.getEnergyListing(listingId);
      if (!listing || !listing.isActive) {
        return res
          .status(404)
          .json({ message: "Listing not found or inactive" });
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
        return res
          .status(400)
          .json({ message: "Insufficient energy available" });
      }

      // Use the blockchain transaction hash from the frontend
      const txHash =
        blockchainTxHash ||
        (await blockchainService.buyEnergy(
          buyer.walletAddress,
          seller.walletAddress,
          amount,
          totalCost.toString()
        ));

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
        status: "completed",
      });

      // Update user balances
      await storage.updateUser(buyerId, {
        ethBalance: (buyerEthBalance - totalCost).toString(),
        energyBalance: (parseFloat(buyer.energyBalance) + amountNum).toString(),
      });

      await storage.updateUser(listing.sellerId, {
        ethBalance: (parseFloat(seller.ethBalance) + totalCost).toString(),
        energyBalance: (
          parseFloat(seller.energyBalance) - amountNum
        ).toString(),
        totalEarnings: (
          parseFloat(seller.totalEarnings) + totalCost
        ).toString(),
      });

      // Update or deactivate listing
      const remainingAmount = listingAmount - amountNum;
      if (remainingAmount <= 0) {
        await storage.deactivateEnergyListing(listingId);
      } else {
        await storage.updateEnergyListing(listingId, {
          amountKWh: remainingAmount.toString(),
          totalValue: (remainingAmount * rateNum).toString(),
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
            buyer: buyer
              ? {
                  id: buyer.id,
                  walletAddress: buyer.walletAddress,
                }
              : null,
            seller: seller
              ? {
                  id: seller.id,
                  walletAddress: seller.walletAddress,
                }
              : null,
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
