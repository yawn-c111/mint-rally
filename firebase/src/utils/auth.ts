import { Request } from 'firebase-functions'
import * as admin from 'firebase-admin'

const auth = admin.auth()

export const parseToken = async (request: Request) => {
  try {
    const token = request.headers.authorization
    if (!token) throw 'Token is not passed'
    const decoded = await auth.verifyIdToken(token)
    return decoded.user_id
  } catch (error) {
    throw error
  }
}
