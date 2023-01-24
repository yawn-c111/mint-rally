// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/metatx/MinimalForwarderUpgradeable.sol";
import "../lib/Hashing.sol";
import "../ERC2771ContextUpgradeable.sol";
import "../interface/IZkVerifier.sol";
import "../interface/IMintNFTv2.sol";
import "hardhat/console.sol";

contract MintNFTv2 is
    ERC721EnumerableUpgradeable,
    ERC2771ContextUpgradeable,
    OwnableUpgradeable,
    IMintNFTv2
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address private eventManagerAddr;

    function setEventManagerAddr(address _addr) public override onlyOwner {
        require(_addr != address(0), "MintNFT: address is blank");
        eventManagerAddr = _addr;
    }

    function setZkVerifier(address _addr) public override onlyOwner {
        require(_addr != address(0), "MintNFTv2: address is blank");
        zkVerifierAddress = _addr;
    }

    // NFT meta data url via tokenId
    mapping(uint256 => string) private nftMetaDataURL;
    // Holding NFT via hash of eventId and address
    mapping(bytes32 => bool) private isHoldingEventNFT;
    // Participate count via hash of groupId and address hash
    mapping(bytes32 => uint256) private countOfParticipation;
    // NFT attribute location (ex. ipfs, centralized storage) via hash of participateCount, eventId
    mapping(bytes32 => string) private eventNftAttributes;
    // remaining mint count of Event
    mapping(uint256 => uint256) private remainingEventNftCount;
    // secretPhrase via EventId
    mapping(uint256 => bytes32) private eventSecretPhrases;

    address private zkVerifierAddress;

    function initialize(address _zkVerifierAddress) public reinitializer(2) {
        setZkVerifier(_zkVerifierAddress);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            /// @solidity memory-safe-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }

    function mintParticipateNFT(
        uint256 _groupId,
        uint256 _eventId,
        IZkVerifier.Proof memory _proof
    ) external override {
        canMint(_eventId, _proof);
        IZkVerifier _zkVerifier = IZkVerifier(zkVerifierAddress);
        _zkVerifier.recordUsedProof(_proof, _eventId);
        remainingEventNftCount[_eventId] = remainingEventNftCount[_eventId] - 1;

        isHoldingEventNFT[
            Hashing.hashingAddressUint256(_msgSender(), _eventId)
        ] = true;

        bytes32 groupHash = Hashing.hashingAddressUint256(
            _msgSender(),
            _groupId
        );
        uint256 participationCount = countOfParticipation[groupHash];
        countOfParticipation[groupHash] = participationCount + 1;

        string memory metaDataURL = eventNftAttributes[
            Hashing.hashingDoubleUint256(_eventId, 0)
        ];
        string memory specialMetaDataURL = eventNftAttributes[
            Hashing.hashingDoubleUint256(_eventId, participationCount)
        ];
        if (
            keccak256(abi.encodePacked(specialMetaDataURL)) !=
            keccak256(abi.encodePacked(""))
        ) {
            metaDataURL = specialMetaDataURL;
        }

        nftMetaDataURL[_tokenIds.current()] = metaDataURL;
        _safeMint(_msgSender(), _tokenIds.current());
        _tokenIds.increment();
        emit MintedNFTAttributeURL(_msgSender(), metaDataURL);
    }

    function canMint(uint256 _eventId, IZkVerifier.Proof memory _proof)
        public
        view
        override
        returns (bool)
    {
        IZkVerifier _zkVerifier = IZkVerifier(zkVerifierAddress);
        require(_zkVerifier.verify(_proof, _eventId), "MintNFT: invalid proof");

        require(
            remainingEventNftCount[_eventId] != 0,
            "MintNFT: remaining count is zero"
        );

        bool holdingEventNFT = isHoldingEventNFT[
            Hashing.hashingAddressUint256(_msgSender(), _eventId)
        ];
        require(!holdingEventNFT, "MintNFT: already minted");

        return true;
    }

    function setEventInfo(
        uint256 _eventId,
        uint256 _mintLimit,
        IMintNFTv2.NFTAttribute[] memory attributes
    ) external override {
        require(_msgSender() == eventManagerAddr, "MintNFT: unauthorized");
        remainingEventNftCount[_eventId] = _mintLimit;
        for (uint256 index = 0; index < attributes.length; index++) {
            eventNftAttributes[
                Hashing.hashingDoubleUint256(
                    _eventId,
                    attributes[index].requiredParticipateCount
                )
            ] = attributes[index].metaDataURL;
        }
    }

    function getRemainingNFTCount(uint256 _eventId)
        external
        view
        override
        returns (uint256)
    {
        return remainingEventNftCount[_eventId];
    }

    function burn(uint256 tokenId) public override onlyOwner {
        _burn(tokenId);
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        string memory metaDataURL = nftMetaDataURL[_tokenId];
        return metaDataURL;
    }
}