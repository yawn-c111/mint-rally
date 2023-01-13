//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
import "../lib/Pairing.sol";
import "../lib/Hashing.sol";
import "../interface/IZkVerifier.sol";

contract Verifier {
    using Pairing for *;

    mapping(uint256 => IZkVerifier.VerifyingKeyPoint)
        internal verifyingKeyPoint;
    mapping(bytes32 => bool) internal usedProof;

    function setVerifyingKeyPoint(
        IZkVerifier.VerifyingKeyPoint calldata _verifyingKeyPoint,
        uint256 _eventId
    ) external {
        verifyingKeyPoint[_eventId] = _verifyingKeyPoint;
    }

    function verifyingKey(uint256 _eventId)
        internal
        view
        returns (IZkVerifier.VerifyingKey memory vk)
    {
        IZkVerifier.VerifyingKeyPoint
            memory eventVerifyingKeyPoint = verifyingKeyPoint[_eventId];
        vk.h = Pairing.G2Point(
            [
                uint256(eventVerifyingKeyPoint.h[0][0]),
                uint256(eventVerifyingKeyPoint.h[0][1])
            ],
            [
                uint256(eventVerifyingKeyPoint.h[1][0]),
                uint256(eventVerifyingKeyPoint.h[1][1])
            ]
        );
        vk.g_alpha = Pairing.G1Point(
            uint256(eventVerifyingKeyPoint.g_alpha[0]),
            uint256(eventVerifyingKeyPoint.g_alpha[1])
        );
        vk.h_beta = Pairing.G2Point(
            [
                uint256(eventVerifyingKeyPoint.h_beta[0][0]),
                uint256(eventVerifyingKeyPoint.h_beta[0][1])
            ],
            [
                uint256(eventVerifyingKeyPoint.h_beta[1][0]),
                uint256(eventVerifyingKeyPoint.h_beta[1][1])
            ]
        );
        vk.g_gamma = Pairing.G1Point(
            uint256(eventVerifyingKeyPoint.g_gamma[0]),
            uint256(eventVerifyingKeyPoint.g_gamma[1])
        );
        vk.h_gamma = Pairing.G2Point(
            [
                uint256(eventVerifyingKeyPoint.h_gamma[0][0]),
                uint256(eventVerifyingKeyPoint.h_gamma[0][1])
            ],
            [
                uint256(eventVerifyingKeyPoint.h_gamma[1][0]),
                uint256(eventVerifyingKeyPoint.h_gamma[1][1])
            ]
        );
        vk.query = new Pairing.G1Point[](1);
        vk.query[0] = Pairing.G1Point(
            uint256(eventVerifyingKeyPoint.query[0][0]),
            uint256(eventVerifyingKeyPoint.query[0][1])
        );
    }

    function _verify(
        uint256[] memory _input,
        IZkVerifier.Proof memory _proof,
        uint256 _eventId
    ) internal view returns (uint256) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        IZkVerifier.VerifyingKey memory vk = verifyingKey(_eventId);
        require(_input.length + 1 == vk.query.length);
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint256 i = 0; i < _input.length; i++) {
            require(_input[i] < snark_scalar_field);
            vk_x = Pairing.addition(
                vk_x,
                Pairing.scalar_mul(vk.query[i + 1], _input[i])
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
                _proof.c,
                vk.h,
                Pairing.negate(Pairing.addition(_proof.a, vk.g_alpha)),
                Pairing.addition(_proof.b, vk.h_beta)
            )
        ) return 1;
        /**
         * e(A, H^{gamma}) = e(G^{gamma}, B)
         */
        if (
            !Pairing.pairingProd2(
                _proof.a,
                vk.h_gamma,
                Pairing.negate(vk.g_gamma),
                _proof.b
            )
        ) return 2;
        return 0;
    }

    function verify(IZkVerifier.Proof memory _proof, uint256 _eventId)
        public
        view
        returns (bool)
    {
        uint256[] memory inputValues = new uint256[](0);
        bytes32 hashedProof = Hashing.hashingProof(_proof);
        if (
            _verify(inputValues, _proof, _eventId) == 0 &&
            !usedProof[hashedProof]
        ) {
            return true;
        } else {
            return false;
        }
    }

    function verifyTx(IZkVerifier.Proof calldata _proof, uint256 _eventId)
        external
        returns (bool)
    {
        bool result = verify(_proof, _eventId);
        require(result, "ZkVerifier: faild to verify");
        recordUsedProof(_proof);
        return true;
    }

    function recordUsedProof(IZkVerifier.Proof calldata proof) internal {
        bytes32 hashedProof = Hashing.hashingProof(proof);
        usedProof[hashedProof] = true;
    }
}
