# [FCE Plan](https://earagon04.github.io/FCE-Plan/)

Organizador de horarios de la Facultad de Ciencias Económicas (UBA).

Fork de [FIUBA-Plan](https://fede.dm/FIUBA-Plan/), adaptado a la oferta de cursos de FCE (`mi.econ.uba.ar/Oferta/`).

Deploy automático a GitHub Pages en cada push a `main`.

---

La app no depende de un backend: cada usuario pega la oferta del cuatrimestre (CTRL+A / CTRL+C / CTRL+V) y arma combinaciones de materias en un calendario semanal.

## Desarrollo

```bash
npm install
npm start
```

La app corre en `localhost:3000/`.

```bash
npm test
```

Corre los tests del parser FCE (`tests/fceparser.test.js`) usando el fixture en `tests/fce-raw/`.
