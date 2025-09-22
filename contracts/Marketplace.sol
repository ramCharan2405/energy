// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    IERC20 public energyToken;
    
    struct Listing {
        uint256 id;
        address seller;
        uint256 amountKWh;
        uint256 ratePerKWh; // Rate in wei per kWh
        uint256 totalValue;
        bool active;
        uint256 createdAt;
    }
    
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256[]) public userListings;
    uint256 public nextListingId = 1;
    uint256 public constant PLATFORM_FEE_PERCENT = 25; // 0.25% platform fee
    
    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 amountKWh, uint256 ratePerKWh);
    event EnergyPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 amount, uint256 totalCost);
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event ListingUpdated(uint256 indexed listingId, uint256 newAmount);
    
    constructor(address _energyToken) Ownable(msg.sender) {
        energyToken = IERC20(_energyToken);
    }
    
    function createListing(uint256 amountKWh, uint256 ratePerKWh) external {
        require(amountKWh > 0, "Amount must be greater than 0");
        require(ratePerKWh > 0, "Rate must be greater than 0");
        require(energyToken.balanceOf(msg.sender) >= amountKWh, "Insufficient energy balance");
        
        uint256 totalValue = amountKWh * ratePerKWh;
        
        // Transfer energy tokens to escrow (this contract)
        require(energyToken.transferFrom(msg.sender, address(this), amountKWh), "Energy transfer failed");
        
        listings[nextListingId] = Listing({
            id: nextListingId,
            seller: msg.sender,
            amountKWh: amountKWh,
            ratePerKWh: ratePerKWh,
            totalValue: totalValue,
            active: true,
            createdAt: block.timestamp
        });
        
        userListings[msg.sender].push(nextListingId);
        
        emit ListingCreated(nextListingId, msg.sender, amountKWh, ratePerKWh);
        nextListingId++;
    }
    
    function buyEnergy(uint256 listingId, uint256 amount) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy from yourself");
        require(amount > 0 && amount <= listing.amountKWh, "Invalid amount");
        
        uint256 totalCost = amount * listing.ratePerKWh;
        require(msg.value >= totalCost, "Insufficient ETH sent");
        
        // Calculate platform fee
        uint256 platformFee = (totalCost * PLATFORM_FEE_PERCENT) / 10000;
        uint256 sellerAmount = totalCost - platformFee;
        
        // Transfer energy tokens to buyer
        require(energyToken.transfer(msg.sender, amount), "Energy transfer to buyer failed");
        
        // Transfer ETH to seller (minus platform fee)
        (bool success, ) = listing.seller.call{value: sellerAmount}("");
        require(success, "ETH transfer to seller failed");
        
        // Update listing
        listing.amountKWh -= amount;
        listing.totalValue = listing.amountKWh * listing.ratePerKWh;
        
        if (listing.amountKWh == 0) {
            listing.active = false;
        }
        
        // Refund excess ETH to buyer
        if (msg.value > totalCost) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(refundSuccess, "Excess ETH refund failed");
        }
        
        emit EnergyPurchased(listingId, msg.sender, listing.seller, amount, totalCost);
        
        if (!listing.active) {
            emit ListingUpdated(listingId, 0);
        } else {
            emit ListingUpdated(listingId, listing.amountKWh);
        }
    }
    
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Listing not active");
        
        // Return energy tokens to seller
        require(energyToken.transfer(listing.seller, listing.amountKWh), "Energy return failed");
        
        listing.active = false;
        listing.amountKWh = 0;
        listing.totalValue = 0;
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 activeCount = 0;
        
        // Count active listings
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].active) {
                activeCount++;
            }
        }
        
        // Create array of active listings
        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].active) {
                activeListings[index] = listings[i];
                index++;
            }
        }
        
        return activeListings;
    }
    
    function getUserListings(address user) external view returns (uint256[] memory) {
        return userListings[user];
    }
    
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }
    
    receive() external payable {}
}
