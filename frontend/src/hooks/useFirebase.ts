import { useAddress, useMetamask } from "@thirdweb-dev/react";
import { signInWithCustomToken } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { ACCESSTOKEN } from "src/constants/localstorage-keys";
import cloudfunctionClient from "utils/cloudfunction-client";
import { firebaseAuth } from "utils/firebase-config";
import { ConnectorData } from "wagmi";

export const useFirebaseAuth = () => {
  const address = useAddress();
  const [isLoggedIn, setLoggedin] = useState(false);
  const connectWithMetamask = useMetamask();

  useEffect(() => {
    const verifyAccessToken = async () => {
      try {
        const accessToken = localStorage.getItem(ACCESSTOKEN);
        if (!accessToken) return;
        const { userId } = await cloudfunctionClient.get(
          "/auth/verify-idToken"
        );
        if (userId === address?.toLowerCase()) {
          setLoggedin(true);
        } else {
          setLoggedin(false);
        }
      } catch (error) {
        setLoggedin(false);
      }
    };
    verifyAccessToken();
  }, [address]);

  const signinWithWeb3Wallet = useCallback(async () => {
    const { ethereum } = window;
    if (!ethereum) return;
    const res = (await connectWithMetamask()) as {
      data?: ConnectorData<any> | undefined;
      error?: Error | undefined;
    };
    if (isLoggedIn || res.error) {
      return;
    }
    const sendAddress = res?.data?.account?.toLowerCase();
    if (!sendAddress) return;
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
    setLoggedin(true);
  }, [address, isLoggedIn]);

  const signout = () => {
    localStorage.removeItem(ACCESSTOKEN);
    setLoggedin(false);
  };

  return { signinWithWeb3Wallet, signout, isLoggedIn };
};

const toHex = (stringToConvert: string) => {
  return stringToConvert
    .split("")
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
};
