import {
  EventManager,
  EventManagerv2,
  MintNFT,
  MintNFTv2,
  MintRallyForwarder,
  ZkVerifier,
} from "@/typechain";
import { ethers, upgrades } from "hardhat";

export const deployv1 = async (relayerAddr: string) => {
  let mintNFT: MintNFT;
  let eventManager: EventManager;
  let forwarder: MintRallyForwarder;

  //Deploy Forwarder
  const ForwarderFactory = await ethers.getContractFactory(
    "MintRallyForwarder"
  );
  const Forwarder: any = await ForwarderFactory.deploy();
  forwarder = Forwarder;

  //Deploy MintNFT
  const MintNFTFactory = await ethers.getContractFactory("MintNFT");
  const MintNFT: any = await upgrades.deployProxy(
    MintNFTFactory,
    [forwarder.address],
    {
      initializer: "initialize",
    }
  );
  await MintNFT.deployed();
  mintNFT = MintNFT;

  //Deploy EventManager
  const eventManagerContractFactory = await ethers.getContractFactory(
    "EventManager"
  );
  const EventManagerContract: any = await upgrades.deployProxy(
    eventManagerContractFactory,
    [relayerAddr, 250000, 1000000],
    {
      initializer: "initialize",
    }
  );
  eventManager = await EventManagerContract.deployed();

  await eventManager.setMintNFTAddr(mintNFT.address);
  await mintNFT.setEventManagerAddr(eventManager.address);

  return { eventManager, mintNFT };
};

export const deployv2 = async (
  mintNFTAddr: string,
  eventManagerAddr: string
) => {
  let mintNFTv2: MintNFTv2;
  let eventManagerv2: EventManagerv2;
  let zkVerifier: ZkVerifier;

  //Deploy ZkVerifier
  const ZkVerifierFactory = await ethers.getContractFactory("ZkVerifier");
  const ZkVerifier = await ZkVerifierFactory.deploy(eventManagerAddr);
  await ZkVerifier.deployed();
  zkVerifier = ZkVerifier;

  //Deploy MintNFTv2
  const MintNFTv2Factory = await ethers.getContractFactory("MintNFTv2");
  const MintNFTv2: any = await upgrades.upgradeProxy(
    mintNFTAddr,
    MintNFTv2Factory
  );
  await MintNFTv2.deployed();
  mintNFTv2 = MintNFTv2;
  await mintNFTv2.initialize(zkVerifier.address);

  //Deploy EventManagerv2
  const EventManagerv2Factory = await ethers.getContractFactory(
    "EventManagerv2"
  );
  const EventManagerv2: any = await upgrades.upgradeProxy(
    eventManagerAddr,
    EventManagerv2Factory
  );
  await EventManagerv2.deployed();
  eventManagerv2 = EventManagerv2;
  await eventManagerv2.initialize(zkVerifier.address);

  return { mintNFTv2, eventManagerv2, zkVerifier };
};
