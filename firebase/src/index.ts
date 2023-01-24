import * as admin from 'firebase-admin'
admin.initializeApp()

export * from './functions/auth'
export * from './functions/zk'
export * from './functions/event'
