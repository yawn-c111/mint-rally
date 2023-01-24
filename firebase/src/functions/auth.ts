import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { v4 } from 'uuid'
import { Request, Response } from 'firebase-functions'
import { recoverPersonalSignature } from '@metamask/eth-sig-util'
import { cors } from '../utils/cors'
import { parseToken } from '../utils/auth'

export const auth = functions
  .region('asia-northeast1')
  .https.onRequest((request, response) =>
    cors(request, response, async () => {
      switch (request.path) {
        case '/get-nonce-to-sign':
          await getNonceToSign(request, response)
          return
        case '/verify-sign':
          await verifySign(request, response)
          return
        case '/verify-idToken':
          await verifyIdToken(request, response)
          return
        default:
          response.status(404).send('not found')
          return
      }
    })
  )

const getNonceToSign = async (request: Request, response: Response) => {
  if (request.method !== 'POST') {
    response.sendStatus(404)
    return
  }
  try {
    if (!request.body.address) {
      response.sendStatus(403)
      return
    }
    const userDoc: FirebaseFirestore.DocumentSnapshot = await admin
      .firestore()
      .collection('users')
      .doc(request.body.address)
      .get()
    if (userDoc.exists) {
      const nonce = userDoc.data()?.nonce
      response.json({ nonce })
      return
    } else {
      const nonce = v4()
      const user = await admin.auth().createUser({ uid: request.body.address })
      await admin.firestore().collection('users').doc(user.uid).set({ nonce })
      response.json({ nonce })
      return
    }
  } catch (error) {
    response.status(503).send(error)
  }
}

const verifySign = async (request: Request, response: Response) => {
  if (request.method !== 'POST') {
    response.sendStatus(404)
    return
  }
  if (!request.body.address || !request.body.sign) {
    response.sendStatus(503)
    return
  }

  try {
    const { address, sign } = request.body
    const userDocRef = admin.firestore().collection('users').doc(address)
    const userDoc = await userDocRef.get()
    if (userDoc.exists) {
      const nonce = userDoc.data()?.nonce
      const recoveredAddress = recoverPersonalSignature({
        data: `0x${toHex(nonce)}`,
        signature: sign,
      })
      if (recoveredAddress === address) {
        await userDocRef.update({ nonce: v4() })
        const token = await admin.auth().createCustomToken(address)
        response.json({ token })
        return
      } else {
        response.sendStatus(403)
        return
      }
    } else {
      response.sendStatus(404)
      return
    }
  } catch (error) {
    response.status(503).send(error)
    return
  }
}

const verifyIdToken = async (request: Request, response: Response) => {
  if (request.method !== 'GET') {
    response.sendStatus(404)
    return
  }

  try {
    const userId = await parseToken(request)
    response.status(200).send({ userId })
  } catch (error) {
    response.status(503).send(error)
    return
  }
}

const toHex = (stringToConvert: string) =>
  stringToConvert
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
