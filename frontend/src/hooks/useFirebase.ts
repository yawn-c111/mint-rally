import { useAddress } from "@thirdweb-dev/react";
import { signInWithCustomToken } from "firebase/auth";
import { ACCESSTOKEN } from "src/constants/localstorage-keys";
import cloudfunctionClient from "utils/cloudfunction-client";
import { firebaseAuth } from "utils/firebase-config";

export const useFirebaseAuth = () => {
  const address = useAddress();
  const signinWithMetamask = async () => {
    const { ethereum } = window;
    if (!ethereum || !address) return;
    const sendAddress = address.toLowerCase();
    const { nonce } = await cloudfunctionClient.post(
      "/auth/get-nonce-to-sign",
      { address: sendAddress }
    );
    const sign = await ethereum.request({
      method: "personal_sign",
      params: [`0x${toHex(nonce)}`, sendAddress],
    });
    const { token } = await cloudfunctionClient.post("/auth/verify-sign", {
      address: sendAddress,
      sign,
    });
    const user: any = await signInWithCustomToken(firebaseAuth, token);
    localStorage.setItem(ACCESSTOKEN, user.user.accessToken);
  };

  return { signinWithMetamask };
};

const toHex = (stringToConvert: string) => {
  return stringToConvert
    .split("")
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
};
