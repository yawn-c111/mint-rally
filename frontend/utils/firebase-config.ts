import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_APIKEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTHDOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APPID,
};

export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
export const firebaseAuth = getAuth(firebaseApp);
if (process.env.NEXT_PUBLIC_FIREBASE_USEEMULATOR === "true") {
  connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099");
}
