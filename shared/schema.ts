import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  decimal,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  energyBalance: decimal("energy_balance", { precision: 18, scale: 8 })
    .notNull()
    .default("0"),
  ethBalance: decimal("eth_balance", { precision: 18, scale: 8 })
    .notNull()
    .default("0"),
  totalEarnings: decimal("total_earnings", { precision: 18, scale: 8 })
    .notNull()
    .default("0"),
  isNewUser: boolean("is_new_user").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const energyListings = pgTable("energy_listings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id")
    .notNull()
    .references(() => users.id),
  amountKWh: decimal("amount_kwh", { precision: 18, scale: 8 }).notNull(),
  ratePerKWh: decimal("rate_per_kwh", { precision: 18, scale: 18 }).notNull(),
  totalValue: decimal("total_value", { precision: 18, scale: 18 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  blockchainTxHash: text("blockchain_tx_hash"),
  blockchainListingId: integer("blockchain_listing_id"), // Numeric ID from smart contract
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id")
    .notNull()
    .references(() => users.id),
  sellerId: varchar("seller_id")
    .notNull()
    .references(() => users.id),
  listingId: varchar("listing_id")
    .notNull()
    .references(() => energyListings.id),
  amountKWh: decimal("amount_kwh", { precision: 18, scale: 8 }).notNull(),
  ratePerKWh: decimal("rate_per_kwh", { precision: 18, scale: 18 }).notNull(),
  totalCost: decimal("total_cost", { precision: 18, scale: 18 }).notNull(),
  transactionType: text("transaction_type").notNull(), // 'buy', 'sell', 'demo'
  blockchainTxHash: text("blockchain_tx_hash").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Session table for express-session storage
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(), // JSON stored as text
  expire: timestamp("expire").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEnergyListingSchema = createInsertSchema(
  energyListings
).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEnergyListing = z.infer<typeof insertEnergyListingSchema>;
export type EnergyListing = typeof energyListings.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
