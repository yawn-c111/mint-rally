import { writeFileSync } from "fs";
import { ethers, upgrades } from "hardhat";

async function main() {
  const {
    MintRallyFowarder,
    MintNFT,
    EventManager,
  } = require("./deployed_contract_addr.json");

  const MintNFTv2Factory = await ethers.getContractFactory("MintNFTv2");
  const deployedMintNFTv2: any = await upgrades.upgradeProxy(
    MintNFT,
    MintNFTv2Factory
  );
  await deployedMintNFTv2.deployed();

  const EventManagerv2Factory = await ethers.getContractFactory(
    "EventManagerv2"
  );
  const deployedEventManagerv2: any = await upgrades.upgradeProxy(
    EventManager,
    EventManagerv2Factory
  );
  await deployedEventManagerv2.deployed();

  const ZkVerifierFactory = await ethers.getContractFactory("ZkVerifier");
  const deployedZkVerifier = await ZkVerifierFactory.deploy(
    deployedEventManagerv2.address
  );
  await deployedZkVerifier.deployed();

  await deployedMintNFTv2.initialize(deployedZkVerifier.address);
  await deployedEventManagerv2.initialize(deployedZkVerifier.address);

  writeFileSync(
    "./scripts/staging/deployed_contract_addr.json",
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});