import { atom } from "recoil";
import { FirebaseAuth } from "types/FirebaseAuth";
import { AtomKeys } from "./recoil-keys";

export const firebaseAuthAtom = atom<FirebaseAuth.Auth | null>({
  key: AtomKeys.firebaseAuth,
  default: null,
  effects: [],
});
