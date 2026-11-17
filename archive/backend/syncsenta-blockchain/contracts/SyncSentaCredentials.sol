// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SyncSentaCredentials
/// @notice ERC-721 NFT for blockchain-backed learning credentials
/// @dev Credentials are minted on 90%+ mastery achievement; metadata stored on IPFS
contract SyncSentaCredentials is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    struct Credential {
        address learner;
        string skillId;
        string evidenceHash; // IPFS CID of credential metadata
        uint256 issuedAt;
        bool revoked;
    }

    mapping(uint256 => Credential) public credentials;
    mapping(address => bool) public issuers;

    event CredentialMinted(uint256 indexed tokenId, address indexed learner, string skillId);
    event CredentialRevoked(uint256 indexed tokenId);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    modifier onlyIssuer() {
        require(issuers[msg.sender] || msg.sender == owner(), "Not an authorized issuer");
        _;
    }

    constructor() ERC721("SyncSenta Credential", "SSC") Ownable(msg.sender) {
        issuers[msg.sender] = true;
    }

    /// @notice Add an authorized credential issuer
    function addIssuer(address issuer) external onlyOwner {
        issuers[issuer] = true;
        emit IssuerAdded(issuer);
    }

    /// @notice Remove an authorized credential issuer
    function removeIssuer(address issuer) external onlyOwner {
        issuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /// @notice Mint a new credential NFT on mastery achievement
    /// @param learner The learner's wallet address
    /// @param skillId The CBC curriculum skill identifier
    /// @param evidenceHash IPFS CID of the credential evidence
    /// @return tokenId The minted token ID
    function mintCredential(
        address learner,
        string calldata skillId,
        string calldata evidenceHash
    ) external onlyIssuer returns (uint256) {
        require(learner != address(0), "Invalid learner address");
        require(bytes(skillId).length > 0, "Skill ID cannot be empty");
        require(bytes(evidenceHash).length > 0, "Evidence hash cannot be empty");

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(learner, tokenId);

        credentials[tokenId] = Credential({
            learner: learner,
            skillId: skillId,
            evidenceHash: evidenceHash,
            issuedAt: block.timestamp,
            revoked: false
        });

        emit CredentialMinted(tokenId, learner, skillId);
        return tokenId;
    }

    /// @notice Verify a credential's validity
    /// @param tokenId The token ID to verify
    /// @return valid Whether the credential is valid (not revoked)
    /// @return learner The credential holder's address
    /// @return skillId The skill identifier
    function verifyCredential(uint256 tokenId)
        external
        view
        returns (bool valid, address learner, string memory skillId)
    {
        require(_ownerOf(tokenId) != address(0), "Credential does not exist");
        Credential memory cred = credentials[tokenId];
        return (!cred.revoked, cred.learner, cred.skillId);
    }

    /// @notice Revoke a credential (e.g., on academic misconduct)
    /// @param tokenId The token ID to revoke
    function revokeCredential(uint256 tokenId) external onlyIssuer {
        require(_ownerOf(tokenId) != address(0), "Credential does not exist");
        require(!credentials[tokenId].revoked, "Already revoked");
        credentials[tokenId].revoked = true;
        emit CredentialRevoked(tokenId);
    }

    /// @notice Get total credentials minted
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
