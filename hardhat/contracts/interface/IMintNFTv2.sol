//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./IZkVerifier.sol";

interface IMintNFTv2 {
    struct NFTAttribute {
        string metaDataURL;
        uint256 requiredParticipateCount;
    }

    function burn(uint256 tokenId) external;

    function canMint(uint256 _eventId, IZkVerifier.Proof memory _proof)
        external
        view
        returns (bool);

    function getRemainingNFTCount(uint256 _eventId)
        external
        view
        returns (uint256);

    function mintParticipateNFT(
        uint256 _groupId,
        uint256 _eventId,
        IZkVerifier.Proof memory _proof
    ) external;

    function setEventInfo(
        uint256 _eventId,
        uint256 _mintLimit,
        IZkVerifier.VerifyingKeyPoint memory _verifyingKeyPoint,
        NFTAttribute[] memory attributes
    ) external;

    function setEventManagerAddr(address _addr) external;

    function setZkVerifier(address _zkVerifierAddress) external;

    event MintedNFTAttributeURL(address indexed holder, string url);
}
