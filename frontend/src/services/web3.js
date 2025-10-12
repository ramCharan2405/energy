import { ethers } from 'ethers';

// Contract ABIs (simplified - you should import the full ABIs from your contract artifacts)
const TOKEN_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
];

const MARKETPLACE_ABI = [
    // Correct function signatures from deployed contract
    'function createListing(uint256 amountInTokens, uint256 pricePerTokenInWei) returns (uint256)',
    'function buyEnergy(uint256 listingId) payable',
    'function cancelListing(uint256 listingId)',
    'function getListing(uint256 listingId) view returns (tuple(uint256 id, address seller, uint256 amountInTokens, uint256 pricePerTokenInWei, uint256 totalPriceInWei, bool isActive, uint256 createdAt))',
    'function getUserListings(address user) view returns (tuple(uint256 id, address seller, uint256 amountInTokens, uint256 pricePerTokenInWei, uint256 totalPriceInWei, bool isActive, uint256 createdAt)[])',
    'function getActiveListings() view returns (tuple(uint256 id, address seller, uint256 amountInTokens, uint256 pricePerTokenInWei, uint256 totalPriceInWei, bool isActive, uint256 createdAt)[])',
    'event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 amountInTokens, uint256 pricePerTokenInWei, uint256 totalPriceInWei)',
    'event EnergyPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 amountInTokens, uint256 totalPriceInWei, uint256 platformFee)',
    'event ListingCancelled(uint256 indexed listingId, address indexed seller)'
];

// Contract addresses from your deployed contracts
export const TOKEN_ADDRESS = '0x9faEA50ed06Ca785221Eb153A2683663f7AF6579';
export const MARKETPLACE_ADDRESS = '0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA';

let provider = null;
let signer = null;
let tokenContract = null;
let marketplaceContract = null;

// Reset connection (clear cached instances)
export const resetConnection = () => {
    console.log('[web3] Resetting connection...');
    provider = null;
    signer = null;
    tokenContract = null;
    marketplaceContract = null;
};

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

// Get provider
export const getProvider = () => {
    if (!provider && isMetaMaskInstalled()) {
        provider = new ethers.BrowserProvider(window.ethereum);
    }
    return provider;
};

// Get signer
export const getSigner = async () => {
    const provider = getProvider();
    if (!provider) throw new Error('MetaMask not installed');

    if (!signer) {
        signer = await provider.getSigner();
    }
    return signer;
};

// Connect wallet
export const connectWallet = async () => {
    try {
        console.log('[web3] Starting wallet connection...');

        if (!isMetaMaskInstalled()) {
            throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
        }

        console.log('[web3] MetaMask detected');

        // Reset any previous connection
        resetConnection();

        // Get fresh provider
        const provider = getProvider();

        // Request account access
        console.log('[web3] Requesting accounts...');
        const accounts = await provider.send('eth_requestAccounts', []);
        const address = accounts[0];
        console.log('[web3] Connected to account:', address);

        // Get network
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        console.log('[web3] Current network - ChainId:', chainId);

        // Check if on Sepolia testnet (chainId: 11155111)
        if (chainId !== 11155111) {
            console.log('[web3] Wrong network detected, switching to Sepolia...');
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
                });
                console.log('[web3] Network switched successfully');
                // Wait a moment for the switch to complete and reset connection
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Reset connection after network switch
                resetConnection();

                // Re-get the provider with new network
                const newProvider = getProvider();
                const newNetwork = await newProvider.getNetwork();
                const newChainId = Number(newNetwork.chainId);
                console.log('[web3] Verified new network ChainId:', newChainId);

                // Get balance with new provider
                const balance = await newProvider.getBalance(address);
                const ethBalance = ethers.formatEther(balance);
                console.log('[web3] ETH balance after switch:', ethBalance);

                console.log('[web3] Wallet connection successful ✓');
                return {
                    address,
                    chainId: 11155111,
                    ethBalance,
                };
            } catch (switchError) {
                console.error('[web3] Network switch error:', switchError);
                // This error code indicates that the chain has not been added to MetaMask
                if (switchError.code === 4902) {
                    throw new Error('Please add Sepolia testnet to MetaMask');
                } else if (switchError.code === 4001) {
                    throw new Error('Please approve the network switch in MetaMask');
                }
                throw switchError;
            }
        } else {
            console.log('[web3] Already on Sepolia network ✓');
        }

        // Get balance
        console.log('[web3] Fetching ETH balance...');
        const balance = await provider.getBalance(address);
        const ethBalance = ethers.formatEther(balance);
        console.log('[web3] ETH balance:', ethBalance);

        console.log('[web3] Wallet connection successful ✓');
        return {
            address,
            chainId: 11155111, // Always return Sepolia chainId after switch
            ethBalance,
        };
    } catch (error) {
        console.error('[web3] Error connecting wallet:', error);
        throw error;
    }
};

// Sign message for authentication
export const signMessage = async (message) => {
    try {
        console.log('[web3] Requesting signature from MetaMask...');
        console.log('[web3] Message length:', message.length, 'chars');

        const signer = await getSigner();
        console.log('[web3] Signer obtained, calling signMessage...');

        const signature = await signer.signMessage(message);
        console.log('[web3] Signature obtained:', signature);

        return signature;
    } catch (error) {
        console.error('[web3] Error signing message:', error);
        console.error('[web3] Error code:', error.code);
        console.error('[web3] Error message:', error.message);
        throw error;
    }
};

// Get token contract instance
export const getTokenContract = async () => {
    if (!tokenContract) {
        const signer = await getSigner();
        tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
    }
    return tokenContract;
};

// Get marketplace contract instance
export const getMarketplaceContract = async () => {
    if (!marketplaceContract) {
        const signer = await getSigner();
        marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    }
    return marketplaceContract;
};

// Get token balance
export const getTokenBalance = async (address) => {
    try {
        console.log('[web3] Getting token balance for:', address);
        const contract = await getTokenContract();
        console.log('[web3] Token contract:', contract.target);
        const balance = await contract.balanceOf(address);
        console.log('[web3] Raw balance (wei):', balance.toString());
        const formatted = ethers.formatUnits(balance, 18); // Assuming 18 decimals
        console.log('[web3] Formatted balance:', formatted);
        return formatted;
    } catch (error) {
        console.error('[web3] Error getting token balance:', error);
        throw error;
    }
};

// Get ETH balance
export const getEthBalance = async (address) => {
    try {
        console.log('[web3] Getting ETH balance for:', address);
        const provider = getProvider();
        const balance = await provider.getBalance(address);
        console.log('[web3] Raw ETH balance (wei):', balance.toString());
        const formatted = ethers.formatEther(balance);
        console.log('[web3] Formatted ETH balance:', formatted);
        return formatted;
    } catch (error) {
        console.error('[web3] Error getting ETH balance:', error);
        throw error;
    }
};

// Approve tokens for marketplace
export const approveTokens = async (amount) => {
    try {
        const contract = await getTokenContract();
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const tx = await contract.approve(MARKETPLACE_ADDRESS, amountWei);
        await tx.wait();
        return tx.hash;
    } catch (error) {
        console.error('Error approving tokens:', error);
        throw error;
    }
};

// Create listing
// Note: Smart contract only stores amount and price on-chain
// Additional metadata (location, type, expiry) is stored in database
export const createListing = async (energyAmount, pricePerUnit) => {
    try {
        console.log('[web3] Creating listing on blockchain...');
        console.log('[web3] Energy amount (tokens):', energyAmount);
        console.log('[web3] Price per unit (ETH):', pricePerUnit);

        const contract = await getMarketplaceContract();

        // Smart contract expects:
        // - amountInTokens: uint256 - number of tokens (NOT in wei, just the token count)
        // - pricePerTokenInWei: uint256 - price per token in wei

        // Convert to BigNumber properly
        // For amountInTokens: just use the number directly (e.g., 10 means 10 tokens)
        const amountInTokens = BigInt(Math.floor(parseFloat(energyAmount)));

        // For pricePerTokenInWei: convert ETH price to wei
        const pricePerTokenInWei = ethers.parseEther(pricePerUnit.toString());

        console.log('[web3] Amount in tokens (BigInt):', amountInTokens.toString());
        console.log('[web3] Price per token in wei:', pricePerTokenInWei.toString());

        const tx = await contract.createListing(
            amountInTokens,
            pricePerTokenInWei
        );

        console.log('[web3] Transaction sent:', tx.hash);
        const receipt = await tx.wait();
        console.log('[web3] Transaction confirmed:', receipt);

        // Extract listing ID from events
        const event = receipt.logs.find(log => {
            try {
                return contract.interface.parseLog(log)?.name === 'ListingCreated';
            } catch {
                return false;
            }
        });

        if (event) {
            const parsedEvent = contract.interface.parseLog(event);
            const listingId = parsedEvent.args.listingId || parsedEvent.args[0];
            console.log('[web3] Listing created with ID:', listingId.toString());
            return {
                txHash: tx.hash,
                listingId: listingId.toString()
            };
        }

        console.log('[web3] Listing created, no event found');
        return { txHash: tx.hash };
    } catch (error) {
        console.error('[web3] Error creating listing:', error);
        throw error;
    }
};

// Buy listing
export const buyListing = async (listingId, totalPriceInETH) => {
    try {
        console.log('[web3] Buying listing...');
        console.log('[web3] Listing ID:', listingId);
        console.log('[web3] Total price in ETH:', totalPriceInETH);

        const contract = await getMarketplaceContract();

        // Convert ETH to wei for payment
        const valueInWei = ethers.parseEther(totalPriceInETH.toString());
        console.log('[web3] Value in wei:', valueInWei.toString());

        // Call buyEnergy function (correct function name from contract)
        const tx = await contract.buyEnergy(listingId, {
            value: valueInWei
        });

        console.log('[web3] Purchase transaction sent:', tx.hash);
        const receipt = await tx.wait();
        console.log('[web3] Purchase confirmed in block:', receipt.blockNumber);

        return tx.hash;
    } catch (error) {
        console.error('[web3] Error buying listing:', error);
        throw new Error(error.reason || error.message || 'Failed to purchase listing');
    }
};

// Cancel listing
export const cancelListing = async (listingId) => {
    try {
        const contract = await getMarketplaceContract();
        const tx = await contract.cancelListing(listingId);
        await tx.wait();
        return tx.hash;
    } catch (error) {
        console.error('Error cancelling listing:', error);
        throw error;
    }
};

// Get user listings
export const getUserListings = async (address) => {
    try {
        const contract = await getMarketplaceContract();
        const listingIds = await contract.getUserListings(address);
        return listingIds.map(id => id.toString());
    } catch (error) {
        console.error('Error getting user listings:', error);
        throw error;
    }
};

// Get active listings
export const getActiveListings = async () => {
    try {
        const contract = await getMarketplaceContract();
        const listingIds = await contract.getActiveListings();
        return listingIds.map(id => id.toString());
    } catch (error) {
        console.error('Error getting active listings:', error);
        throw error;
    }
};

// Listen to account changes
export const onAccountsChanged = (callback) => {
    if (isMetaMaskInstalled()) {
        window.ethereum.on('accountsChanged', (accounts) => {
            callback(accounts[0]);
        });
    }
};

// Listen to chain changes
export const onChainChanged = (callback) => {
    if (isMetaMaskInstalled()) {
        window.ethereum.on('chainChanged', (chainId) => {
            callback(parseInt(chainId, 16));
        });
    }
};

// Remove listeners
export const removeListeners = () => {
    if (isMetaMaskInstalled()) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
    }
};
