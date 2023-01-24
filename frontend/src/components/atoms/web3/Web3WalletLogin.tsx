import { FC, useCallback } from "react";
import { useLocale } from "../../../hooks/useLocale";
import {
  useAddress,
  useChainId,
  useDisconnect,
  useMetamask,
} from "@thirdweb-dev/react";
import { Box, Button, Flex } from "@chakra-ui/react";
import Image from "next/image";
import SwitchNetwork from "./SwitchNetwork";
import { useFirebaseAuth } from "src/hooks/useFirebase";
import Link from "next/link";

const Web3WalletLogin: FC = () => {
  const address = useAddress();
  const chainId = useChainId();
  const disconnectWallet = useDisconnect();
  const { signinWithWeb3Wallet, signout, isLoggedIn } = useFirebaseAuth();
  const requiredChainId = +process.env.NEXT_PUBLIC_CHAIN_ID!;
  const { t } = useLocale();

  const login = useCallback(async () => {
    if (address && isLoggedIn) return;
    await signinWithWeb3Wallet();
  }, [address, isLoggedIn]);

  const logout = useCallback(async () => {
    try {
      if (isLoggedIn) signout();
      if (address) await disconnectWallet();
    } catch (error) {
      console.log(error);
    }
  }, [isLoggedIn, address]);

  return (
    <Flex justifyContent="center" alignItems="center" mt={{ base: 5, md: 0 }}>
      {address && isLoggedIn ? (
        <>
          {chainId !== requiredChainId ? (
            <Box pr={4}>
              <SwitchNetwork />
            </Box>
          ) : (
            <></>
          )}
          <Button
            bg="mint.subtle"
            color="mint.font"
            borderRadius={"16px"}
            variant="solid"
            onClick={logout}
            size="md"
          >
            {t.SIGN_OUT}
          </Button>
        </>
      ) : (
        <Button
          bg="mint.subtle"
          color="mint.font"
          borderRadius={"16px"}
          variant="solid"
          onClick={login}
          size="md"
        >
          {t.SIGN_IN}
        </Button>
      )}
      {address && isLoggedIn && (
        <Box marginLeft={3} cursor="pointer">
          <Link href="/users/me">
            <Image
              src="/user.png"
              alt="Loggedin"
              width={50}
              height={50}
              objectFit="contain"
            />
          </Link>
        </Box>
      )}
    </Flex>
  );
};

export default Web3WalletLogin;
