//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./lib/Pairing.sol";

interface IZkVerifier {
    struct Proof {
        Pairing.G1Point a;
        Pairing.G2Point b;
        Pairing.G1Point c;
    }
}
