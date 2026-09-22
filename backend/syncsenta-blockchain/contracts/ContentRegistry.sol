// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ContentRegistry
/// @notice Decentralized registry of all educational content CIDs on IPFS
/// @dev Provides content ownership tracking and censorship-resistant content discovery
contract ContentRegistry is Ownable {
    struct ContentRecord {
        string ipfsCid;
        address creator;
        uint256 timestamp;
        bool active;
        string contentType; // "lesson", "scheme", "assessment", "resource"
        string curriculumRef; // CBC curriculum reference
    }

    mapping(bytes32 => ContentRecord) public content;
    mapping(address => bytes32[]) public creatorContent;
    bytes32[] public allContentIds;

    mapping(address => bool) public registrars;

    event ContentRegistered(
        bytes32 indexed contentId,
        string ipfsCid,
        address indexed creator,
        string contentType
    );
    event ContentDeactivated(bytes32 indexed contentId);
    event RegistrarAdded(address indexed registrar);

    modifier onlyRegistrar() {
        require(registrars[msg.sender] || msg.sender == owner(), "Not an authorized registrar");
        _;
    }

    constructor() Ownable(msg.sender) {
        registrars[msg.sender] = true;
    }

    /// @notice Add an authorized registrar
    function addRegistrar(address registrar) external onlyOwner {
        registrars[registrar] = true;
        emit RegistrarAdded(registrar);
    }

    /// @notice Register educational content on-chain
    /// @param ipfsCid The IPFS Content Identifier
    /// @param creator The content creator's wallet address
    /// @param contentType Type of content (lesson, scheme, assessment, resource)
    /// @param curriculumRef CBC curriculum reference (e.g., "CBC/Math/Grade5/Numbers")
    /// @return contentId The unique content identifier
    function registerContent(
        string calldata ipfsCid,
        address creator,
        string calldata contentType,
        string calldata curriculumRef
    ) external onlyRegistrar returns (bytes32) {
        require(bytes(ipfsCid).length > 0, "IPFS CID cannot be empty");
        require(creator != address(0), "Invalid creator address");

        bytes32 contentId = keccak256(
            abi.encodePacked(ipfsCid, creator, block.timestamp)
        );

        content[contentId] = ContentRecord({
            ipfsCid: ipfsCid,
            creator: creator,
            timestamp: block.timestamp,
            active: true,
            contentType: contentType,
            curriculumRef: curriculumRef
        });

        creatorContent[creator].push(contentId);
        allContentIds.push(contentId);

        emit ContentRegistered(contentId, ipfsCid, creator, contentType);
        return contentId;
    }

    /// @notice Deactivate content (e.g., copyright violation)
    function deactivateContent(bytes32 contentId) external onlyRegistrar {
        require(content[contentId].creator != address(0), "Content does not exist");
        content[contentId].active = false;
        emit ContentDeactivated(contentId);
    }

    /// @notice Get all content IDs by a creator
    function getCreatorContent(address creator) external view returns (bytes32[] memory) {
        return creatorContent[creator];
    }

    /// @notice Get total registered content count
    function totalContent() external view returns (uint256) {
        return allContentIds.length;
    }
}
