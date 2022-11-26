//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "./Pairing.sol";
import "../IZkVerifier.sol";

library Hashing {
    function hashingAddressUint256(address _address, uint256 _id)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_address, _id));
    }

    function hashingDoubleUint256(uint256 _arg1, uint256 _arg2)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_arg1, _arg2));
    }

    function hashingProof(IZkVerifier.Proof memory proof)
        internal
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    proof.a.X,
                    proof.a.Y,
                    proof.b.X[0],
                    proof.b.X[1],
                    proof.b.Y[0],
                    proof.b.Y[1],
                    proof.c.X,
                    proof.c.Y
                )
            );
    }
}
