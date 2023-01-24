import { describe } from "mocha";
import { deployv1, deployv2 } from "./helper/deploy";
import { EventManager, EventManagerv2, MintNFT } from "@/typechain";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { generateZkKeys } from "./helper/zk";

const attributes = [
  {
    metaDataURL: "ipfs://hogehoge/count0.json",
    requiredParticipateCount: 0,
  },
  {
    metaDataURL: "ipfs://hogehoge/count1.json",
    requiredParticipateCount: 1,
  },
  {
    metaDataURL: "ipfs://hogehoge/count5.json",
    requiredParticipateCount: 5,
  },
];

describe("EventManagerv2", () => {
  let mintNFT!: MintNFT;
  let eventManager!: EventManager;
  let eventManagerv2!: EventManagerv2;
  let organizer!: SignerWithAddress;
  let relayer!: SignerWithAddress;
  let fakeUser!: SignerWithAddress;

  const groupName1 = "test1";
  const eventInfo1 = {
    name: "event1",
    description: "desc",
    date: "2022-07-3O",
    maxSupply: 100,
    mtx: false,
    secretPhrase: "hackdays1",
  };
  const groupName2 = "test2";
  const eventInfo2 = {
    name: "event2",
    description: "desc2",
    date: "2022-07-31",
    maxSupply: 101,
    mtx: false,
    secretPhrase: "hackdays2",
  };

  before(async () => {
    [organizer, relayer, fakeUser] = await ethers.getSigners();
  });

  it("set data with v1", async () => {
    const { mintNFT: _mintNFT, eventManager: _eventManager } = await deployv1(
      relayer.address
    );
    mintNFT = _mintNFT;
    eventManager = _eventManager;

    const createGroupTx = await eventManager
      .connect(organizer)
      .createGroup(groupName1);
    await createGroupTx.wait();
    const groupsList = await eventManager.getGroups();
    expect(groupsList.length).equal(1);

    const createEventTx = await eventManager
      .connect(organizer)
      .createEventRecord(
        groupsList[0].groupId,
        eventInfo1.name,
        eventInfo1.description,
        eventInfo1.date,
        eventInfo1.maxSupply,
        eventInfo1.mtx,
        eventInfo1.secretPhrase,
        attributes
      );
    await createEventTx.wait();

    const eventList = await eventManager.getEventRecords();
    expect(eventList.length).equal(1);
  });

  it("check inherit data", async () => {
    const { eventManagerv2: _eventManagerv2 } = await deployv2(
      mintNFT.address,
      eventManager.address
    );
    eventManagerv2 = _eventManagerv2;
    const groupsList = await eventManagerv2.getGroups();
    expect(groupsList.length).equal(1);
    expect(groupsList[0].name).equal(groupName1);

    const eventsList = await eventManagerv2.getEventRecords();
    expect(eventsList.length).equal(1);
    expect(eventsList[0].name).equal(eventInfo1.name);
    expect(eventsList[0].description).equal(eventInfo1.description);
    expect(eventsList[0].date).equal(eventInfo1.date);
    expect(eventsList[0].useMtx).equal(eventInfo1.mtx);
  });

  it("create from v2", async () => {
    const createGroupTx = await eventManagerv2.createGroup(groupName2);
    await createGroupTx.wait();
    const groupsList = await eventManagerv2.getGroups();
    expect(groupsList.length).equal(2);

    const { vk } = await generateZkKeys("1", "1", "1", "1");

    const createEventTx = await eventManagerv2
      .connect(organizer)
      .createEventRecord(
        groupsList[0].groupId,
        eventInfo2.name,
        eventInfo2.description,
        eventInfo2.date,
        eventInfo2.maxSupply,
        eventInfo2.mtx,
        vk,
        attributes
      );
    await createEventTx.wait();

    const eventsList = await eventManagerv2.getEventRecords();
    expect(eventsList.length).equal(2);

    expect(eventsList[0].name).equal(eventInfo1.name);
    expect(eventsList[0].description).equal(eventInfo1.description);
    expect(eventsList[0].date).equal(eventInfo1.date);
    expect(eventsList[0].useMtx).equal(eventInfo1.mtx);

    expect(eventsList[1].name).equal(eventInfo2.name);
    expect(eventsList[1].description).equal(eventInfo2.description);
    expect(eventsList[1].date).equal(eventInfo2.date);
    expect(eventsList[1].useMtx).equal(eventInfo2.mtx);
  });

  it("update verifing key points", async () => {
    const { vk } = await generateZkKeys("1", "1", "1", "2");
    await eventManagerv2.connect(organizer).updateEventVerifingKeyPoint(2, vk);
    await expect(
      eventManagerv2.connect(fakeUser).updateEventVerifingKeyPoint(2, vk)
    ).revertedWith("Eventv2: You are not group owner");
  });
});
