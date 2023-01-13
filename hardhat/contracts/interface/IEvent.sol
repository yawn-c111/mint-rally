//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IEventManager {
    struct Group {
        uint256 groupId;
        address ownerAddress;
        string name;
    }

    struct EventRecord {
        uint256 eventRecordId;
        uint256 groupId;
        string name;
        string description;
        string date;
        bool useMtx;
    }
}
