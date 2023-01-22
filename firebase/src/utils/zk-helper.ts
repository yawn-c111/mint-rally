import { initialize } from 'zokrates-js'

export const createProvider = async () => {
  const zokratesDefaultProvider = await initialize()
  const zokratesProvider = zokratesDefaultProvider.withOptions({
    curve: 'bn128',
    scheme: 'gm17',
    backend: 'ark',
  })

  return zokratesProvider
}

export const generateHash = async (
  a: string,
  b: string,
  c: string,
  d: string
) => {
  const zokratesProvider = await createProvider()

  const generateHashSource = `
    import "hashes/sha256/512bitPacked" as sha256packed;
    def main(private field a, private field b, private field c, private field d) -> field[2] {
      field[2] h = sha256packed([a, b, c, d]);
      return h;
    }
  `
  const genHashArtifacts = zokratesProvider.compile(generateHashSource)
  const { output } = zokratesProvider.computeWitness(genHashArtifacts, [
    a,
    b,
    c,
    d,
  ])

  return JSON.parse(output)
}

export const createHashCheckArtifacts = async (
  hash1: string,
  hash2: string
) => {
  const zokratesProvider = await createProvider()
  const hashCheckSource = `
      import "hashes/sha256/512bitPacked" as sha256packed;
      def main(private field a, private field b, private field c, private field d) {
        field[2] h = sha256packed([a, b, c, d]);
        assert(h[0] == ${hash1});
        assert(h[1] == ${hash2});
        return;
      }
    `

  return zokratesProvider.compile(hashCheckSource)
}
