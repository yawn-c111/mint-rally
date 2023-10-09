import { Box, Heading, Text, Container, Spinner } from "@chakra-ui/react";
import { FC } from "react";
import ENSName from "src/components/atoms/web3/ENSName";
import { GroupedCollection } from "src/components/organisms/nft/GroupedCollection";
import {
  useGetOwnedNFTByAddress,
  useSortNFTsByGroup,
} from "src/hooks/useMintNFT";

export const UserEntity: FC<{ address: string }> = ({ address }) => {
  const { nfts, isLoading } = useGetOwnedNFTByAddress(address);
  const groupedNFTs = useSortNFTsByGroup(nfts);
  // if groupedNFT has tokenid, get the nft

  return (
    <Box>
      <Heading as="h1" size="xl" color="yellow.900" fontWeight={700}>
        NFT Collection
      </Heading>
      <Box fontSize="lg" wordBreak="break-all">
        <ENSName address={address} enableEtherScanLink />
      </Box>

      <Box mt={10}>
        {isLoading ? (
          <Spinner />
        ) : (
          <GroupedCollection groupedNFTs={groupedNFTs} />
        )}
      </Box>
    </Box>
  );
};
