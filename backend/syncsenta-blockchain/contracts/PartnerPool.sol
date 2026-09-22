// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SyncToken.sol";

/// @title PartnerPool
/// @notice Corporate partner token pool for auto-distribution to top performers
/// @dev Partners deposit SyncTokens; auto-distributed based on on-chain learning records
contract PartnerPool is Ownable {
    SyncToken public syncToken;

    struct Partner {
        string name;
        address wallet;
        uint256 totalDeposited;
        uint256 totalDistributed;
        bool active;
    }

    struct Distribution {
        address learner;
        uint256 amount;
        string reason; // e.g., "top_performer_q1_2026"
        uint256 timestamp;
    }

    mapping(address => Partner) public partners;
    address[] public partnerList;
    Distribution[] public distributions;

    uint256 public poolBalance;

    event PartnerRegistered(address indexed partner, string name);
    event TokensDeposited(address indexed partner, uint256 amount);
    event TokensDistributed(address indexed learner, uint256 amount, string reason);

    modifier onlyPartner() {
        require(partners[msg.sender].active, "Not a registered partner");
        _;
    }

    constructor(address _syncToken) Ownable(msg.sender) {
        syncToken = SyncToken(_syncToken);
    }

    /// @notice Register a corporate partner
    function registerPartner(address partnerAddress, string calldata name) external onlyOwner {
        require(partnerAddress != address(0), "Invalid partner address");
        partners[partnerAddress] = Partner({
            name: name,
            wallet: partnerAddress,
            totalDeposited: 0,
            totalDistributed: 0,
            active: true
        });
        partnerList.push(partnerAddress);
        emit PartnerRegistered(partnerAddress, name);
    }

    /// @notice Partner deposits tokens into the pool
    function deposit(uint256 amount) external onlyPartner {
        require(amount > 0, "Amount must be greater than 0");
        require(
            syncToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        partners[msg.sender].totalDeposited += amount;
        poolBalance += amount;
        emit TokensDeposited(msg.sender, amount);
    }

    /// @notice Distribute tokens to top performers (called by owner/backend)
    /// @param learners Array of top performer addresses
    /// @param amounts Array of token amounts for each learner
    /// @param reason Description of the distribution (e.g., "top_performer_q1_2026")
    function distribute(
        address[] calldata learners,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyOwner {
        require(learners.length == amounts.length, "Arrays must have same length");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(poolBalance >= totalAmount, "Insufficient pool balance");

        for (uint256 i = 0; i < learners.length; i++) {
            require(learners[i] != address(0), "Invalid learner address");
            require(syncToken.transfer(learners[i], amounts[i]), "Transfer failed");
            distributions.push(Distribution({
                learner: learners[i],
                amount: amounts[i],
                reason: reason,
                timestamp: block.timestamp
            }));
            emit TokensDistributed(learners[i], amounts[i], reason);
        }

        poolBalance -= totalAmount;
    }

    /// @notice Get total number of distributions
    function totalDistributions() external view returns (uint256) {
        return distributions.length;
    }

    /// @notice Get total number of registered partners
    function totalPartners() external view returns (uint256) {
        return partnerList.length;
    }
}
