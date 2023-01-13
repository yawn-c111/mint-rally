//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./IMintNFT.sol";
import "./IZkVerifier.sol";

interface IMintNFTV2 is IMintNFT {
    function setEventInfo(
        uint256 _eventId,
        uint256 _mintLimit,
        IZkVerifier.VerifyingKeyPoint memory _verifyingKeyPoint,
        NFTAttribute[] memory attributes
    ) external;
}
