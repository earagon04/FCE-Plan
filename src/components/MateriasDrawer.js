import {
  CalendarIcon,
  DeleteIcon,
  LinkIcon,
  MoonIcon,
  SunIcon,
} from "@chakra-ui/icons";
import {
  Alert,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerCloseButton,
  DrawerFooter,
  DrawerOverlay,
  Flex,
  Icon,
  IconButton,
  LightMode,
  Link,
  Tooltip,
  useClipboard,
  useColorMode,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { DataContext } from "../DataContext";
import SelectCurso from "./SelectCurso";
import SelectExtra from "./SelectExtra";
import SelectMateria from "./SelectMateria";
import Sugerencias from "./Sugerencias";

const MateriasDrawer = (props) => {
  const { useAgenda, setUseAgenda, isOpen, onClose, skipOferta, onOpenModal } =
    props;
  const {
    tabs,
    selectedMaterias,
    limpiarTab,
    activeTabId,
    events,
    extraEvents,
    permalink,
    horariosOferta,
    getters,
    removeHorariosOferta,
  } = React.useContext(DataContext);
  const permalinkToast = React.useRef();
  const drawerRef = React.useRef();
  const { toggleColorMode } = useColorMode();
  const toast = useToast();
  const { onCopy } = useClipboard(permalink);

  const materiasToShow = React.useMemo(() => {
    if (!horariosOferta) return [];

    const codigos = horariosOferta.materias.map((m) => m.codigo);
    const codigosUnicos = [...new Set(codigos)].sort();
    const materias = codigosUnicos.map(getters.getMateria);

    return materias;
  }, [getters.getMateria, horariosOferta]);

  return (
    <LightMode>
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="sm">
        <DrawerOverlay bg="blackAlpha.300" />
        <DrawerContent
          bg={useColorModeValue("drawerbgalpha", "drawerbgdarkalpha")}
          w="min-content"
          sx={{
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <DrawerCloseButton />

          <Box pt={14} px={4}>
            {skipOferta ? (
              <Button
                w="100%"
                colorScheme="primary"
                onClick={() => {
                  onClose();
                  onOpenModal();
                }}
              >
                Cargar oferta de cursos
              </Button>
            ) : (
              horariosOferta && (
                <Button
                  w="100%"
                  rightIcon={<DeleteIcon />}
                  colorScheme="red"
                  onClick={async () => {
                    await removeHorariosOferta();
                    onClose();
                  }}
                >
                  Dejar de usar la oferta cargada
                </Button>
              )
            )}
          </Box>

          {horariosOferta && (
            <Box px={6}>
              <SelectMateria
                materiasToShow={materiasToShow}
                drawerRef={drawerRef}
              />
            </Box>
          )}

          <DrawerBody
            style={{
              overflowY: "auto",
              scrollbarWidth: "none",
            }}
            ref={drawerRef}
          >
            {selectedMaterias.map((m) => (
              <SelectCurso codigo={m} key={m} />
            ))}
            {!!extraEvents.length && <SelectExtra />}
          </DrawerBody>

          <Flex justifyContent="space-around">
            {!!events.length && (
              <Button
                borderColor="primary.300"
                borderWidth={1}
                leftIcon={
                  <Icon boxSize={5} viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M7 4C7 2.89543 7.89543 2 9 2H15C16.1046 2 17 2.89543 17 4V6H18.9897C18.9959 5.99994 19.0021 5.99994 19.0083 6H21C21.5523 6 22 6.44772 22 7C22 7.55228 21.5523 8 21 8H19.9311L19.0638 20.1425C18.989 21.1891 18.1182 22 17.0689 22H6.93112C5.88184 22 5.01096 21.1891 4.9362 20.1425L4.06888 8H3C2.44772 8 2 7.55228 2 7C2 6.44772 2.44772 6 3 6H4.99174C4.99795 5.99994 5.00414 5.99994 5.01032 6H7V4ZM9 6H15V4H9V6ZM6.07398 8L6.93112 20H17.0689L17.926 8H6.07398ZM10 10C10.5523 10 11 10.4477 11 11V17C11 17.5523 10.5523 18 10 18C9.44772 18 9 17.5523 9 17V11C9 10.4477 9.44772 10 10 10ZM14 10C14.5523 10 15 10.4477 15 11V17C15 17.5523 14.5523 18 14 18C13.4477 18 13 17.5523 13 17V11C13 10.4477 13.4477 10 14 10Z"
                    />
                  </Icon>
                }
                colorScheme="primary"
                variant="ghost"
                fontSize="sm"
                onClick={() => {
                  limpiarTab();
                }}
              >
                Limpiar {tabs.find((t) => t.id === activeTabId).title || "Plan"}
              </Button>
            )}
          </Flex>

          <DrawerFooter p={4} flex justifyContent="space-between">
            <Box>
              <Tooltip label="Cambiar vista" placement="top">
                <IconButton
                  mr={1}
                  variant="outline"
                  colorScheme="primary"
                  icon={<CalendarIcon />}
                  onClick={() => setUseAgenda(!useAgenda)}
                />
              </Tooltip>

              <Tooltip label="Copiar Permalink" placement="top">
                <IconButton
                  variant="ghost"
                  colorScheme="primary"
                  size="sm"
                  icon={<LinkIcon />}
                  onClick={() => {
                    onClose();
                    onCopy();
                    toast.close(permalinkToast.current);
                    return (permalinkToast.current = toast({
                      position: "bottom-start",
                      duration: 1500,
                      render: () => (
                        <LightMode>
                          <Alert
                            borderRadius="md"
                            colorScheme="purple"
                            borderWidth={1}
                            borderColor="purple.400"
                            color="gray.800"
                          >
                            <AlertIcon as={LinkIcon} />
                            <AlertTitle>Permalink copiado!</AlertTitle>
                          </Alert>
                        </LightMode>
                      ),
                    }));
                  }}
                />
              </Tooltip>
            </Box>

            <Box textAlign="right">
              <Tooltip
                label={`Tema ${useColorModeValue("oscuro", "claro")}`}
                placement="top"
              >
                <Link color="primary.600" onClick={toggleColorMode}>
                  {useColorModeValue(<MoonIcon />, <SunIcon />)}
                </Link>
              </Tooltip>

              <Tooltip label="Oferta FCE" placement="top">
                <Link
                  color="primary.600"
                  isExternal
                  href="https://mi.econ.uba.ar/Oferta/"
                >
                  <Icon boxSize={4} ml={2} viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z"
                    />
                  </Icon>
                </Link>
              </Tooltip>

              <Tooltip label="Invitame un Cafecito" placement="top">
                <Link
                  color="primary.600"
                  isExternal
                  href="https://cafecito.app/fdelmazo"
                >
                  <Icon boxSize={4} ml={2} viewBox="0 0 512 512">
                    <path
                      fill="currentColor"
                      d="M127.1 146.5c1.3 7.7 8 13.5 16 13.5h16.5c9.8 0 17.6-8.5 16.3-18-3.8-28.2-16.4-54.2-36.6-74.7-14.4-14.7-23.6-33.3-26.4-53.5C111.8 5.9 105 0 96.8 0H80.4C70.6 0 63 8.5 64.1 18c3.9 31.9 18 61.3 40.6 84.4 12 12.2 19.7 27.5 22.4 44.1zm112 0c1.3 7.7 8 13.5 16 13.5h16.5c9.8 0 17.6-8.5 16.3-18-3.8-28.2-16.4-54.2-36.6-74.7-14.4-14.7-23.6-33.3-26.4-53.5C223.8 5.9 217 0 208.8 0h-16.4c-9.8 0-17.5 8.5-16.3 18 3.9 31.9 18 61.3 40.6 84.4 12 12.2 19.7 27.5 22.4 44.1zM400 192H32c-17.7 0-32 14.3-32 32v192c0 53 43 96 96 96h192c53 0 96-43 96-96h16c61.8 0 112-50.2 112-112s-50.2-112-112-112zm0 160h-16v-96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48z"
                    />
                  </Icon>
                </Link>
              </Tooltip>

              <Tooltip label="Calendario Académico" placement="top">
                <Link
                  color="primary.600"
                  isExternal
                  href="https://www.economicas.uba.ar/"
                >
                  <Icon boxSize={5} ml={2} viewBox="0 0 512 512">
                    <path
                      fill="currentColor"
                      d="M496 128v16a8 8 0 0 1-8 8h-24v12c0 6.627-5.373 12-12 12H60c-6.627 0-12-5.373-12-12v-12H24a8 8 0 0 1-8-8v-16a8 8 0 0 1 4.941-7.392l232-88a7.996 7.996 0 0 1 6.118 0l232 88A8 8 0 0 1 496 128zm-24 304H40c-13.255 0-24 10.745-24 24v16a8 8 0 0 0 8 8h464a8 8 0 0 0 8-8v-16c0-13.255-10.745-24-24-24zM96 192v192H60c-6.627 0-12 5.373-12 12v20h416v-20c0-6.627-5.373-12-12-12h-36V192h-64v192h-64V192h-64v192h-64V192H96z"
                    />
                  </Icon>
                </Link>
              </Tooltip>

              <Sugerencias onClose={onClose} />
            </Box>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </LightMode>
  );
};

export default MateriasDrawer;
