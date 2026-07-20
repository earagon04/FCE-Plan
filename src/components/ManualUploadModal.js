import {
  Button,
  Code,
  Kbd,
  Link,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  OrderedList,
  Select,
  Text,
  Textarea,
  useToast,
  Flex,
} from "@chakra-ui/react";
import React from "react";
import { DataContext } from "../DataContext";

const ManualUploadModal = ({ isOpen, onClose, onSkip, setSkipOferta }) => {
  const toast = useToast();
  const [error, setError] = React.useState("");
  const [ofertaData, setOfertaData] = React.useState("");
  const [periodosOptions, setPeriodosOptions] = React.useState([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState(null);
  const { applyHorariosOferta, getPeriodosOferta } =
    React.useContext(DataContext);

  const handleSuccessfulUpload = () => {
    setSkipOferta(false);
    onClose();
    toast({
      title: "Oferta de cursos aplicada",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      onCloseComplete={() => {
        setError("");
        setOfertaData("");
        setPeriodosOptions([]);
        setSelectedPeriod(null);
      }}
    >
      <ModalOverlay />
      <ModalContent borderWidth="2px" borderColor="primary.500">
        <ModalHeader>Importar oferta de cursos FCE</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={3}>
            Para armar tu horario necesitás importar la oferta del cuatrimestre
            desde el sitio de la Facultad de Ciencias Económicas.
          </Text>

          <Text mb={3}>Seguí estos pasos:</Text>
          <OrderedList my={2}>
            <ListItem>
              Andá a{" "}
              <Link isExternal href="https://mi.econ.uba.ar/Oferta/">
                <Code
                  _hover={{
                    bg: "primary.600",
                  }}
                >
                  mi.econ.uba.ar/Oferta/
                </Code>
              </Link>{" "}
              y abrí la oferta del cuatrimestre actual
            </ListItem>
            <ListItem>
              Seleccioná todo el contenido de la página (<Kbd>CTRL</Kbd> +{" "}
              <Kbd>A</Kbd>)
            </ListItem>
            <ListItem>
              Copiá todo (<Kbd>CTRL</Kbd> + <Kbd>C</Kbd>)
            </ListItem>
            <ListItem>
              Pegalo en el siguiente cuadro de texto (<Kbd>CTRL</Kbd> +{" "}
              <Kbd>V</Kbd>).
            </ListItem>
          </OrderedList>
          <Textarea
            my={1}
            size="sm"
            name="oferta"
            onChange={(e) => setOfertaData(e.target.value)}
            value={ofertaData}
          />
          {periodosOptions.length > 0 && (
            <Select
              borderColor="tomato"
              borderWidth={2}
              placeholder="Elegir período"
              my={2}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {periodosOptions.map((p) => (
                <option key={p.periodo} value={p.periodo}>
                  {p.periodo} (Materias: {p.materias.length})
                </option>
              ))}
            </Select>
          )}

          <Flex gap={2} my={4}>
            {periodosOptions.length > 0 ? (
              <Button
                flex={1}
                colorScheme="primary"
                isDisabled={!selectedPeriod}
                onClick={() => {
                  const periodo = periodosOptions.find(
                    (p) => p.periodo === selectedPeriod,
                  );
                  applyHorariosOferta(periodo);
                  handleSuccessfulUpload();
                }}
              >
                Agregar horarios
              </Button>
            ) : (
              <Button
                flex={1}
                colorScheme="primary"
                isDisabled={!ofertaData}
                onClick={() => {
                  try {
                    const periodos = getPeriodosOferta(ofertaData);
                    if (periodos.length > 1) {
                      setPeriodosOptions(periodos);
                    } else {
                      applyHorariosOferta(periodos[0]);
                      handleSuccessfulUpload();
                    }
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Cargar horarios
              </Button>
            )}

            <Button
              flex={1}
              variant="outline"
              onClick={() => {
                onSkip();
                onClose();
              }}
            >
              Seguir sin importar
            </Button>
          </Flex>

          {error && (
            <Text size="sm" color="tomato">
              {error}
            </Text>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ManualUploadModal;
