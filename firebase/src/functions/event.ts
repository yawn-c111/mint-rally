import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Request, Response } from 'firebase-functions'
import { parseToken } from '../utils/auth'
import { cors } from '../utils/cors'
import contractHelper from '../utils/contract-helper'
import { BigNumber } from 'ethers'

const firestore = admin.firestore()

export const event = functions
  .region('asia-northeast1')
  .https.onRequest(async (request, response) =>
    cors(request, response, async () => {
      switch (request.path) {
        case '/group':
          await createEventGroup(request, response)
          return
        case '/event':
          await createEvent(request, response)
          return
        default:
          response.status(404).send('not found')
          return
      }
    })
  )

const createEventGroup = async (request: Request, response: Response) => {
  if (request.method !== 'POST') {
    response.status(404).send('not found')
    return
  }
  try {
    const address = await parseToken(request)
    //validate groupId in body
    const groupId = request.body.groupId
    const groupInfo: { ownerAddress: string } = await contractHelper
      .getEventManager()
      .getGroupById(groupId)
    if (address !== groupInfo.ownerAddress.toLocaleLowerCase()) {
      throw 'You are not the owner'
    }
    const groups = firestore.collection('groups')
    await groups.doc(String(groupId)).set(request.body)
    response.sendStatus(200)
  } catch (error) {
    response.status(503).send(error)
  }
}

const createEvent = async (request: Request, response: Response) => {
  if (request.method !== 'POST') {
    response.status(404).send('not found')
    return
  }
  try {
    const address = await parseToken(request)
    //validate eventId in body
    const eventId = request.body.eventId
    const eventInfo: { groupId: BigNumber } = await contractHelper
      .getEventManager()
      .getEventById(eventId)
    const groupInfo: { ownerAddress: string } = await contractHelper
      .getEventManager()
      .getGroupById(eventInfo.groupId.toNumber())
    if (address !== groupInfo.ownerAddress.toLocaleLowerCase()) {
      throw 'You are not the owner'
    }
    const events = firestore.collection('events')
    await events.doc(String(eventId)).set(request.body)
    response.sendStatus(200)
  } catch (error) {
    response.status(503).send(error)
  }
}
