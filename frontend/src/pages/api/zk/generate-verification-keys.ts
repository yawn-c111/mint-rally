// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "stream";
import {
  createProvider,
  generateHash,
  createHashCheckArtifacts,
} from "../../../../utils/zk-helper";
import pinataSDK from "@pinata/sdk";

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

    const vk: any = keypair.vk;
    const pk: any = keypair.pk;

    const pinata = new pinataSDK({
      pinataJWTKey: process.env.NEXT_PUBLIC_PINATA_JWT!,
    });

    const buffer = Buffer.from(JSON.stringify(pk));
    const stream = Readable.from(buffer);

    const result = await pinata.pinFileToIPFS(stream, {
      pinataMetadata: { name: "zk-pk.txt" },
    });

    res.status(200).json({ vk, pkIpfsHash: result.IpfsHash });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export default handler;
