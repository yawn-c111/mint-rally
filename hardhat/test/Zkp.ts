import { expect } from "chai";
import { initialize } from "zokrates-js";
import { ethers } from "hardhat";
import { Verifier } from "../typechain";
const verifierABI = require("../artifacts/contracts/ZkVerifier.sol/Verifier.json");

const createProvider = async () => {
  const zokratesDefaultProvider = await initialize();
  const zokratesProvider = zokratesDefaultProvider.withOptions({
    curve: "bn128",
    scheme: "gm17",
    backend: "ark",
  });

  return zokratesProvider;
};

const generateHash = async (a: string, b: string, c: string, d: string) => {
  const zokratesProvider = await createProvider();

  const generateHashSource = `
    import "hashes/sha256/512bitPacked" as sha256packed;
    def main(private field a, private field b, private field c, private field d) -> field[2] {
      field[2] h = sha256packed([a, b, c, d]);
      return h;
    }
  `;
  const genHashArtifacts = zokratesProvider.compile(generateHashSource);
  const { output } = zokratesProvider.computeWitness(genHashArtifacts, [
    a,
    b,
    c,
    d,
  ]);

  return JSON.parse(output);
};

const createHashCheckArtifacts = async (hash1: string, hash2: string) => {
  const zokratesProvider = await createProvider();
  const hashCheckSource = `
      import "hashes/sha256/512bitPacked" as sha256packed;
      def main(private field a, private field b, private field c, private field d) {
        field[2] h = sha256packed([a, b, c, d]);
        assert(h[0] == ${hash1});
        assert(h[1] == ${hash2});
        return;
      }
    `;

  return zokratesProvider.compile(hashCheckSource);
};

describe("ZKP", () => {
  it("verify", async () => {
    // 主催者
    const zokratesProvider = await createProvider();
    const [hash1, hash2] = await generateHash("12", "12", "12", "12");

    const checkHashArtifacts_organizer = await createHashCheckArtifacts(
      hash1,
      hash2
    );
    const keypair = zokratesProvider.setup(
      checkHashArtifacts_organizer.program
    );

    const vk: any = keypair.vk;
    const pk: any = keypair.pk;

    const verifierFactoryFactory = await ethers.getContractFactory(
      "ZkVerifierFactory"
    );
    const verifierFactoryContract = await verifierFactoryFactory.deploy();
    await verifierFactoryContract.deployed();

    const [eventOwner, participant] = await ethers.getSigners();

    const deployVerifier = await verifierFactoryContract.deploy(
      eventOwner.address,
      1,
      vk.h,
      vk.g_alpha,
      vk.h_beta,
      vk.g_gamma,
      vk.h_gamma,
      vk.query
    );
    await deployVerifier.wait();

    const verifierAddr = await verifierFactoryContract.getVerifierAddress(
      eventOwner.address,
      1
    );

    const checkHashArtifacts_participant = await createHashCheckArtifacts(
      hash1,
      hash2
    );

    // 参加者
    const { witness } = zokratesProvider.computeWitness(
      checkHashArtifacts_participant,
      ["12", "12", "12", "12"]
    );

    const verifierContract = new ethers.Contract(
      verifierAddr,
      verifierABI.abi,
      participant
    ) as Verifier;

    const proof: any = zokratesProvider.generateProof(
      checkHashArtifacts_participant.program,
      witness,
      pk
    );
    const pass1 = await verifierContract.verifyTx(proof.proof);
    expect(pass1).equal(true);

    const pass1Duplicate = await verifierContract.verifyTx(proof.proof);
    console.log(proof.proof);
    expect(pass1Duplicate).equal(false);

    const proof2: any = zokratesProvider.generateProof(
      checkHashArtifacts_participant.program,
      witness,
      pk
    );
    const pass2 = await verifierContract.verifyTx(proof2.proof);
    expect(pass2).equal(true);
  });
});

// 関係の無い場所からrecordUsedProofを叩くと失敗するテスト書く
