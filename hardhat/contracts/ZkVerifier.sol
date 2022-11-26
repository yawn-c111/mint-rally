//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
import "./lib/Pairing.sol";
import "./lib/Hashing.sol";
import "./IZkVerifier.sol";

contract Verifier {
    using Pairing for *;
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
        uint256[2] gAlpha;
        uint256[2][2] hBeta;
        uint256[2] gGamma;
        uint256[2][2] hGamma;
        uint256[2][1] query;
    }

    VerifyingKeyPoint private verifyingKeyPoint;
    mapping(bytes32 => bool) usedProof;

    constructor(
        uint256[2][2] memory _h,
        uint256[2] memory _gAlpha,
        uint256[2][2] memory _hBeta,
        uint256[2] memory _gGamma,
        uint256[2][2] memory _hGamma,
        uint256[2][1] memory _query
    ) {
        verifyingKeyPoint = VerifyingKeyPoint({
            h: _h,
            gAlpha: _gAlpha,
            hBeta: _hBeta,
            gGamma: _gGamma,
            hGamma: _hGamma,
            query: _query
        });
    }

    function verifyingKey() internal view returns (VerifyingKey memory vk) {
        vk.h = Pairing.G2Point(
            [
                uint256(verifyingKeyPoint.h[0][0]),
                uint256(verifyingKeyPoint.h[0][1])
            ],
            [
                uint256(verifyingKeyPoint.h[1][0]),
                uint256(verifyingKeyPoint.h[1][1])
            ]
        );
        vk.g_alpha = Pairing.G1Point(
            uint256(verifyingKeyPoint.gAlpha[0]),
            uint256(verifyingKeyPoint.gAlpha[1])
        );
        vk.h_beta = Pairing.G2Point(
            [
                uint256(verifyingKeyPoint.hBeta[0][0]),
                uint256(verifyingKeyPoint.hBeta[0][1])
            ],
            [
                uint256(verifyingKeyPoint.hBeta[1][0]),
                uint256(verifyingKeyPoint.hBeta[1][1])
            ]
        );
        vk.g_gamma = Pairing.G1Point(
            uint256(verifyingKeyPoint.gGamma[0]),
            uint256(verifyingKeyPoint.gGamma[1])
        );
        vk.h_gamma = Pairing.G2Point(
            [
                uint256(verifyingKeyPoint.hGamma[0][0]),
                uint256(verifyingKeyPoint.hGamma[0][1])
            ],
            [
                uint256(verifyingKeyPoint.hGamma[1][0]),
                uint256(verifyingKeyPoint.hGamma[1][1])
            ]
        );
        vk.query = new Pairing.G1Point[](1);
        vk.query[0] = Pairing.G1Point(
            uint256(verifyingKeyPoint.query[0][0]),
            uint256(verifyingKeyPoint.query[0][1])
        );
    }

    function verify(uint256[] memory input, IZkVerifier.Proof memory proof)
        internal
        view
        returns (uint256)
    {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        VerifyingKey memory vk = verifyingKey();
        require(input.length + 1 == vk.query.length);
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint256 i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field);
            vk_x = Pairing.addition(
                vk_x,
                Pairing.scalar_mul(vk.query[i + 1], input[i])
            );
        }
        vk_x = Pairing.addition(vk_x, vk.query[0]);
        /**
         * e(A*G^{alpha}, B*H^{beta}) = e(G^{alpha}, H^{beta}) * e(G^{psi}, H^{gamma})
         *                              * e(C, H)
         * where psi = \sum_{i=0}^l input_i pvk.query[i]
         */
        if (
            !Pairing.pairingProd4(
                vk.g_alpha,
                vk.h_beta,
                vk_x,
                vk.h_gamma,
                proof.c,
                vk.h,
                Pairing.negate(Pairing.addition(proof.a, vk.g_alpha)),
                Pairing.addition(proof.b, vk.h_beta)
            )
        ) return 1;
        /**
         * e(A, H^{gamma}) = e(G^{gamma}, B)
         */
        if (
            !Pairing.pairingProd2(
                proof.a,
                vk.h_gamma,
                Pairing.negate(vk.g_gamma),
                proof.b
            )
        ) return 2;
        return 0;
    }

    function verifyTx(IZkVerifier.Proof memory proof)
        public
        view
        returns (bool r)
    {
        uint256[] memory inputValues = new uint256[](0);
        bytes32 hashedProof = Hashing.hashingProof(proof);
        if (verify(inputValues, proof) == 0 && !usedProof[hashedProof]) {
            return true;
        } else {
            return false;
        }
    }

    function recordUsedProof(IZkVerifier.Proof calldata proof) external {
        bytes32 hashedProof = Hashing.hashingProof(proof);
        usedProof[hashedProof] = true;
    }
}
