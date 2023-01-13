// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MintNFT.sol";
import "../interface/IZkVerifier.sol";

contract MintNFTV2 is MintNFT {
    using Counters for Counters.Counter;
    Counters.Counter internal _tokenIds;

    address internal eventManagerAddr;

    function setEventManagerAddr(address _addr) public override onlyOwner {
        require(_addr != address(0), "event manager address is blank");
        eventManagerAddr = _addr;
    }

    // NFT meta data url via tokenId
    mapping(uint256 => string) internal nftMetaDataURL;
    // Holding NFT via hash of eventId and address
    mapping(bytes32 => bool) internal isHoldingEventNFT;
    // Participate count via hash of groupId and address hash
    mapping(bytes32 => uint256) internal countOfParticipation;
    // NFT attribute location (ex. ipfs, centralized storage) via hash of participateCount, eventId
    mapping(bytes32 => string) internal eventNftAttributes;
    // remaining mint count of Event
    mapping(uint256 => uint256) internal remainingEventNftCount;

    bool private initialized;
    address internal zkVerifierAddress;

    function initialize(address _zkVerifierAddress) public initializer {
        require(!initialized, "MintNFT: Already initialized");
        setZkVerifier(_zkVerifierAddress);
        initialized = true;
    }

    function setZkVerifier(address _zkVerifierAddress) public onlyOwner {
        zkVerifierAddress = _zkVerifierAddress;
    }

    function mintParticipateNFT(
        uint256 _groupId,
        uint256 _eventId,
        string memory _secretPhrase
    ) external override {
        canMint(_eventId, _secretPhrase);
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

    function canMint(uint256 _eventId, string memory _secretPhrase)
        public
        view
        override
        returns (bool)
    {
        require(
            verifySecretPhrase(_secretPhrase, _eventId),
            "invalid secret phrase"
        );
        require(
            remainingEventNftCount[_eventId] != 0,
            "remaining count is zero"
        );

        bool holdingEventNFT = isHoldingEventNFT[
            Hashing.hashingAddressUint256(_msgSender(), _eventId)
        ];
        require(!holdingEventNFT, "already minted");

        return true;
    }

    function setEventInfo(
        uint256 _eventId,
        uint256 _mintLimit,
        IZkVerifier.VerifyingKeyPoint memory _verifyingKeyPoint,
        NFTAttribute[] memory attributes
    ) external {
        require(_msgSender() == eventManagerAddr, "unauthorized");
        remainingEventNftCount[_eventId] = _mintLimit;
        IZkVerifier _zkVerifier = IZkVerifier(zkVerifierAddress);
        _zkVerifier.setVerifyingKeyPoint(_verifyingKeyPoint, _eventId);
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

    function verifySecretPhrase(
        IZkVerifier.Proof memory _proof,
        uint256 _eventId
    ) internal view returns (bool) {
        IZkVerifier _zkVerifier = IZkVerifier(zkVerifierAddress);
        bool result = _zkVerifier.verifyTx(_proof, _eventId);
        require(result, "MintNFT: failed to verify");
    }
}
