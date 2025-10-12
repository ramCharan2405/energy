// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EnergyCredit
 * @dev ERC-20 token representing energy credits (1 token = 1 kWh)
 * Includes minting capability for the owner/marketplace
 */
contract EnergyCredit is ERC20, Ownable {
    // Decimals for the token (18 is standard for ERC20)
    uint8 private constant _decimals = 18;
    
    // Events
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Constructor that gives msg.sender all of initial supply
     * @param initialSupply The initial supply of tokens (in tokens, not wei)
     */
    constructor(uint256 initialSupply) ERC20("EnergyCredit", "ENGC") Ownable(msg.sender) {
        // Mint initial supply to contract deployer
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply * 10**decimals());
        }
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mints new tokens to a specified address
     * Can only be called by the owner (typically the marketplace contract)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (in tokens, not wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 amountInWei = amount * 10**decimals();
        _mint(to, amountInWei);
        
        emit TokensMinted(to, amountInWei, "Minted by owner");
    }

    /**
     * @dev Mints tokens for demo/registration purposes
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (in tokens)
     * @param reason The reason for minting
     */
    function mintForDemo(address to, uint256 amount, string memory reason) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 amountInWei = amount * 10**decimals();
        _mint(to, amountInWei);
        
        emit TokensMinted(to, amountInWei, reason);
    }

    /**
     * @dev Burns tokens from the caller's account
     * @param amount The amount of tokens to burn (in wei)
     */
    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance to burn");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Get balance in human-readable format (actual tokens, not wei)
     * @param account The address to check balance for
     */
    function balanceOfInTokens(address account) external view returns (uint256) {
        return balanceOf(account) / 10**decimals();
    }

    /**
     * @dev Transfer ownership and update marketplace address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        super.transferOwnership(newOwner);
    }
}
