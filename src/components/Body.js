import { AddIcon } from "@chakra-ui/icons";
import {
  Box,
  IconButton,
  Image,
  Tooltip,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import "moment/locale/es";
import React from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useHotkeys } from "react-hotkeys-hook";
import { DataContext } from "../DataContext";
import useWindowSize from "../useWindowSize";
import Calendar from "./Calendar";
import ManualUploadModal from "./ManualUploadModal";
import MateriasDrawer from "./MateriasDrawer";

const Body = () => {
  const { events, horariosOferta, setSkipOferta, skipOferta } =
    React.useContext(DataContext);
  const [useAgenda, setUseAgenda] = React.useState(false);
  const { width } = useWindowSize();
  const {
    isOpen: isOpenDrawer,
    onToggle: onToggleDrawer,
    onClose: onCloseDrawer,
  } = useDisclosure();
  const {
    isOpen: isOpenModal,
    onToggle: onToggleModal,
    onClose: onCloseModal,
  } = useDisclosure();

  useHotkeys(
    "esc",
    horariosOferta || skipOferta ? onToggleDrawer : onToggleModal,
    {
      enableOnFormTags: true,
    },
  );

  React.useEffect(() => {
    setUseAgenda(width < 1000);
  }, [width]);

  return (
    <Box id={useColorModeValue(undefined, "dark")} flexGrow={1}>
      <MateriasDrawer
        isOpen={isOpenDrawer}
        onClose={onCloseDrawer}
        useAgenda={useAgenda}
        setUseAgenda={setUseAgenda}
        skipOferta={skipOferta}
        onOpenModal={onToggleModal}
      />
      <ManualUploadModal
        isOpen={isOpenModal}
        onClose={onCloseModal}
        onSkip={() => setSkipOferta(true)}
        setSkipOferta={setSkipOferta}
      />

      <Calendar events={events} useAgenda={useAgenda} />

      <Box
        position="absolute"
        right={10}
        bottom={10}
        display="flex"
        flexDirection="column"
        gap={2}
      >
        {!horariosOferta && !skipOferta ? (
          <Tooltip label="Cargar oferta de cursos" hasArrow placement="left">
            <IconButton
              borderColor="drawerbg"
              borderWidth={2}
              bg="white"
              _hover={{ bg: "gray.100" }}
              _active={{ bg: "gray.200" }}
              icon={
                <Image
                  src={`${process.env.PUBLIC_URL}/mi-econ-logo.png`}
                  alt=""
                  boxSize={7}
                />
              }
              onClick={onToggleModal}
              aria-label="Cargar oferta de cursos"
            />
          </Tooltip>
        ) : (
          <Tooltip label="Agregar Materias" hasArrow placement="left">
            <IconButton
              borderColor="drawerbg"
              borderWidth={2}
              icon={<AddIcon fontWeight="bold" color="drawerbg" />}
              onClick={onToggleDrawer}
              colorScheme="primary"
              aria-label="Agregar Materias"
            />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default Body;
