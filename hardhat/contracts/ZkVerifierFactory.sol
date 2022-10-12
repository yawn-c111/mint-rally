//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ZkVerifier.sol";
import "./lib/Hashing.sol";

contract ZkVerifierFactory {
    mapping(bytes32 => address) private eventVerifierAddress;

    function deploy(
        address _ownerAddr,
        uint256 _eventId,
        uint256[2] memory _alpha,
        uint256[2][2] memory _beta,
        uint256[2][2] memory _gamma,
        uint256[2][2] memory _delta,
        uint256[2] memory _gamma_abc
    ) public {
        bytes32 key = Hashing.hashingAddressUint256(_ownerAddr, _eventId);
        Verifier newVerifier = new Verifier(
            _alpha,
            _beta,
            _gamma,
            _delta,
            _gamma_abc
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
