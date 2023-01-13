//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../lib/Pairing.sol";

interface IZkVerifier {
    struct Proof {
        Pairing.G1Point a;
        Pairing.G2Point b;
        Pairing.G1Point c;
    }

    struct VerifyingKey {
        Pairing.G2Point h;
        Pairing.G1Point g_alpha;
        Pairing.G2Point h_beta;
        Pairing.G1Point g_gamma;
        Pairing.G2Point h_gamma;
        Pairing.G1Point[] query;
    }

    struct VerifyingKeyPoint {
        uint256[2][2] h;
        uint256[2] g_alpha;
        uint256[2][2] h_beta;
        uint256[2] g_gamma;
        uint256[2][2] h_gamma;
        uint256[2][1] query;
    }

    function setVerifyingKeyPoint(
        VerifyingKeyPoint calldata _verifyingKeyPoint,
        uint256 _eventId
    ) external;

    function verifyTx(Proof memory _proof, uint256 _eventId)
        external
        view
        returns (bool);
}
