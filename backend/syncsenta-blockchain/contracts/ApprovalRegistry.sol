// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ApprovalRegistry
/// @notice Immutable on-chain record of all approval decisions in the 7-tier hierarchy
/// @dev Records are append-only; provides tamper-proof audit trail
contract ApprovalRegistry is Ownable {
    struct ApprovalRecord {
        address applicant;
        address approver;
        string role;
        bool approved;
        uint256 timestamp;
        string reason; // Optional reason for rejection
    }

    mapping(bytes32 => ApprovalRecord) public approvals;
    bytes32[] public approvalIds;

    mapping(address => bool) public recorders;

    event ApprovalRecorded(
        bytes32 indexed recordId,
        address indexed applicant,
        address indexed approver,
        string role,
        bool approved
    );
    event RecorderAdded(address indexed recorder);

    modifier onlyRecorder() {
        require(recorders[msg.sender] || msg.sender == owner(), "Not an authorized recorder");
        _;
    }

    constructor() Ownable(msg.sender) {
        recorders[msg.sender] = true;
    }

    /// @notice Add an authorized recorder (e.g., the backend service)
    function addRecorder(address recorder) external onlyOwner {
        recorders[recorder] = true;
        emit RecorderAdded(recorder);
    }

    /// @notice Record an approval decision on-chain
    /// @param applicant The applicant's wallet address
    /// @param approver The approver's wallet address
    /// @param role The role being approved/rejected
    /// @param approved Whether the decision was to approve
    /// @param reason Optional reason (empty string if approved)
    /// @return recordId The unique record identifier
    function recordApproval(
        address applicant,
        address approver,
        string calldata role,
        bool approved,
        string calldata reason
    ) external onlyRecorder returns (bytes32) {
        require(applicant != address(0), "Invalid applicant address");
        require(approver != address(0), "Invalid approver address");
        require(bytes(role).length > 0, "Role cannot be empty");

        bytes32 recordId = keccak256(
            abi.encodePacked(applicant, role, block.timestamp, block.number)
        );

        approvals[recordId] = ApprovalRecord({
            applicant: applicant,
            approver: approver,
            role: role,
            approved: approved,
            timestamp: block.timestamp,
            reason: reason
        });

        approvalIds.push(recordId);

        emit ApprovalRecorded(recordId, applicant, approver, role, approved);
        return recordId;
    }

    /// @notice Get the total number of approval records
    function totalRecords() external view returns (uint256) {
        return approvalIds.length;
    }

    /// @notice Check if an applicant has been approved for a role
    function isApproved(address applicant, string calldata role) external view returns (bool) {
        for (uint256 i = approvalIds.length; i > 0; i--) {
            ApprovalRecord memory record = approvals[approvalIds[i - 1]];
            if (record.applicant == applicant &&
                keccak256(bytes(record.role)) == keccak256(bytes(role))) {
                return record.approved;
            }
        }
        return false;
    }
}
