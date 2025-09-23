import { type User, type InsertUser, type EnergyListing, type InsertEnergyListing, type Transaction, type InsertTransaction, users, energyListings, transactions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Energy listing operations
  getEnergyListing(id: string): Promise<EnergyListing | undefined>;
  getActiveEnergyListings(): Promise<EnergyListing[]>;
  getUserEnergyListings(sellerId: string): Promise<EnergyListing[]>;
  createEnergyListing(listing: InsertEnergyListing): Promise<EnergyListing>;
  updateEnergyListing(id: string, updates: Partial<EnergyListing>): Promise<EnergyListing | undefined>;
  deactivateEnergyListing(id: string): Promise<boolean>;

  // Transaction operations
  getTransaction(id: string): Promise<Transaction | undefined>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private energyListings: Map<string, EnergyListing>;
  private transactions: Map<string, Transaction>;

  constructor() {
    this.users = new Map();
    this.energyListings = new Map();
    this.transactions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      walletAddress: insertUser.walletAddress,
      energyBalance: insertUser.energyBalance || "0",
      ethBalance: insertUser.ethBalance || "0", 
      totalEarnings: insertUser.totalEarnings || "0",
      isNewUser: insertUser.isNewUser ?? true,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getEnergyListing(id: string): Promise<EnergyListing | undefined> {
    return this.energyListings.get(id);
  }

  async getActiveEnergyListings(): Promise<EnergyListing[]> {
    return Array.from(this.energyListings.values()).filter(listing => listing.isActive);
  }

  async getUserEnergyListings(sellerId: string): Promise<EnergyListing[]> {
    return Array.from(this.energyListings.values()).filter(listing => listing.sellerId === sellerId);
  }

  async createEnergyListing(insertListing: InsertEnergyListing): Promise<EnergyListing> {
    const id = randomUUID();
    const listing: EnergyListing = { 
      id,
      sellerId: insertListing.sellerId,
      amountKWh: insertListing.amountKWh,
      ratePerKWh: insertListing.ratePerKWh,
      totalValue: insertListing.totalValue,
      isActive: insertListing.isActive ?? true,
      blockchainTxHash: insertListing.blockchainTxHash || null,
      createdAt: new Date()
    };
    this.energyListings.set(id, listing);
    return listing;
  }

  async updateEnergyListing(id: string, updates: Partial<EnergyListing>): Promise<EnergyListing | undefined> {
    const listing = this.energyListings.get(id);
    if (!listing) return undefined;
    
    const updatedListing = { ...listing, ...updates };
    this.energyListings.set(id, updatedListing);
    return updatedListing;
  }

  async deactivateEnergyListing(id: string): Promise<boolean> {
    const listing = this.energyListings.get(id);
    if (!listing) return false;
    
    listing.isActive = false;
    this.energyListings.set(id, listing);
    return true;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.buyerId === userId || transaction.sellerId === userId
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = { 
      id,
      buyerId: insertTransaction.buyerId,
      sellerId: insertTransaction.sellerId,
      listingId: insertTransaction.listingId,
      amountKWh: insertTransaction.amountKWh,
      ratePerKWh: insertTransaction.ratePerKWh,
      totalCost: insertTransaction.totalCost,
      transactionType: insertTransaction.transactionType,
      blockchainTxHash: insertTransaction.blockchainTxHash,
      status: insertTransaction.status || "pending",
      createdAt: new Date()
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...updates };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getEnergyListing(id: string): Promise<EnergyListing | undefined> {
    const [listing] = await db.select().from(energyListings).where(eq(energyListings.id, id));
    return listing || undefined;
  }

  async getActiveEnergyListings(): Promise<EnergyListing[]> {
    return await db.select().from(energyListings).where(eq(energyListings.isActive, true));
  }

  async getUserEnergyListings(sellerId: string): Promise<EnergyListing[]> {
    return await db.select().from(energyListings).where(eq(energyListings.sellerId, sellerId));
  }

  async createEnergyListing(insertListing: InsertEnergyListing): Promise<EnergyListing> {
    const [listing] = await db.insert(energyListings).values(insertListing).returning();
    return listing;
  }

  async updateEnergyListing(id: string, updates: Partial<EnergyListing>): Promise<EnergyListing | undefined> {
    const [listing] = await db.update(energyListings).set(updates).where(eq(energyListings.id, id)).returning();
    return listing || undefined;
  }

  async deactivateEnergyListing(id: string): Promise<boolean> {
    const result = await db.update(energyListings).set({ isActive: false }).where(eq(energyListings.id, id)).returning();
    return result.length > 0;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(
      or(
        eq(transactions.buyerId, userId),
        eq(transactions.sellerId, userId)
      )
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return transaction || undefined;
  }
}

export const storage = new DatabaseStorage();
