// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EnergyMarketplace
 * @dev Marketplace for buying and selling energy credits using Sepolia ETH
 */
contract EnergyMarketplace is Ownable, ReentrancyGuard {
    IERC20 public energyToken;
    
    // Platform fee percentage (e.g., 200 = 2%)
    uint256 public platformFeePercent = 200; // 2%
    uint256 private constant FEE_DENOMINATOR = 10000;
    
    // Listing counter
    uint256 private listingIdCounter;
    
    // Struct to represent a sell offer
    struct Listing {
        uint256 id;
        address seller;
        uint256 amountInTokens; // Amount of energy credits (in tokens, not wei)
        uint256 pricePerTokenInWei; // Price per token in wei (Sepolia ETH)
        uint256 totalPriceInWei; // Total price in wei
        bool isActive;
        uint256 createdAt;
    }
    
    // Mapping from listing ID to Listing
    mapping(uint256 => Listing) public listings;
    
    // Mapping to track user listings
    mapping(address => uint256[]) public userListings;
    
    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        uint256 amountInTokens,
        uint256 pricePerTokenInWei,
        uint256 totalPriceInWei
    );
    
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    
    event EnergyPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 amountInTokens,
        uint256 totalPriceInWei,
        uint256 platformFee
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev Constructor
     * @param _energyToken Address of the EnergyCredit token contract
     */
    constructor(address _energyToken) Ownable(msg.sender) {
        require(_energyToken != address(0), "Invalid token address");
        energyToken = IERC20(_energyToken);
        listingIdCounter = 1;
    }

    /**
     * @dev Create a new sell listing
     * @param amountInTokens Amount of energy credits to sell (in tokens, not wei)
     * @param pricePerTokenInWei Price per token in wei (Sepolia ETH)
     */
    function createListing(
        uint256 amountInTokens,
        uint256 pricePerTokenInWei
    ) external nonReentrant returns (uint256) {
        require(amountInTokens > 0, "Amount must be greater than 0");
        require(pricePerTokenInWei > 0, "Price must be greater than 0");
        
        // Convert tokens to wei for balance check
        uint256 amountInWei = amountInTokens * 10**18;
        require(
            energyToken.balanceOf(msg.sender) >= amountInWei,
            "Insufficient token balance"
        );
        
        // Check allowance
        require(
            energyToken.allowance(msg.sender, address(this)) >= amountInWei,
            "Insufficient token allowance. Please approve tokens first."
        );
        
        // Calculate total price
        uint256 totalPriceInWei = amountInTokens * pricePerTokenInWei;
        
        // Create listing
        uint256 listingId = listingIdCounter++;
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            amountInTokens: amountInTokens,
            pricePerTokenInWei: pricePerTokenInWei,
            totalPriceInWei: totalPriceInWei,
            isActive: true,
            createdAt: block.timestamp
        });
        
        // Track user listing
        userListings[msg.sender].push(listingId);
        
        emit ListingCreated(
            listingId,
            msg.sender,
            amountInTokens,
            pricePerTokenInWei,
            totalPriceInWei
        );
        
        return listingId;
    }

    /**
     * @dev Buy energy credits from a listing
     * @param listingId The ID of the listing to purchase from
     */
    function buyEnergy(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        
        require(listing.isActive, "Listing is not active");
        require(listing.seller != msg.sender, "Cannot buy your own listing");
        require(msg.value >= listing.totalPriceInWei, "Insufficient ETH sent");
        
        // Calculate platform fee
        uint256 platformFee = (listing.totalPriceInWei * platformFeePercent) / FEE_DENOMINATOR;
        uint256 sellerAmount = listing.totalPriceInWei - platformFee;
        
        // Mark listing as inactive
        listing.isActive = false;
        
        // Transfer tokens from seller to buyer
        uint256 amountInWei = listing.amountInTokens * 10**18;
        bool tokenTransferSuccess = energyToken.transferFrom(
            listing.seller,
            msg.sender,
            amountInWei
        );
        require(tokenTransferSuccess, "Token transfer failed");
        
        // Transfer ETH to seller
        (bool sellerPaymentSuccess, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(sellerPaymentSuccess, "ETH transfer to seller failed");
        
        // Refund excess ETH to buyer
        if (msg.value > listing.totalPriceInWei) {
            uint256 refund = msg.value - listing.totalPriceInWei;
            (bool refundSuccess, ) = payable(msg.sender).call{value: refund}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit EnergyPurchased(
            listingId,
            msg.sender,
            listing.seller,
            listing.amountInTokens,
            listing.totalPriceInWei,
            platformFee
        );
    }

    /**
     * @dev Cancel an active listing
     * @param listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.isActive, "Listing is not active");
        
        listing.isActive = false;
        
        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @dev Get all active listings
     */
    function getActiveListings() external view returns (Listing[] memory) {
        // Count active listings
        uint256 activeCount = 0;
        for (uint256 i = 1; i < listingIdCounter; i++) {
            if (listings[i].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active listings
        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i < listingIdCounter; i++) {
            if (listings[i].isActive) {
                activeListings[index] = listings[i];
                index++;
            }
        }
        
        return activeListings;
    }

    /**
     * @dev Get listings by a specific user
     * @param user The address of the user
     */
    function getUserListings(address user) external view returns (Listing[] memory) {
        uint256[] memory listingIds = userListings[user];
        Listing[] memory userListingArray = new Listing[](listingIds.length);
        
        for (uint256 i = 0; i < listingIds.length; i++) {
            userListingArray[i] = listings[listingIds[i]];
        }
        
        return userListingArray;
    }

    /**
     * @dev Get a specific listing by ID
     * @param listingId The ID of the listing
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        require(listingId > 0 && listingId < listingIdCounter, "Invalid listing ID");
        return listings[listingId];
    }

    /**
     * @dev Update platform fee (only owner)
     * @param newFeePercent New fee percentage (e.g., 200 = 2%)
     */
    function updatePlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 1000, "Fee cannot exceed 10%");
        uint256 oldFee = platformFeePercent;
        platformFeePercent = newFeePercent;
        emit PlatformFeeUpdated(oldFee, newFeePercent);
    }

    /**
     * @dev Withdraw accumulated platform fees (only owner)
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @dev Get contract ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get total number of listings created
     */
    function getTotalListings() external view returns (uint256) {
        return listingIdCounter - 1;
    }

    /**
     * @dev Emergency function to update token address (only owner)
     * Use with caution!
     */
    function updateTokenAddress(address newTokenAddress) external onlyOwner {
        require(newTokenAddress != address(0), "Invalid token address");
        energyToken = IERC20(newTokenAddress);
    }

    // Receive function to accept ETH
    receive() external payable {}
}
