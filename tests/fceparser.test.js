import path from "node:path";
import fs from "node:fs";
import { parseFCE } from "../src/fceparser";

const raw = fs.readFileSync(
  path.join(path.dirname(__filename), "fce-raw", "oferta-2026-2.txt"),
  "utf8",
);

describe("fce parser", () => {
  const periodos = parseFCE(raw);
  const periodo = periodos[0];

  test("returns one non-empty periodo", () => {
    expect(periodos).toHaveLength(1);
    expect(periodo.periodo).toMatch(/Oferta de Cursos/);
    expect(periodo.materias.length).toBeGreaterThan(0);
    expect(periodo.cursos.length).toBeGreaterThan(0);
    expect(Number.isInteger(periodo.timestamp)).toBeTruthy();
  });

  test("parses expected materia and curso counts from 2026-2 dump", () => {
    expect(periodo.materias.length).toBe(145);
    expect(periodo.cursos.length).toBeGreaterThanOrEqual(1090);
  });

  test("materias have codigo, nombre, area and cursos", () => {
    periodo.materias.forEach((materia) => {
      expect(materia.codigo.length).toBeGreaterThan(0);
      expect(materia.nombre.length).toBeGreaterThan(0);
      expect(materia.area.length).toBeGreaterThan(0);
      expect(materia.cursos.length).toBeGreaterThan(0);
    });
  });

  test("no repeated materia or curso codigos", () => {
    for (const prop of ["materias", "cursos"]) {
      const codigos = periodo[prop].map((m) => m.codigo);
      const hasRepeated = codigos.some((c, i, arr) => arr.indexOf(c) !== i);
      expect(hasRepeated).toBeFalsy();
    }
  });

  test("every materia curso exists in global cursos", () => {
    const global = new Set(periodo.cursos.map((c) => c.codigo));
    periodo.materias.forEach((materia) => {
      materia.cursos.forEach((codigo) => {
        expect(global.has(codigo)).toBeTruthy();
      });
    });
  });

  test("hybrid course marks virtual day", () => {
    const curso = periodo.cursos.find((c) => c.codigo === "252-1");
    expect(curso).toBeDefined();
    expect(curso.sede).toBe("Paternal");
    expect(curso.modalidad).toBe("R");
    expect(curso.clases).toEqual([
      { dia: 1, inicio: "19:00", fin: "21:00", virtual: true },
      { dia: 4, inicio: "19:00", fin: "21:00", virtual: false },
    ]);
  });

  test("split horario applies saturday override", () => {
    const curso = periodo.cursos.find((c) => c.codigo === "252-8");
    expect(curso).toBeDefined();
    expect(curso.clases).toEqual([
      { dia: 3, inicio: "19:00", fin: "21:00", virtual: true },
      { dia: 6, inicio: "11:00", fin: "13:00", virtual: false },
    ]);
  });

  test("fully virtual course", () => {
    const curso = periodo.cursos.find((c) => c.codigo === "252-99");
    expect(curso).toBeDefined();
    expect(curso.sede).toBe("Virtual");
    expect(curso.modalidad).toBe("V");
    expect(curso.clases).toEqual([
      { dia: 4, inicio: "11:00", fin: "13:00", virtual: true },
    ]);
  });

  test("parses ia flag", () => {
    const curso = periodo.cursos.find((c) => c.codigo === "252-22");
    expect(curso?.ia).toBe(true);
  });

  test("every class has weekday 1-6 and HH:MM times", () => {
    periodo.cursos.forEach((curso) => {
      expect(curso.clases.length).toBeGreaterThan(0);
      expect(curso.sede.length).toBeGreaterThan(0);
      expect(["R", "D", "M", "V"]).toContain(curso.modalidad);
      curso.clases.forEach((clase) => {
        expect(clase.dia).toBeGreaterThanOrEqual(1);
        expect(clase.dia).toBeLessThanOrEqual(6);
        expect(clase.inicio).toMatch(/^\d{2}:\d{2}$/);
        expect(clase.fin).toMatch(/^\d{2}:\d{2}$/);
        expect(typeof clase.virtual).toBe("boolean");
      });
    });
  });
});
