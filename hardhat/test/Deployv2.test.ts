import { ethers } from "hardhat";
import { deployv1, deployv2 } from "./helper/deploy";
import { expect } from "chai";

describe("Deploy v2", () => {
  it("deploy v1", async () => {
    const [relayer] = await ethers.getSigners();
    const { mintNFT, eventManager } = await deployv1(relayer.address);
    const { mintNFTv2, eventManagerv2, zkVerifier } = await deployv2(
      mintNFT.address,
      eventManager.address
    );
    expect(typeof mintNFTv2?.address).equal("string");
    expect(typeof eventManagerv2?.address).equal("string");
    expect(typeof zkVerifier?.address).equal("string");
  });
});
