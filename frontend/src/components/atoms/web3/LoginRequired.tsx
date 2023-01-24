import { Text } from "@chakra-ui/react";
import { FC, ReactNode } from "react";
import { useAddress, useChainId } from "@thirdweb-dev/react";

type Props = {
  children: ReactNode;
  requiredChainID: number;
  forbiddenText: string;
};
const LoginRequired: FC<Props> = ({
  children,
  requiredChainID,
  forbiddenText,
}: Props) => {
  const address = useAddress();
  const chainId = useChainId()!;

  return (
    <>
      {!address ? (
        <Text fontSize="xl">{forbiddenText}</Text>
      ) : chainId !== requiredChainID ? (
        <Text fontSize="xl"></Text>
      ) : (
        children
      )}
    </>
  );
};
export default LoginRequired;
