// Contract addresses and ABIs for the Energy Marketplace
export const CONTRACT_ADDRESSES = {
  ENERGY_TOKEN: import.meta.env.VITE_ENERGY_TOKEN_ADDRESS || "",
  MARKETPLACE: import.meta.env.VITE_MARKETPLACE_ADDRESS || "",
};

// Sepolia testnet configuration
export const NETWORK_CONFIG = {
  CHAIN_ID: 11155111, // Sepolia
  CHAIN_NAME: "Sepolia test network",
  RPC_URL: import.meta.env.VITE_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo",
  BLOCK_EXPLORER: "https://sepolia.etherscan.io/",
  NATIVE_CURRENCY: {
    name: "SepoliaETH",
    symbol: "SEP",
    decimals: 18,
  },
};

// EnergyToken Contract ABI
export const ENERGY_TOKEN_ABI = [
  // Read functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  
  // Write functions
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  
  // Owner functions (for demo energy minting)
  "function mint(address to, uint256 amount)",
  "function mintDemoEnergy(address to)",
  "function burn(uint256 amount)",
  "function burnFrom(address account, uint256 amount)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event EnergyMinted(address indexed to, uint256 amount)",
  "event EnergyBurned(address indexed from, uint256 amount)"
] as const;

// Marketplace Contract ABI
export const MARKETPLACE_ABI = [
  // Structs (defined as tuples in ABI)
  "struct Listing { uint256 id; address seller; uint256 amountKWh; uint256 ratePerKWh; uint256 totalValue; bool active; uint256 createdAt }",
  
  // Read functions
  "function energyToken() view returns (address)",
  "function nextListingId() view returns (uint256)",
  "function listings(uint256 id) view returns (tuple(uint256 id, address seller, uint256 amountKWh, uint256 ratePerKWh, uint256 totalValue, bool active, uint256 createdAt))",
  "function userListings(address user, uint256 index) view returns (uint256)",
  "function getActiveListings() view returns (tuple(uint256 id, address seller, uint256 amountKWh, uint256 ratePerKWh, uint256 totalValue, bool active, uint256 createdAt)[])",
  "function getUserListings(address user) view returns (uint256[])",
  
  // Write functions
  "function createListing(uint256 amountKWh, uint256 ratePerKWh)",
  "function buyEnergy(uint256 listingId, uint256 amount) payable",
  "function cancelListing(uint256 listingId)",
  
  // Owner functions
  "function withdrawPlatformFees()",
  
  // Events
  "event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 amountKWh, uint256 ratePerKWh)",
  "event EnergyPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 amount, uint256 totalCost)",
  "event ListingCancelled(uint256 indexed listingId, address indexed seller)",
  "event ListingUpdated(uint256 indexed listingId, uint256 newAmount)"
] as const;

// Gas limits for different operations
export const GAS_LIMITS = {
  APPROVE: 50000,
  MINT_DEMO_ENERGY: 100000,
  CREATE_LISTING: 150000,
  BUY_ENERGY: 200000,
  CANCEL_LISTING: 100000,
} as const;

// Common token decimals
export const TOKEN_DECIMALS = 18;

// Platform fee percentage (0.25%)
export const PLATFORM_FEE_PERCENT = 25;

// Default gas price (in gwei)
export const DEFAULT_GAS_PRICE = 20;

// Contract deployment block numbers (for event filtering)
export const DEPLOYMENT_BLOCKS = {
  ENERGY_TOKEN: import.meta.env.VITE_ENERGY_TOKEN_DEPLOYMENT_BLOCK || 0,
  MARKETPLACE: import.meta.env.VITE_MARKETPLACE_DEPLOYMENT_BLOCK || 0,
};

export default {
  CONTRACT_ADDRESSES,
  NETWORK_CONFIG,
  ENERGY_TOKEN_ABI,
  MARKETPLACE_ABI,
  GAS_LIMITS,
  TOKEN_DECIMALS,
  PLATFORM_FEE_PERCENT,
  DEFAULT_GAS_PRICE,
  DEPLOYMENT_BLOCKS,
};
