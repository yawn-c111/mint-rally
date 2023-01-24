import { expect } from "chai";
import { initialize } from "zokrates-js";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

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
  let deployer!: SignerWithAddress;
  let fakeUser!: SignerWithAddress;
  let fakeMintNFT!: SignerWithAddress;

  before(async () => {
    [deployer, fakeUser, fakeMintNFT] = await ethers.getSigners();
  });

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

    const verifierContractFactory = await ethers.getContractFactory(
      "ZkVerifier"
    );
    const verifierContract = await verifierContractFactory
      .connect(deployer)
      .deploy(fakeMintNFT.address);
    await verifierContract.deployed();

    await verifierContract.connect(deployer).setVerifyingKeyPoint(vk, 1);
    await verifierContract.connect(fakeMintNFT).setVerifyingKeyPoint(vk, 1);

    await expect(
      verifierContract.connect(fakeUser).setVerifyingKeyPoint(vk, 1)
    ).revertedWith("ZkVerifier: no access right");

    // 参加者
    const checkHashArtifacts_participant = await createHashCheckArtifacts(
      hash1,
      hash2
    );
    const { witness } = zokratesProvider.computeWitness(
      checkHashArtifacts_participant,
      ["12", "12", "12", "12"]
    );
    const proof: any = zokratesProvider.generateProof(
      checkHashArtifacts_participant.program,
      witness,
      keypair.pk
    );
    let result = await verifierContract.verify(proof.proof, 1);
    expect(result).equal(true);
    const record = await verifierContract.recordUsedProof(proof.proof, 1);
    await record.wait();

    result = await verifierContract.verify(proof.proof, 1);
    expect(result).equal(false);

    const { witness: witness2 } = zokratesProvider.computeWitness(
      checkHashArtifacts_participant,
      ["12", "12", "12", "12"]
    );
    const proof2: any = zokratesProvider.generateProof(
      checkHashArtifacts_participant.program,
      witness2,
      pk
    );
    result = await verifierContract.verify(proof2.proof, 1);
    expect(result).equal(true);
  });
});

// 関係の無い場所からrecordUsedProofを叩くと失敗するテスト書く