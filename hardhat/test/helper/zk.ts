import { initialize } from "zokrates-js";

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

//a,b,c,d should be number in string type
export const generateZkKeys = async (
  a: string,
  b: string,
  c: string,
  d: string
) => {
  const zokratesProvider = await createProvider();
  const [hash1, hash2] = await generateHash(a, b, c, d);

  const checkHashArtifacts_organizer = await createHashCheckArtifacts(
    hash1,
    hash2
  );
  const keypair = zokratesProvider.setup(checkHashArtifacts_organizer.program);

  const vk: any = keypair.vk;
  const pk: any = keypair.pk;

  return { vk, pk };
};

export const generateZkProof = async (
  a: string,
  b: string,
  c: string,
  d: string,
  pk: any
) => {
  const zokratesProvider = await createProvider();
  const [hash1, hash2] = await generateHash(a, b, c, d);
  const checkHashArtifacts_participant = await createHashCheckArtifacts(
    hash1,
    hash2
  );

  const { witness } = zokratesProvider.computeWitness(
    checkHashArtifacts_participant,
    [a, b, c, d]
  );

  const proof: any = zokratesProvider.generateProof(
    checkHashArtifacts_participant.program,
    witness,
    pk
  );

  return proof.proof;
};
