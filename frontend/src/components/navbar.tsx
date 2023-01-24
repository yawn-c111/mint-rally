import { CalendarIcon, HamburgerIcon, SettingsIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  IconButton,
  Link,
  Spacer,
  useDisclosure,
} from "@chakra-ui/react";
import NextLink from "next/link";
import router from "next/router";
import Image from "next/image";
import { useLocale } from "../hooks/useLocale";
import LocaleSelector from "./atoms/LocaleSelector";
import Web3WalletLogin from "./atoms/web3/Web3WalletLogin";

const Navbar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { t } = useLocale();

  return (
    <>
      <Flex
        as="nav"
        bg="mint.bg"
        align="center"
        color="mint.front"
        justify="space-between"
        px={{ base: 3, md: 5 }}
        pr={{ base: 0, md: 5 }}
      >
        <Flex
          justifyContent="center"
          width={{ base: "150px", md: "auto" }}
          pr={8}
        >
          <Link href="/">
            <Image
              src={"/images/logo.svg"}
              height={75}
              width={200}
              objectFit="contain"
              alt="Mint Rally Logo"
            />
          </Link>
        </Flex>
        <Box pr={4} display={{ base: "none", md: "block" }}>
          <Link href="/event-groups" as={NextLink}>
            <Button
              leftIcon={<SettingsIcon />}
              bg="mint.white"
              color="mint.font"
              borderRadius={"16px"}
              variant="solid"
              size="md"
            >
              {t.EVENTGROUPS}
            </Button>
          </Link>
        </Box>
        <Box display={{ base: "none", md: "block" }}>
          <Link href="/events" as={NextLink}>
            <Button
              leftIcon={<CalendarIcon />}
              bg="mint.white"
              color="mint.font"
              borderRadius={"16px"}
              variant="solid"
              size="md"
            >
              {t.EVENTS}
            </Button>
          </Link>
        </Box>
        <Flex
          align="center"
          fontSize="sm"
          flexGrow={2}
          display={{ base: "none", md: "flex" }}
        >
          <Spacer />
          <a
            href="https://s.c4j.jp/summit-nft"
            target="_blank"
            rel="noreferrer"
          >
            <Button
              bg="mint.subtle"
              color="mint.font"
              borderRadius={"16px"}
              variant="solid"
              size="md"
              mr={4}
            >
              {t.HELP}
            </Button>
          </a>
          <LocaleSelector></LocaleSelector>
          <Box px={4}>
            <Web3WalletLogin />
          </Box>
        </Flex>

        <IconButton
          aria-label="Menu"
          icon={<HamburgerIcon />}
          size="lg"
          variant="unstyled"
          display={{ base: "flex", md: "none" }}
          onClick={onOpen}
        />
      </Flex>
      <Drawer placement="left" size="xs" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay>
          <DrawerContent>
            <DrawerBody p={0} bg="gray.100" textAlign="center">
              <Button w="100%" onClick={() => router.push("/")}>
                {t.TOP}
              </Button>
              <Button w="100%" onClick={() => router.push("/event-groups/")}>
                {t.EVENTGROUPS}
              </Button>
              <Button w="100%" onClick={() => router.push("/events/")}>
                {t.EVENTS}
              </Button>
              <a
                href="https://s.c4j.jp/summit-nft"
                target="_blank"
                rel="noreferrer"
              >
                <Button w="100%">{t.HELP}</Button>
              </a>

              <LocaleSelector></LocaleSelector>
              <Web3WalletLogin />
            </DrawerBody>
          </DrawerContent>
        </DrawerOverlay>
      </Drawer>
    </>
  );
};
export default Navbar;
