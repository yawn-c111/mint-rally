import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import {
  createHashCheckArtifacts,
  createProvider,
  generateHash,
} from '../utils/zk-helper'
import path = require('path')
import os = require('os')
import fs = require('fs')
import seedrandom = require('seedrandom')
import uuid = require('uuid')
import { Request, Response } from 'firebase-functions'
import { cors } from '../utils/cors'
const nodezip = require('node-zip')

const firestore = admin.firestore()

//Routing
export const zk = functions
  .region('asia-northeast1')
  .runWith({ timeoutSeconds: 180, memory: '8GB' })
  .https.onRequest(async (request, response) =>
    cors(request, response, async () => {
      switch (request.path) {
        case '/generate-keys':
          await generateKeys(request, response)
          return
        case '/generate-proof':
          await generateProof(request, response)
          return
        default:
          response.status(404).send('not found')
          return
      }
    })
  )

const generateKeys = async (request: Request, response: Response) => {
  if (request.method !== 'GET') {
    response.status(404).send('not found')
    return
  }
  try {
    const uid = uuid.v4()
    const { passphrase } = request.query
    if (!passphrase) throw 'passphrase is not given'

    const zokratesProvider = await createProvider()
    const [a, b, c, d] = convertPassPhrase2FourFields(String(passphrase))
    const [hash1, hash2] = await generateHash(a, b, c, d)

    const checkHashArtifacts_organizer = await createHashCheckArtifacts(
      hash1,
      hash2
    )
    const keypair = zokratesProvider.setup(checkHashArtifacts_organizer.program)

    const vk: any = keypair.vk
    const pk: any = keypair.pk

    const zip = new nodezip()
    const tempFilePath = path.join(os.tmpdir(), `${uid}.txt`)
    zip.file(`${uid}.txt`, JSON.stringify(pk))
    const data = zip.generate({ base64: false, compression: 'DEFLATE' })
    await fs.writeFileSync(tempFilePath, data, 'binary')

    const bucket = admin.storage().bucket()

    await bucket.upload(tempFilePath, {
      destination: `zkpk/${uid}.zip`,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    })

    response
      .set('Access-Control-Allow-Origin', '*')
      .status(200)
      .json({ vk: vk, uid })
  } catch (error) {
    response.status(500).json(error)
  }
}

const generateProof = async (request: Request, response: Response) => {
  if (request.method !== 'GET') {
    response.status(404).send('not found')
    return
  }
  try {
    const { passPhrase, eventId } = request.query
    if (!passPhrase || !eventId) throw 'event id is not given'

    const event = firestore.collection('events')
    const eventDoc = await event.doc(String(eventId)).get()
    const pkUid = eventDoc.get('pkUid')
    if (!pkUid) throw 'there is no proove key'

    const [a, b, c, d] = convertPassPhrase2FourFields(String(passPhrase))
    const zokratesProvider = await createProvider()
    const [hash1, hash2] = await generateHash(a, b, c, d)

    const checkHashArtifacts_participant = await createHashCheckArtifacts(
      hash1,
      hash2
    )

    const { witness } = zokratesProvider.computeWitness(
      checkHashArtifacts_participant,
      [a, b, c, d]
    )

    const bucket = admin.storage().bucket()
    const tempFilePath = path.join(os.tmpdir(), `${pkUid}.zip`)
    const remoteFile = bucket.file(`zkpk/${pkUid}.zip`)

    remoteFile
      .createReadStream()
      .on('error', function (err) {
        throw err
      })
      .on('end', function () {
        const data = fs.readFileSync(tempFilePath)
        const zip = new nodezip(data, { base64: false, checkCRC32: true })
        const pk = JSON.parse(zip.files[`${pkUid}.txt`]._data)

        const proof: any = zokratesProvider.generateProof(
          checkHashArtifacts_participant.program,
          witness,
          pk
        )

        response
          .set('Access-Control-Allow-Origin', '*')
          .status(200)
          .json(proof.proof)
        return
      })
      .pipe(fs.createWriteStream(tempFilePath))
  } catch (error) {
    response.status(500).json(error)
  }
}

const convertPassPhrase2FourFields = (passPhrase: string) => {
  const rng = seedrandom(passPhrase)
  const hashedPhrase = String(rng()).split('.')[1]
  const fieldLength = Math.ceil(hashedPhrase.length / 4)
  const fields = [
    hashedPhrase.slice(0, fieldLength),
    hashedPhrase.slice(fieldLength, fieldLength * 2),
    hashedPhrase.slice(fieldLength * 2, fieldLength * 3),
    hashedPhrase.slice(fieldLength * 3),
  ]
  return fields
}
