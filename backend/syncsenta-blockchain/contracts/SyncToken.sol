// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SyncToken
/// @notice ERC-20 token for SyncSenta's learn-to-earn economy
/// @dev Minted on learning milestones, burned on redemption
contract SyncToken is ERC20, Ownable {
    mapping(address => bool) public minters;

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 billion tokens

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not an authorized minter");
        _;
    }

    constructor() ERC20("SyncToken", "SYNC") Ownable(msg.sender) {
        minters[msg.sender] = true;
    }

    /// @notice Add an authorized minter (e.g., the backend service)
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /// @notice Remove an authorized minter
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /// @notice Mint tokens on learning milestone completion
    /// @param to The learner's wallet address
    /// @param amount The amount of tokens to mint (in wei)
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /// @notice Burn tokens on redemption (course purchase, mentorship, hardware subsidy)
    /// @param amount The amount of tokens to burn
    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /// @notice Burn tokens from a specific address (with allowance)
    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "Insufficient allowance");
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }
}
