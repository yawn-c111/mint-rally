//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./lib/Base64.sol";

interface IEventManager {
    function applyForParticipation(uint256 _eventRecordId) external;

    function verifySecretPhrase(
        string memory _secretPhrase,
        uint256 _eventRecordId
    ) external returns (bool);

    struct EventRecord {
        uint256 eventRecordId;
        uint256 groupId;
        string name;
        string description;
        string date;
        string startTime;
        string endTime;
        bytes32 secretPhrase;
    }

    function getEventById(uint256 _eventId)
        external
        view
        returns (EventRecord memory);
}

contract MintNFT is ERC721Enumerable, Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address private eventManagerAddr;

    function setEventManagerAddr(address _eventManagerAddr) public onlyOwner {
        eventManagerAddr = _eventManagerAddr;
    }

    struct ParticipateNFTAttributes {
        string name;
        string image;
        string description;
        uint256 groupId;
        uint256 eventId;
        uint256 requiredParticipateCount;
    }

    mapping(uint256 => ParticipateNFTAttributes) public attributesOfNFT;
    mapping(uint256 => ParticipateNFTAttributes[]) private groupsNFTAttributes;
    mapping(bytes32 => bool) private mintedOnEvent;
    mapping(bytes32 => uint256) private groupMintCount;

    constructor() ERC721("MintRally", "MR") {}

    function mintParticipateNFT(
        uint256 _groupId,
        uint256 _eventId,
        string memory _secretPhrase
    ) external returns (string memory) {
        ParticipateNFTAttributes[]
            memory groupNFTAttributes = groupsNFTAttributes[_groupId];

        IEventManager _eventManager = IEventManager(eventManagerAddr);
        require(
            _eventManager.verifySecretPhrase(_secretPhrase, _eventId),
            "invalid secret phrase"
        );

        IEventManager.EventRecord memory _event = _eventManager.getEventById(
            _eventId
        );

        bytes32 addressEventHash = getHashByAddressAndId(msg.sender, _eventId);
        bool firstMintOnEvent = mintedOnEvent[addressEventHash];
        mintedOnEvent[addressEventHash] = true;
        require(!firstMintOnEvent, "already minted NFT on event");

        bytes32 addressGroupHash = getHashByAddressAndId(msg.sender, _groupId);
        uint256 countOwnedGroupNFTs = groupMintCount[addressGroupHash];
        groupMintCount[addressGroupHash] = countOwnedGroupNFTs.add(1);

        bool minted = false;
        ParticipateNFTAttributes memory defaultNFT;
        for (uint256 index = 0; index < groupNFTAttributes.length; index++) {
            ParticipateNFTAttributes memory gp = groupNFTAttributes[index];
            gp.groupId = _groupId;
            gp.eventId = _eventId;
            gp.name = _event.name;

            if (gp.requiredParticipateCount == 0) {
                defaultNFT = gp;
            }

            if (gp.requiredParticipateCount == countOwnedGroupNFTs) {
                attributesOfNFT[_tokenIds.current()] = gp;
                _safeMint(msg.sender, _tokenIds.current());
                minted = true;
            }
        }
        if (!minted) {
            attributesOfNFT[_tokenIds.current()] = defaultNFT;
            _safeMint(msg.sender, _tokenIds.current());
        }
        string memory mintedTokenURI = tokenURI(_tokenIds.current());
        _tokenIds.increment();
        return mintedTokenURI;
    }

    function getHashByAddressAndId(address _address, uint256 _id)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_address, _id));
    }

    function countGroupParticipation(uint256 _groupId)
        public
        view
        returns (uint256)
    {
        bytes32 hash = getHashByAddressAndId(msg.sender, _groupId);
        return groupMintCount[hash];
    }

    function isMinted(uint256 _eventId) public view returns (bool) {
        bytes32 hash = getHashByAddressAndId(msg.sender, _eventId);
        return mintedOnEvent[hash];
    }

    function getOwnedNFTs()
        public
        view
        returns (ParticipateNFTAttributes[] memory)
    {
        uint256 tokenCount = balanceOf(msg.sender);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex((msg.sender), i);
        }

        ParticipateNFTAttributes[]
            memory holdingNFTsAttributes = new ParticipateNFTAttributes[](
                tokenCount
            );
        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 id = tokenIds[i];
            holdingNFTsAttributes[i] = attributesOfNFT[id];
        }
        return holdingNFTsAttributes;
    }

    function pushGroupNFTAttributes(
        uint256 groupId,
        ParticipateNFTAttributes[] memory attributes
    ) external {
        for (uint256 index = 0; index < attributes.length; index++) {
            groupsNFTAttributes[groupId].push(
                ParticipateNFTAttributes({
                    name: attributes[index].name,
                    image: attributes[index].image,
                    description: attributes[index].description,
                    groupId: attributes[index].groupId,
                    eventId: attributes[index].eventId,
                    requiredParticipateCount: attributes[index]
                        .requiredParticipateCount
                })
            );
        }
    }

    function getGroupNFTAttributes(uint256 _groupId)
        external
        view
        returns (ParticipateNFTAttributes[] memory)
    {
        return groupsNFTAttributes[_groupId];
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        ParticipateNFTAttributes memory attributes = attributesOfNFT[_tokenId];

        string memory json = Base64.encode(
            abi.encodePacked(
                '{"name": "',
                attributes.name,
                '", "description": "',
                attributes.description,
                '", "image": "',
                attributes.image,
                '", "id": ',
                Strings.toString(_tokenId),
                "}"
            )
        );

        string memory output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );
        return output;
    }
}
