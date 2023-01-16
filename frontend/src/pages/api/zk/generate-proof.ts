// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import {
  createProvider,
  generateHash,
  createHashCheckArtifacts,
} from "../../../../utils/zk-helper";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const zokratesProvider = await createProvider();
    const [hash1, hash2] = await generateHash("12", "12", "12", "12");

    const checkHashArtifacts_organizer = await createHashCheckArtifacts(
      hash1,
      hash2
    );
    const keypair = zokratesProvider.setup(
      checkHashArtifacts_organizer.program
    );

    const pk: any = keypair.pk;

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
      pk
    );

    res.status(200).json(proof.proof);
  } catch (error) {
    res.status(500).json(error);
  }
};

export default handler;
