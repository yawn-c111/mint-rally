import { EventManager, EventManagerv2, MintNFT, MintNFTv2 } from "@/typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployv1, deployv2 } from "./helper/deploy";
import { generateZkKeys, generateZkProof } from "./helper/zk";

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

describe("MintNFTv2", () => {
  let mintNFT!: MintNFT;
  let mintNFTv2!: MintNFTv2;
  let eventManager!: EventManager;
  let eventManagerv2!: EventManagerv2;
  let organizer!: SignerWithAddress;
  let participant!: SignerWithAddress;
  let relayer!: SignerWithAddress;

  const eventInfo1 = {
    name: "event1",
    description: "desc",
    date: "2022-07-3O",
    maxSupply: 100,
    mtx: false,
    secretPhrase: "hackdays1",
  };

  before(async () => {
    [organizer, participant, relayer] = await ethers.getSigners();
  });

  it("set data with v1", async () => {
    const { mintNFT: _mintNFT, eventManager: _eventManager } = await deployv1(
      relayer.address
    );
    mintNFT = _mintNFT;
    eventManager = _eventManager;

    const createGroupTx = await eventManager
      .connect(organizer)
      .createGroup("group1");
    await createGroupTx.wait();
    const groupsList = await eventManager.connect(organizer).getGroups();
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

    const eventList = await eventManager.connect(organizer).getEventRecords();
    expect(eventList.length).equal(1);

    const mintNFTTx = await mintNFT
      .connect(participant)
      .mintParticipateNFT(
        groupsList[0].groupId,
        eventList[0].eventRecordId,
        eventInfo1.secretPhrase
      );
    await mintNFTTx.wait();

    const balance = await mintNFT
      .connect(participant)
      .balanceOf(participant.address);
    expect(balance).equal(1);
  });

  it("check inherit data", async () => {
    const { mintNFTv2: _mintNFTv2, eventManagerv2: _eventManagerv2 } =
      await deployv2(mintNFT.address, eventManager.address);
    mintNFTv2 = _mintNFTv2;
    eventManagerv2 = _eventManagerv2;

    const balance = await mintNFTv2
      .connect(participant)
      .balanceOf(participant.address);
    expect(balance).equal(1);
  });

  it("create new event and mint", async () => {
    const { vk, pk } = await generateZkKeys("1", "1", "1", "1");
    const createEventTx = await eventManagerv2
      .connect(organizer)
      .createEventRecord(
        1,
        eventInfo1.name,
        eventInfo1.description,
        eventInfo1.date,
        "ipfshash",
        eventInfo1.maxSupply,
        eventInfo1.mtx,
        vk,
        attributes
      );
    await createEventTx.wait();

    const eventsList = await eventManagerv2.getEventRecords();

    const proof = await generateZkProof("1", "1", "1", "1", pk);
    const canMint = await mintNFTv2.canMint(eventsList[1].eventRecordId, proof);
    expect(canMint).equal(true);

    const mintNFTTx = await mintNFTv2
      .connect(participant)
      .mintParticipateNFT(1, 2, proof);
    await mintNFTTx.wait();

    const balance = await mintNFTv2
      .connect(participant)
      .balanceOf(participant.address);
    expect(balance).equal(2);
  });
});
