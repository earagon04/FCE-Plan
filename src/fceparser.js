const DIA_CODES = {
  Lu: 1,
  Ma: 2,
  Mi: 3,
  Ju: 4,
  Vi: 5,
  Sa: 6,
};

const SEDES = new Set([
  "Cordoba",
  "Córdoba",
  "Paternal",
  "Pilar",
  "Avellaneda",
  "San Isidro",
  "Virtual",
]);

const AREAS = new Set([
  "ADMINISTRACION",
  "CONTABILIDAD",
  "DERECHO",
  "ECONOMIA",
  "HUMANIDADES",
  "MATEMATICA",
  "SISTEMAS",
  "TRIBUTACION",
]);

const MATERIA_RE = /^(.+?)\s*\((\d{2,4})\)\s*$/;
const CURSO_RE = /^(\d+)\t/;
const HORARIO_BASE_RE = /^(\d{1,2})a(\d{1,2})/;
const HORARIO_OVERRIDE_RE = /([A-Za-z]{2})(\d{1,2})a(\d{1,2})/g;

function padTime(n) {
  return String(Number(n)).padStart(2, "0") + ":00";
}

function parseDias(diasStr) {
  if (!diasStr || !diasStr.trim()) return [];
  return diasStr
    .split("\\")
    .map((d) => d.trim())
    .filter((d) => DIA_CODES[d] != null)
    .map((d) => ({ code: d, dia: DIA_CODES[d] }));
}

function parseHorario(horarioStr) {
  const trimmed = (horarioStr || "").trim();
  const baseMatch = trimmed.match(HORARIO_BASE_RE);
  if (!baseMatch) return null;

  const base = {
    inicio: padTime(baseMatch[1]),
    fin: padTime(baseMatch[2]),
  };

  const overrides = {};
  let m;
  HORARIO_OVERRIDE_RE.lastIndex = 0;
  while ((m = HORARIO_OVERRIDE_RE.exec(trimmed)) !== null) {
    const code = m[1];
    if (DIA_CODES[code] == null) continue;
    overrides[code] = {
      inicio: padTime(m[2]),
      fin: padTime(m[3]),
    };
  }

  return { base, overrides };
}

function buildClases(diasStr, horarioStr, modalidad, diaVirtualStr) {
  const dias = parseDias(diasStr);
  const horario = parseHorario(horarioStr);
  if (!horario || dias.length === 0) return [];

  const virtualCode = (diaVirtualStr || "").trim();
  const allVirtual = modalidad === "V";

  return dias.map(({ code, dia }) => {
    const slot = horario.overrides[code] || horario.base;
    return {
      dia,
      inicio: slot.inicio,
      fin: slot.fin,
      virtual: allVirtual || virtualCode === code,
    };
  });
}

function isSede(line) {
  return SEDES.has(line);
}

function isArea(line) {
  return AREAS.has(line.trim());
}

function isHeaderNoise(line) {
  return (
    line.startsWith("Oferta de Cursos") ||
    line.startsWith("En las grillas") ||
    line.startsWith("*ia") ||
    line.startsWith("Curso\t") ||
    line === ""
  );
}

/**
 * Parsea el texto pegado desde https://mi.econ.uba.ar/Oferta/...
 * Retorna un array de períodos (normalmente uno) con materias y cursos.
 */
export function parseFCE(rawdata) {
  const lines = rawdata.split(/\r?\n/);

  let periodoNombre = "";
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("Oferta de Cursos")) {
      periodoNombre = t;
      break;
    }
  }
  if (!periodoNombre) {
    periodoNombre = "Oferta FCE";
  }

  const materias = [];
  const cursos = [];

  let area = "";
  let currentMateria = null;
  let catedra = "";
  let sede = "";
  let lastCurso = null;

  const finalizeMateria = () => {
    if (currentMateria && currentMateria.cursos.length > 0) {
      materias.push(currentMateria);
    }
    currentMateria = null;
    lastCurso = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/^\uFEFF/, "");
    const trimmed = line.trim();

    if (isHeaderNoise(trimmed) && !MATERIA_RE.test(trimmed)) {
      continue;
    }

    if (trimmed.startsWith("Obs.")) {
      const obs = trimmed;
      if (lastCurso) {
        lastCurso.obs = lastCurso.obs ? `${lastCurso.obs} ${obs}` : obs;
      } else if (currentMateria) {
        currentMateria.obs = currentMateria.obs
          ? `${currentMateria.obs} ${obs}`
          : obs;
      }
      continue;
    }

    if (trimmed.startsWith("Cát:")) {
      catedra = trimmed.replace(/^Cát:\s*/, "").trim();
      if (catedra.startsWith("Prof")) {
        catedra = catedra.replace(/^Prof\s*/, "").trim();
      }
      continue;
    }

    if (isSede(trimmed)) {
      sede = trimmed === "Córdoba" ? "Cordoba" : trimmed;
      continue;
    }

    if (isArea(trimmed)) {
      area = trimmed;
      continue;
    }

    const materiaMatch = trimmed.match(MATERIA_RE);
    if (materiaMatch && !CURSO_RE.test(line)) {
      finalizeMateria();
      currentMateria = {
        nombre: materiaMatch[1].trim(),
        codigo: materiaMatch[2],
        area,
        cursos: [],
      };
      catedra = "";
      sede = "";
      lastCurso = null;
      continue;
    }

    if (CURSO_RE.test(line) && currentMateria) {
      const parts = line.split("\t");
      if (parts.length < 5) continue;

      const nroCurso = parts[0].trim();
      const dias = parts[1] || "";
      const horario = parts[2] || "";
      const profesor = (parts[3] || "").trim();
      const modalidad = (parts[4] || "").trim();
      const diaVirtual = (parts[5] || "").trim();
      const iaFlag = (parts[6] || "").trim();

      const clases = buildClases(dias, horario, modalidad, diaVirtual);
      if (clases.length === 0) continue;

      // El nro de curso puede repetirse entre cátedras de la misma materia
      let codigo = `${currentMateria.codigo}-${nroCurso}`;
      const existing = new Set(cursos.map((c) => c.codigo));
      if (existing.has(codigo)) {
        let i = 2;
        while (existing.has(`${codigo}-${i}`)) {
          i += 1;
        }
        codigo = `${codigo}-${i}`;
      }

      const curso = {
        materia: currentMateria.codigo,
        codigo,
        nro: nroCurso,
        docentes: profesor,
        catedra,
        sede,
        modalidad,
        ia: iaFlag.includes("ia"),
        clases,
      };

      cursos.push(curso);
      currentMateria.cursos.push(codigo);
      lastCurso = curso;
    }
  }

  finalizeMateria();

  if (materias.length === 0) {
    return [];
  }

  return [
    {
      periodo: periodoNombre,
      materias,
      cursos,
      timestamp: Date.now(),
    },
  ];
}
