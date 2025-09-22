// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EnergyToken is ERC20, Ownable {
    uint8 private _decimals = 18;
    
    event EnergyMinted(address indexed to, uint256 amount);
    event EnergyBurned(address indexed from, uint256 amount);
    
    constructor() ERC20("EnergyToken", "kWh") Ownable(msg.sender) {}
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit EnergyMinted(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit EnergyBurned(msg.sender, amount);
    }
    
    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        emit EnergyBurned(account, amount);
    }
    
    // Function to mint demo energy for new users
    function mintDemoEnergy(address to) external onlyOwner {
        uint256 demoAmount = 1000 * 10**_decimals; // 1000 kWh
        _mint(to, demoAmount);
        emit EnergyMinted(to, demoAmount);
    }
}
