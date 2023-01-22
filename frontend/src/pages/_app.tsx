import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import Layout from "../components/layout";
import { chakraTheme } from "../../utils/chakra-theme";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { GoogleAnalytics } from "nextjs-google-analytics";
import { RecoilRoot } from "recoil";

config.autoAddCss = false;
const activeChainId = +process.env.NEXT_PUBLIC_CHAIN_ID!;

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <>
      <GoogleAnalytics trackPageViews />
      <RecoilRoot>
        <ThirdwebProvider desiredChainId={activeChainId}>
          <ChakraProvider theme={chakraTheme}>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </ChakraProvider>
        </ThirdwebProvider>
      </RecoilRoot>
    </>
  );
}

export default MyApp;
