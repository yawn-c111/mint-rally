// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat";
import { MintNFT, EventManager } from "../../typechain";
import { writeFileSync } from "fs";

async function v2() {
  const {
    MintRallyFowarder,
    MintNFT,
    EventManager,
  } = require("./deployed_contract_addr.json");

  const ZkVerifierFactory = await ethers.getContractFactory("ZkVerifier");
  const deployedZkVerifier = await ZkVerifierFactory.deploy();
  await deployedZkVerifier.deployed();

  const MintNFTv2Factory = await ethers.getContractFactory("MintNFTv2");
  const deployedMintNFTv2: any = await upgrades.upgradeProxy(
    MintNFT,
    MintNFTv2Factory
  );
  await deployedMintNFTv2.deployed();
  await deployedMintNFTv2.initialize(deployedZkVerifier.address);

  const EventManagerv2Factory = await ethers.getContractFactory(
    "EventManagerv2"
  );
  const deployedEventManagerv2: any = await upgrades.upgradeProxy(
    EventManager,
    EventManagerv2Factory
  );
  await deployedEventManagerv2.deployed();

  writeFileSync(
    "./scripts/local/deployed_contract_addr.json",
    JSON.stringify(
      {
        MintRallyFowarder,
        MintNFT,
        EventManager,
        ZkVerifier: deployedZkVerifier.address,
      },
      null,
      2
    )
  );
}

async function v1() {
  let mintNFT: MintNFT;
  let eventManager: EventManager;

  const ForwarderFactory = await ethers.getContractFactory(
    "MintRallyForwarder"
  );
  const forwarder = await ForwarderFactory.deploy();
  await forwarder.deployed();
  const MintNFTFactory = await ethers.getContractFactory("MintNFT");
  const deployedMintNFT: any = await upgrades.deployProxy(
    MintNFTFactory,
    [forwarder.address],
    {
      initializer: "initialize",
    }
  );
  mintNFT = deployedMintNFT;
  await mintNFT.deployed();

  const EventManagerFactory = await ethers.getContractFactory("EventManager");
  const deployedEventManager: any = await upgrades.deployProxy(
    EventManagerFactory,
    [process.env.LOCAL_RELAYER_ADDRESS, 250000, 1000000],
    {
      initializer: "initialize",
    }
  );
  eventManager = deployedEventManager;
  await eventManager.deployed();

  await mintNFT.setEventManagerAddr(eventManager.address);
  await eventManager.setMintNFTAddr(mintNFT.address);

  console.log("forwarder address:", forwarder.address);
  console.log("mintNFT address:", mintNFT.address);
  console.log("eventManager address:", eventManager.address, "\n");
  console.log("----------\nFor frontEnd\n----------");
  console.log(`NEXT_PUBLIC_FORWARDER_ADDRESS=${forwarder.address}`);
  console.log(`NEXT_PUBLIC_CONTRACT_MINT_NFT_MANAGER=${mintNFT.address}`);
  console.log(`NEXT_PUBLIC_CONTRACT_EVENT_MANAGER=${eventManager.address}`);

  writeFileSync(
    "./scripts/local/deployed_contract_addr.json",
    JSON.stringify(
      {
        MintRallyFowarder: forwarder.address,
        MintNFT: mintNFT.address,
        EventManager: eventManager.address,
      },
      null,
      2
    )
  );
}

const deploy = async () => {
  await v1();
  await v2();
};

deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
