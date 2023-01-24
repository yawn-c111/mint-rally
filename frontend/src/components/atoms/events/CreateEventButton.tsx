import { CheckIcon } from "@chakra-ui/icons";
import { Box, Button, Link, Spinner, useDisclosure } from "@chakra-ui/react";
import { FC, useEffect, useMemo } from "react";
import ModalBase from "src/components/molecules/common/ModalBase";

type Props = {
  uploadingMetadata?: boolean;
  generatingVk?: boolean;
  makingTx?: boolean;
  success?: boolean;
  eventId?: number;
};

const CreateEventButton: FC<Props> = ({
  uploadingMetadata = false,
  generatingVk = false,
  makingTx = false,
  success = false,
  eventId,
}) => {
  const isSubmitting = useMemo(() => {
    return uploadingMetadata || generatingVk || makingTx;
  }, [uploadingMetadata, generatingVk, makingTx]);

  const { isOpen, onClose, onOpen } = useDisclosure();

  useEffect(() => {
    if (isSubmitting || eventId) {
      onOpen();
    }
  }, [isSubmitting, eventId]);

  return (
    <>
      <Button
        mt={10}
        type="submit"
        isLoading={isSubmitting}
        backgroundColor="mint.bg"
        size="lg"
        width="full"
        disabled={isSubmitting || success}
      >
        {isSubmitting ? <Spinner /> : success ? "Success" : "Create"}
      </Button>
      <ModalBase isOpen={isOpen} onClose={onClose}>
        <Box py={3}>
          <Box mb={3} display="flex" alignItems="center">
            {uploadingMetadata ? <Spinner mr={2} /> : <CheckIcon mr={2} />}
            Upload Metadata
          </Box>
          <Box mb={3} display="flex" alignItems="center">
            {generatingVk ? <Spinner mr={2} /> : <CheckIcon mr={2} />}
            Generate Verification Key（1分弱かかります）
          </Box>
          <Box display="flex" alignItems="center">
            {makingTx ? <Spinner mr={2} /> : <CheckIcon mr={2} />}
            Making Transaction
          </Box>

          {eventId && (
            <>
              <Link href={`/events/${eventId}`}>
                <Button mt={5} backgroundColor="mint.bg" width="full" size="lg">
                  Go to Event Page
                </Button>
              </Link>
            </>
          )}
        </Box>
      </ModalBase>
    </>
  );
};

export default CreateEventButton;
