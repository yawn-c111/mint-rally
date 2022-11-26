//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ZkVerifier.sol";
import "./lib/Hashing.sol";

contract ZkVerifierFactory {
    mapping(bytes32 => address) private eventVerifierAddress;

    function deploy(
        address _ownerAddr,
        uint256 _eventId,
        uint256[2][2] memory _h,
        uint256[2] memory _gAlpha,
        uint256[2][2] memory _hBeta,
        uint256[2] memory _gGamma,
        uint256[2][2] memory _hGamma,
        uint256[2][1] memory _query
    ) public {
        bytes32 key = Hashing.hashingAddressUint256(_ownerAddr, _eventId);
        Verifier newVerifier = new Verifier(
            _h,
            _gAlpha,
            _hBeta,
            _gGamma,
            _hGamma,
            _query
        );
        eventVerifierAddress[key] = address(newVerifier);
    }

    function getVerifierAddress(address _ownerAddr, uint256 _eventId)
        public
        view
        returns (address)
    {
        bytes32 key = Hashing.hashingAddressUint256(_ownerAddr, _eventId);
        return eventVerifierAddress[key];
    }
}
