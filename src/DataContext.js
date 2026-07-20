/* https://github.com/facebook/react/issues/14476#issuecomment-471199055 */
/* eslint-disable react-hooks/exhaustive-deps */

import React from "react";
import { useImmer, useImmerReducer } from "use-immer";
import { parseFCE } from "./fceparser";
import { getColor, base64tojson, jsontobase64 } from "./utils";

const STORAGE_KEY = "fceplan";

// Si tengo un permalink, parseo su info y reseteo la URL
let permalinksavedata = null;
if (window.location.hash) {
  try {
    permalinksavedata = base64tojson(window.location.hash.slice(1));
  } catch (error) {
    permalinksavedata = "";
  }
  // eslint-disable-next-line no-restricted-globals
  history.pushState("", "", window.location.pathname + window.location.search);
}

let json = null;
try {
  json = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
} catch (e) {
  console.warn("Error al parsear el JSON del localStorage", e);
} finally {
  if (!json) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
  }
}

export const DataContext = React.createContext();

export const DataProvider = ({ children }) => {
  const data = Data();

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
};

const Data = () => {
  const [errorPermalink, setErrorPermalink] = React.useState(
    permalinksavedata === "",
  );
  const [horariosOferta, setHorariosOferta] = React.useState(
    initialHorariosOferta,
  );
  const [skipOferta, setSkipOferta] = React.useState(
    getFromStorage("skipOferta") || false,
  );

  const getters = React.useMemo(() => {
    const getMateria = (codigo) => {
      return horariosOferta?.materias.find((m) => m.codigo === codigo);
    };

    const getCurso = (codigo) => {
      return horariosOferta?.cursos.find((c) => c.codigo === codigo);
    };

    const getCursosMateria = (codigoMateria) => {
      const cursos = horariosOferta?.materias.find(
        (m) => m.codigo === codigoMateria,
      ).cursos;
      return cursos?.map(getCurso) || [];
    };

    return {
      getMateria,
      getCurso,
      getCursosMateria,
    };
  }, [horariosOferta]);

  const [selectedMaterias, setSelectedMaterias] = useImmer(() =>
    initialSelectedMaterias(),
  );

  const [activeTabId, setActiveTabId] = React.useState(0);

  const tabsReducer = (draft, action) => {
    // eslint-disable-next-line default-case
    switch (action.type) {
      case "add":
        return void draft.push({ id: action.id });
      case "rename":
        return void (draft.find((t) => t.id === action.id).title =
          action.title);
      case "remove":
        return draft.filter((t) => t.id !== action.id);
    }
  };

  const [tabs, tabsDispatch] = useImmerReducer(
    tabsReducer,
    [{ id: 0 }],
    initialTabs,
  );

  const tabEventsReducer = (draft, action) => {
    // eslint-disable-next-line default-case
    switch (action.type) {
      case "select":
        if (getters.getCurso(action.id)) {
          if (!draft[activeTabId].cursos.includes(action.id)) {
            draft[activeTabId].cursos.push(action.id);
          } else {
            draft[activeTabId].cursos = draft[activeTabId].cursos.filter(
              (i) => i !== action.id,
            );
          }
        } else {
          if (!draft[activeTabId].extra.includes(action.id)) {
            draft[activeTabId].extra.push(action.id);
          } else {
            draft[activeTabId].extra = draft[activeTabId].extra.filter(
              (i) => i !== action.id,
            );
          }
        }
        return;
      case "resetTab":
        draft[action.tabId] = { cursos: [], extra: [] };
        return;
      case "removeTab":
        delete draft[action.tabId];
        return;
      case "removeExtra":
        return Object.fromEntries(
          Object.entries(draft).map(([tabId, { cursos, extra }]) => [
            tabId,
            { cursos, extra: extra.filter((i) => i !== action.id) },
          ]),
        );
      case "removeCursos":
        return Object.fromEntries(
          Object.entries(draft).map(([tabId, { cursos, extra }]) => [
            tabId,
            { cursos: cursos.filter((i) => !action.ids.includes(i)), extra },
          ]),
        );
      case "removeAllExtra":
        return Object.fromEntries(
          Object.entries(draft).map(([tabId, { cursos, _extra }]) => [
            tabId,
            { cursos, extra: [] },
          ]),
        );
    }
  };

  const [tabEvents, tabEventsDispatch] = useImmerReducer(
    tabEventsReducer,
    { 0: { cursos: [], extra: [] } },
    (defvalue) => initialTabEvents(defvalue),
  );

  const extraEventsReducer = (draft, action) => {
    // eslint-disable-next-line default-case
    switch (action.type) {
      case "add":
        return void draft.push({
          id: action.event.id,
          start: action.event.start,
          end: action.event.end,
          title: action.event.title,
          color: getColor({ id: action.event.id }),
        });
      case "rename":
        return void (draft.find((t) => t.id === action.id).title =
          action.title);
      case "remove":
        return draft.filter((t) => t.id !== action.id);
      case "setColor": {
        const extra = draft.find((t) => t.id === action.id);
        if (!extra) return;
        extra.color = action.color || getColor({ id: action.id });
        return;
      }
      case "reset":
        return [];
    }
  };

  const [extraEvents, extraEventsDispatch] = useImmerReducer(
    extraEventsReducer,
    [],
    initialExtraEvents,
  );

  const getPeriodosOferta = (rawdata) => {
    let periodos;
    try {
      periodos = parseFCE(rawdata);
      if (!periodos.length) {
        throw new Error("No se encontraron horarios en el texto pegado");
      }
    } catch (e) {
      console.warn(e);
      throw new Error("Error al parsear la oferta de cursos de FCE");
    }
    return periodos;
  };

  const applyHorariosOferta = (periodo) => {
    setHorariosOferta(periodo);
  };

  const removeHorariosOferta = async () => {
    selectedMaterias.forEach((codigo) => {
      toggleMateria(codigo);
    });
    setHorariosOferta(null);
  };

  const [coloresCursos, setColoresCursos] = useImmer(() =>
    initialCursoColors(),
  );

  const setColorCurso = (codigoCurso, color) => {
    setColoresCursos((colores) => {
      colores[codigoCurso] = color;
    });
  };

  const [cursosIgnorados, setCursosIgnorados] = useImmer(() =>
    initialCursosIgnorados(),
  );

  const formatHora = (hora) => {
    const hh = String(hora.getHours()).padStart(2, "0");
    const mm = String(hora.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const keyCursoIgnorado = (dia, inicio, fin) => {
    return `${dia}-${formatHora(inicio)}-${formatHora(fin)}`;
  };

  const toggleIgnorarCurso = (codigoCurso, dia, inicio, fin) => {
    setCursosIgnorados((ignorados) => {
      const key = keyCursoIgnorado(dia, inicio, fin);
      if (!ignorados[codigoCurso]) {
        ignorados[codigoCurso] = { [key]: true };
      } else {
        ignorados[codigoCurso][key] = !ignorados[codigoCurso][key];
      }
    });
  };

  const isCursoIgnorado = (codigoCurso, dia, inicio, fin) => {
    return !!cursosIgnorados[codigoCurso]?.[keyCursoIgnorado(dia, inicio, fin)];
  };

  const savedata = React.useMemo(() => {
    return {
      selectedMaterias,
      tabEvents,
      tabs,
      extraEvents,
      horariosOferta,
      skipOferta,
      coloresCursos,
      cursosIgnorados,
    };
  }, [
    JSON.stringify(selectedMaterias),
    JSON.stringify(tabEvents),
    JSON.stringify(tabs),
    JSON.stringify(extraEvents),
    JSON.stringify(horariosOferta),
    JSON.stringify(skipOferta),
    JSON.stringify(coloresCursos),
    JSON.stringify(cursosIgnorados),
  ]);

  const [readOnly, setReadOnly] = React.useState(!!permalinksavedata);

  const permalink = React.useMemo(() => {
    const savedatab64 = jsontobase64(savedata);
    return `${window.location.origin}${window.location.pathname}#${savedatab64}`;
  }, [JSON.stringify(savedata)]);

  React.useEffect(() => {
    if (readOnly) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedata));
  }, [JSON.stringify(savedata), readOnly]);

  const toggleMateria = (codigo) => {
    if (selectedMaterias.includes(codigo)) {
      const ids = getters.getCursosMateria(codigo).map((c) => c.codigo);
      tabEventsDispatch({ type: "removeCursos", ids });
      setSelectedMaterias((draft) => draft.filter((i) => i !== codigo));
    } else {
      toggleCurso(getters.getCursosMateria(codigo)[0].codigo);
      setSelectedMaterias((draft) => [...draft, codigo]);
    }
  };

  const toggleCurso = (codigo) => {
    tabEventsDispatch({ type: "select", id: codigo, tabId: activeTabId });
  };

  const addExtra = ({ start, end }) => {
    const minutes = Math.floor((end - start) / 1000 / 60);
    if (minutes < 60) return;

    const id = start.getTime() + end.getTime() + Math.random() * 100;
    const randomLetter = String.fromCharCode(
      65 + Math.floor(id % 23) + Math.floor(id % 3),
    );
    const title = `ACTIVIDAD ${randomLetter}`;

    extraEventsDispatch({ type: "add", event: { start, end, id, title } });
    toggleExtra(id);
  };

  const toggleExtra = (id) => {
    tabEventsDispatch({ type: "select", id });
  };

  const removeExtra = (id) => {
    if (tabEvents[activeTabId].extra.includes(id)) {
      toggleExtra(id);
    }
    tabEventsDispatch({ type: "removeExtra", id });
    extraEventsDispatch({ type: "remove", id });
  };

  const removeExtraFromTab = (id) => {
    const tabs = Object.values(tabEvents).filter((tab) =>
      tab.extra.includes(id),
    );
    if (tabs.length === 1) {
      removeExtra(id);
    } else {
      toggleExtra(id);
    }
  };

  const renameExtra = (id, str) => {
    extraEventsDispatch({
      type: "rename",
      id: id,
      title: str.trim() || "EXTRA",
    });
  };

  const setColorExtra = (id, color) => {
    extraEventsDispatch({ type: "setColor", id, color });
  };

  const removeAllExtra = () => {
    tabEventsDispatch({ type: "removeAllExtra" });
    extraEventsDispatch({ type: "reset" });
  };

  const limpiarTab = () => {
    tabEventsDispatch({ type: "resetTab", tabId: activeTabId });
  };

  const selectTab = (id) => {
    setActiveTabId(id);
  };

  const addTab = () => {
    const ids = tabs.map((t) => t.id);
    let id = 0;
    while (ids.includes(id)) {
      id += 1;
    }
    tabsDispatch({ type: "add", id });
    tabEventsDispatch({ type: "resetTab", tabId: id });
    selectTab(id);
  };

  const renameTab = (id, title) => {
    tabsDispatch({ type: "rename", id, title });
  };

  const removeTab = (id) => {
    tabsDispatch({ type: "remove", id });
    tabEventsDispatch({ type: "removeTab", tabId: id });

    if (tabs.length === 1) {
      addTab();
    } else {
      const index = tabs.map((t) => t.id).indexOf(id);
      selectTab(tabs[index > 0 ? index - 1 : index + 1].id);
    }
  };

  const events = React.useMemo(() => {
    const extraevents = tabEvents[activeTabId].extra.map((ev) => {
      const event = extraEvents.find((e) => e.id === ev);
      const title = event.title;
      const subtitle = "ACTIVIDAD EXTRACURRICULAR";
      const tooltip = `${title}\n${subtitle}`;

      return {
        start: event.start,
        end: event.end,
        id: event.id,
        title,
        subtitle,
        tooltip,
        curso: null,
        virtual: false,
        color: event.color ?? getColor({ id: event.id }),
      };
    });

    const clases = tabEvents[activeTabId].cursos
      .map(getters.getCurso)
      .flatMap((curso) => {
        const materia = getters.getMateria(curso.materia);
        return curso.clases.map((clase) => {
          const inicio = new Date(2018, 0, clase.dia);
          const [inicioHora, inicioMinutos] = clase.inicio.split(":");
          inicio.setHours(inicioHora, inicioMinutos);
          const fin = new Date(2018, 0, clase.dia);
          const [finHora, finMinutos] = clase.fin.split(":");
          fin.setHours(finHora, finMinutos);

          const metaParts = [
            curso.sede,
            curso.modalidad ? `Mod. ${curso.modalidad}` : null,
            clase.virtual ? "Virtual" : null,
          ].filter(Boolean);

          const title = `[${materia.codigo}] ${materia.nombre}`;
          const subtitle = [curso.docentes, metaParts.join(" · ")]
            .filter(Boolean)
            .join("\n");
          const tooltip = [
            `[${materia.codigo}] ${materia.nombre}`,
            curso.docentes || "(sin docente)",
            curso.catedra ? `Cát: ${curso.catedra}` : null,
            metaParts.join(" · "),
            curso.ia ? "Con apoyo de IA" : null,
            curso.obs || materia.obs || null,
          ]
            .filter(Boolean)
            .join("\n");

          const id =
            curso.codigo +
            clase.dia +
            clase.inicio +
            clase.fin +
            (clase.virtual ? "V" : "P");

          return {
            start: inicio,
            end: fin,
            id,
            title,
            subtitle,
            tooltip,
            curso: curso.codigo,
            codigoMateria: materia.codigo,
            virtual: !!clase.virtual,
            sede: curso.sede,
            modalidad: curso.modalidad,
            color: coloresCursos[curso.codigo] ?? getColor({ id }),
          };
        });
      });

    if (extraEvents.length === 0) return clases;
    return [...clases, ...extraevents];
  }, [
    activeTabId,
    extraEvents,
    JSON.stringify(tabEvents),
    JSON.stringify(coloresCursos),
  ]);

  return {
    selectedMaterias,
    activeTabId,
    tabs,
    extraEvents,
    readOnly,
    setReadOnly,
    permalink,
    toggleMateria,
    toggleCurso,
    addExtra,
    toggleExtra,
    removeExtra,
    removeExtraFromTab,
    renameExtra,
    setColorExtra,
    removeAllExtra,
    limpiarTab,
    selectTab,
    addTab,
    renameTab,
    removeTab,
    events,
    horariosOferta,
    applyHorariosOferta,
    removeHorariosOferta,
    getters,
    getPeriodosOferta,
    errorPermalink,
    setErrorPermalink,
    skipOferta,
    setSkipOferta,
    coloresCursos,
    setColorCurso,
    cursosIgnorados,
    toggleIgnorarCurso,
    isCursoIgnorado,
  };
};

const getFromStorage = (key) => {
  const json = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  return json?.[key];
};

const initialSelectedMaterias = () => {
  return (
    permalinksavedata?.selectedMaterias ||
    getFromStorage("selectedMaterias") ||
    []
  );
};

const initialTabs = (defvalue) => {
  return permalinksavedata?.tabs || getFromStorage("tabs") || defvalue;
};

const initialTabEvents = (defvalue) => {
  const tabEvents =
    permalinksavedata?.tabEvents || getFromStorage("tabEvents") || defvalue;
  return Object.fromEntries(
    Object.entries(tabEvents).map(([tabid, { cursos, extra }]) => [
      tabid,
      { cursos: cursos, extra },
    ]),
  );
};

const initialExtraEvents = (defvalue) => {
  const coerceExtraEvent = (e) => ({
    ...e,
    start: new Date(e.start),
    end: new Date(e.end),
  });
  return (
    permalinksavedata?.extraEvents?.map(coerceExtraEvent) ||
    getFromStorage("extraEvents")?.map(coerceExtraEvent) ||
    defvalue
  );
};

const initialHorariosOferta = () => {
  return (
    permalinksavedata?.horariosOferta ||
    getFromStorage("horariosOferta") ||
    null
  );
};

const initialCursoColors = () => {
  return (
    permalinksavedata?.coloresCursos || getFromStorage("coloresCursos") || {}
  );
};

const initialCursosIgnorados = () => {
  return (
    permalinksavedata?.cursosIgnorados ||
    getFromStorage("cursosIgnorados") ||
    {}
  );
};
