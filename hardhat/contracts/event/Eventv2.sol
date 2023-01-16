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

    function setMintNFTAddr(address _mintNftAddr) public onlyOwner {
        require(_mintNftAddr != address(0), "mint nft address is blank");
        mintNFTAddr = _mintNftAddr;
    }

    function setRelayerAddr(address _relayerAddr) public onlyOwner {
        require(_relayerAddr != address(0), "relayer address is blank");
        relayerAddr = _relayerAddr;
    }

    function setMtxPrice(uint256 _price) public onlyOwner {
        mtxPrice = _price;
    }

    function setMaxMintLimit(uint256 _mintLimit) public onlyOwner {
        require(_mintLimit != 0, "mint limit is 0");
        maxMintLimit = _mintLimit;
    }

    function initialize(
        address _relayerAddr,
        uint256 _mtxPrice,
        uint256 _maxMintLimit
    ) public initializer {
        __Ownable_init();
        _groupIds.increment();
        _eventRecordIds.increment();
        setRelayerAddr(_relayerAddr);
        setMtxPrice(_mtxPrice);
        setMaxMintLimit(_maxMintLimit);
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
        string memory _pkIpfsHash,
        uint256 _mintLimit,
        bool _useMtx,
        IZkVerifier.VerifyingKeyPoint memory _verifyingKeyPoint,
        IMintNFTv2.NFTAttribute[] memory _eventNFTAttributes
    ) external payable {
        require(
            _mintLimit > 0 && _mintLimit <= maxMintLimit,
            "mint limit is invalid"
        );

        bool _isGroupOwner = false;
        for (uint256 _i = 0; _i < ownGroupIds[msg.sender].length; _i++) {
            if (ownGroupIds[msg.sender][_i] == _groupId) {
                _isGroupOwner = true;
            }
        }
        require(_isGroupOwner, "You are not group owner");

        if (_useMtx) {
            uint256 depositPrice = (_mintLimit * tx.gasprice * mtxPrice);
            require(msg.value >= depositPrice, "Not enough value");
            (bool success, ) = (relayerAddr).call{value: msg.value}("");
            require(success, "transfer failed");
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

        IMintNFTv2 _mintNFT = IMintNFTv2(mintNFTAddr);
        _mintNFT.setEventInfo(
            _newEventId,
            _mintLimit,
            _verifyingKeyPoint,
            _eventNFTAttributes
        );

        eventIdsByGroupId[_groupId].push(_newEventId);
        groupIdByEventId[_newEventId] = _groupId;
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
        external
        view
        returns (EventRecord memory)
    {
        uint256 _eventRecordIndex = _eventId - 1;
        EventRecord memory _eventRecord = eventRecords[_eventRecordIndex];
        return _eventRecord;
    }
}
