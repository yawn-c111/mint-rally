// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interface/IEventv2.sol";
import "../interface/IZkVerifier.sol";
import "../interface/IMintNFTv2.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract EventManagerv2 is OwnableUpgradeable, IEventManagerv2 {
    using Counters for Counters.Counter;

    Counters.Counter internal _eventRecordIds;
    Counters.Counter internal _groupIds;

    Group[] internal groups;
    EventRecord[] internal eventRecords;

    mapping(address => uint256[]) internal ownGroupIds;
    mapping(uint256 => uint256[]) internal eventIdsByGroupId;
    mapping(uint256 => uint256) internal groupIdByEventId;

    // Mint nft contract address
    address internal mintNFTAddr;
    // Relayer address for meta transaction
    address internal relayerAddr;
    // price for mtx per mint. required gas * margin * gas limit multipler
    uint256 internal mtxPrice;
    // max mint limit
    uint256 internal maxMintLimit;
    // zkVerifierAddress
    address private zkVerifierAddress;

    function setMintNFTAddr(address _mintNftAddr) public onlyOwner {
        require(_mintNftAddr != address(0), "Eventv2: address is blank");
        mintNFTAddr = _mintNftAddr;
    }

    function setRelayerAddr(address _relayerAddr) public onlyOwner {
        require(_relayerAddr != address(0), "Eventv2: address is blank");
        relayerAddr = _relayerAddr;
    }

    function setZkVerifier(address _addr) public onlyOwner {
        require(_addr != address(0), "Eventv2: address is blank");
        zkVerifierAddress = _addr;
    }

    function setMtxPrice(uint256 _price) public onlyOwner {
        mtxPrice = _price;
    }

    function setMaxMintLimit(uint256 _mintLimit) public onlyOwner {
        require(_mintLimit != 0, "Eventv2: mint limit is 0");
        maxMintLimit = _mintLimit;
    }

    function initialize(address _zkVerifierAddress) public reinitializer(2) {
        setZkVerifier(_zkVerifierAddress);
    }

    function createGroup(string memory _name) external {
        uint256 _newGroupId = _groupIds.current();
        _groupIds.increment();

        groups.push(
            Group({groupId: _newGroupId, ownerAddress: msg.sender, name: _name})
        );
        ownGroupIds[msg.sender].push(_newGroupId);

        emit CreatedGroupId(msg.sender, _newGroupId);
    }

    function getGroups() public view returns (Group[] memory) {
        uint256 _numberOfGroups = groups.length;
        Group[] memory _groups = new Group[](_numberOfGroups);
        _groups = groups;
        return _groups;
    }

    function getGroupById(uint256 _groupId)
        external
        view
        returns (Group memory)
    {
        uint256 _eventGroupIndex = _groupId - 1;
        Group memory _group = groups[_eventGroupIndex];
        return _group;
    }

    function getOwnGroups() public view returns (Group[] memory) {
        uint256 _numberOfOwnGroups = ownGroupIds[msg.sender].length;
        uint256 _numberOfAllGroups = groups.length;

        Group[] memory _groups = new Group[](_numberOfOwnGroups);
        uint256 _count = 0;
        for (uint256 _i = 0; _i < _numberOfAllGroups; _i++) {
            if (groups[_i].ownerAddress == msg.sender) {
                _groups[_count] = groups[_i];
                _count++;
            }
        }
        return _groups;
    }

    function createEventRecord(
        uint256 _groupId,
        string memory _name,
        string memory _description,
        string memory _date,
        uint256 _mintLimit,
        bool _useMtx,
        IZkVerifier.VerifyingKeyPoint memory _verifyingKeyPoint,
        IMintNFTv2.NFTAttribute[] memory _eventNFTAttributes
    ) external payable {
        require(
            _mintLimit > 0 && _mintLimit <= maxMintLimit,
            "Eventv2: mint limit is invalid"
        );

        bool _isGroupOwner = false;
        for (uint256 _i = 0; _i < ownGroupIds[msg.sender].length; _i++) {
            if (ownGroupIds[msg.sender][_i] == _groupId) {
                _isGroupOwner = true;
            }
        }
        require(_isGroupOwner, "Eventv2: You are not group owner");

        if (_useMtx) {
            uint256 depositPrice = (_mintLimit * tx.gasprice * mtxPrice);
            require(msg.value >= depositPrice, "Eventv2: Not enough value");
            (bool success, ) = (relayerAddr).call{value: msg.value}("");
            require(success, "Eventv2: transfer failed");
        }

        uint256 _newEventId = _eventRecordIds.current();
        _eventRecordIds.increment();

        eventRecords.push(
            EventRecord({
                eventRecordId: _newEventId,
                groupId: _groupId,
                name: _name,
                description: _description,
                date: _date,
                useMtx: _useMtx
            })
        );

        IZkVerifier _zkVerifier = IZkVerifier(zkVerifierAddress);
        _zkVerifier.setVerifyingKeyPoint(_verifyingKeyPoint, _newEventId);

        IMintNFTv2 _mintNFT = IMintNFTv2(mintNFTAddr);
        _mintNFT.setEventInfo(_newEventId, _mintLimit, _eventNFTAttributes);

        eventIdsByGroupId[_groupId].push(_newEventId);
        groupIdByEventId[_newEventId] = _groupId;

        emit CreatedEventId(msg.sender, _newEventId);
    }

    function updateEventVerifingKeyPoint(
        uint256 _eventId,
        IZkVerifier.VerifyingKeyPoint memory _verifyingKeyPoint
    ) external {
        uint256 groupId = groupIdByEventId[_eventId];
        bool _isGroupOwner = false;
        for (uint256 _i = 0; _i < ownGroupIds[msg.sender].length; _i++) {
            if (ownGroupIds[msg.sender][_i] == groupId) {
                _isGroupOwner = true;
            }
        }
        require(_isGroupOwner, "Eventv2: You are not group owner");
        IZkVerifier _zkVerifier = IZkVerifier(zkVerifierAddress);
        _zkVerifier.setVerifyingKeyPoint(_verifyingKeyPoint, _eventId);
    }

    function getEventRecords() public view returns (EventRecord[] memory) {
        uint256 _numberOfEventRecords = eventRecords.length;
        // create array of events
        EventRecord[] memory _eventRecords = new EventRecord[](
            _numberOfEventRecords
        );
        _eventRecords = eventRecords;
        return _eventRecords;
    }

    function getEventById(uint256 _eventId)
        public
        view
        returns (EventRecord memory)
    {
        uint256 _eventRecordIndex = _eventId - 1;
        EventRecord memory _eventRecord = eventRecords[_eventRecordIndex];
        return _eventRecord;
    }
}