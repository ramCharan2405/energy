# EnergyMarket - Decentralized Energy Trading Platform

## Overview

EnergyMarket is a full-stack decentralized application (dApp) that enables peer-to-peer energy trading using blockchain technology. The platform allows users to buy and sell energy units (kWh) through smart contracts deployed on the Ethereum Sepolia testnet. Users can connect their MetaMask wallets, list energy for sale, purchase energy from other users, and track their transaction history.

The application combines a React frontend with a Node.js/Express backend, uses Drizzle ORM with PostgreSQL for data persistence, and integrates with Ethereum smart contracts for blockchain interactions. New users receive demo energy tokens to facilitate immediate platform engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Web3 Integration**: Custom Web3Context using ethers.js for wallet connections and blockchain interactions
- **Authentication**: Context-based auth system with MetaMask signature verification

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Storage Layer**: Abstracted storage interface with in-memory fallback for development
- **API Design**: RESTful endpoints for user management, energy listings, and transactions
- **Blockchain Service**: Dedicated service layer for smart contract interactions using ethers.js

### Smart Contract Layer
- **Blockchain**: Ethereum Sepolia testnet for development and testing
- **Development**: Hardhat framework for contract compilation, testing, and deployment
- **Contracts**: EnergyToken (ERC-20) for energy units and Marketplace for trading logic
- **Security**: OpenZeppelin contracts for standard implementations and security patterns

### Data Storage
- **Primary Database**: PostgreSQL with connection pooling via Neon Database
- **ORM**: Drizzle with schema-first approach and automatic migrations
- **Schema Design**: Users, energy listings, and transactions with proper foreign key relationships
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

### Authentication & Security
- **Wallet Authentication**: MetaMask signature-based authentication without passwords
- **Message Signing**: Time-stamped messages to prevent replay attacks
- **Authorization**: Wallet address-based user identification and ownership verification
- **CORS & Security**: Express middleware for request logging and error handling

## External Dependencies

### Blockchain Infrastructure
- **Ethereum Sepolia**: Testnet for smart contract deployment and testing
- **Alchemy**: Primary RPC provider for blockchain connectivity and reliability
- **MetaMask**: Browser wallet for user authentication and transaction signing
- **Etherscan**: Contract verification and blockchain exploration

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations with automatic schema migrations

### Development & Build Tools
- **Vite**: Frontend build tool with HMR and optimized production builds
- **Hardhat**: Ethereum development environment for smart contract development
- **TypeScript**: Type safety across frontend, backend, and shared schemas
- **Tailwind CSS**: Utility-first styling framework with shadcn/ui component system

### Third-Party Libraries
- **TanStack Query**: Server state management with caching and background updates
- **React Hook Form**: Form handling with validation using Zod schemas
- **date-fns**: Date manipulation and formatting utilities
- **Radix UI**: Accessible component primitives for complex UI interactions

### Hosting & Deployment
- **Replit**: Development environment with integrated hosting capabilities
- **Environment Variables**: Secure configuration for API keys, database URLs, and contract addresses