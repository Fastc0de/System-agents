"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPTS = path.join(__dirname, "..", "skills", "producto", "scripts");
const flujos = require(path.join(SCRIPTS, "lib", "flujos"));
const visuales = require(path.join(SCRIPTS, "lib", "visuales"));
const FIXTURES = path.join(__dirname, "fixtures");
const LOGIN = JSON.parse(fs.readFileSync(path.join(FIXTURES, "F01-iniciar-sesion.flow.json"), "utf8"));

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orquesta-diagramas-"));
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function problemsOf(raw) {
  return flujos.validate(flujos.normalize(raw));
}

// Checks that every binding in an Excalidraw scene points both ways.
function assertConsistentScene(scene) {
  const byId = new Map(scene.elements.map((e) => [e.id, e]));
  assert.equal(byId.size, scene.elements.length, "element ids are unique");
  for (const el of scene.elements) {
    for (const b of el.boundElements || []) {
      const other = byId.get(b.id);
      assert.ok(other, `${el.id} lists missing bound element ${b.id}`);
      if (b.type === "text") assert.equal(other.containerId, el.id);
      if (b.type === "arrow") {
        const ends = [other.startBinding && other.startBinding.elementId, other.endBinding && other.endBinding.elementId];
        assert.ok(ends.includes(el.id), `arrow ${b.id} is not bound to ${el.id}`);
      }
    }
    if (el.type === "text" && el.containerId) {
      const container = byId.get(el.containerId);
      assert.ok(container, `text ${el.id} has missing container`);
      assert.ok(container.boundElements.some((b) => b.id === el.id));
    }
    if (el.type === "arrow") {
      for (const binding of [el.startBinding, el.endBinding]) {
        if (!binding) continue;
        const target = byId.get(binding.elementId);
        assert.ok(target, `arrow ${el.id} bound to missing ${binding.elementId}`);
        assert.ok(target.boundElements.some((b) => b.id === el.id));
      }
    }
  }
}

test("the login fixture is a valid approved flow", () => {
  const { errors, warnings } = problemsOf(LOGIN);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("structural errors are reported in plain language", () => {
  const raw = clone(LOGIN);
  raw.pasos = raw.pasos.filter((p) => p.tipo !== "inicio");
  raw.transiciones = raw.transiciones.filter((t) => t.de !== "inicio");
  assert.ok(problemsOf(raw).errors.some((e) => e.includes("«inicio»")));

  const unlabeled = clone(LOGIN);
  unlabeled.transiciones.find((t) => t.de === "password_ok" && t.a === "crear_sesion").condicion = "";
  assert.ok(problemsOf(unlabeled).errors.some((e) => e.includes("todas las ramas")));

  const orphan = clone(LOGIN);
  orphan.pasos.push({ id: "huerfano", tipo: "accion", texto: "Nadie llega", actor: "sistema", detalle: "x" });
  orphan.transiciones.push({ de: "huerfano", a: "fin_ok" });
  assert.ok(problemsOf(orphan).errors.some((e) => e.includes("«huerfano»") && e.includes("no se puede llegar")));

  const deadEnd = clone(LOGIN);
  deadEnd.transiciones = deadEnd.transiciones.filter((t) => t.de !== "crear_sesion");
  assert.ok(problemsOf(deadEnd).errors.some((e) => e.includes("«crear_sesion»") && e.includes("no tiene salida")));

  const badActor = clone(LOGIN);
  badActor.pasos[1].actor = "visitante";
  assert.ok(problemsOf(badActor).errors.some((e) => e.includes("«visitante»")));

  const dup = clone(LOGIN);
  dup.pasos.push(clone(dup.pasos[1]));
  assert.ok(problemsOf(dup).errors.some((e) => e.includes("id repetido")));
});

test("approval turns missing detail into errors", () => {
  const raw = clone(LOGIN);
  raw.preguntas_abiertas = ["¿Se puede entrar con Google?"];
  raw.pasos.find((p) => p.id === "buscar_cuenta").detalle = "";
  raw.pasos.splice(4, 0, { id: "banco", tipo: "externo", texto: "Consultar banco", actor: "sistema", detalle: "x" });
  raw.transiciones = raw.transiciones.map((t) => (t.de === "buscar_cuenta" ? { ...t, a: "banco" } : t));
  raw.transiciones.push({ de: "banco", a: "password_ok" });
  const approved = problemsOf(raw);
  assert.ok(approved.errors.some((e) => e.includes("preguntas abiertas")));
  assert.ok(approved.errors.some((e) => e.includes("«buscar_cuenta»") && e.includes("detalle")));
  assert.ok(approved.errors.some((e) => e.includes("«banco»") && e.includes("si falla")));

  raw.estado = "borrador";
  const draft = problemsOf(raw);
  assert.ok(!draft.errors.some((e) => e.includes("detalle") || e.includes("preguntas abiertas")));
  assert.ok(draft.warnings.some((w) => w.includes("«buscar_cuenta»")));
});

test("happy-path-only flows get a warning", () => {
  const raw = {
    id: "F09",
    titulo: "Ver ayuda",
    funcionalidad: "FUN-09",
    resumen: "x",
    disparador: "x",
    pasos: [
      { id: "a", tipo: "inicio", texto: "Abre ayuda" },
      { id: "b", tipo: "pantalla", texto: "Ayuda", detalle: "x", ve: "Texto" },
      { id: "c", tipo: "fin", texto: "Listo", resultado: "exito" },
    ],
    transiciones: [{ de: "a", a: "b" }, { de: "b", a: "c" }],
    criterios: ["Se ve la ayuda"],
  };
  assert.ok(problemsOf(raw).warnings.some((w) => w.includes("camino feliz")));
});

test("generate writes markdown and excalidraw once and is deterministic", () => {
  const dir = tmpdir();
  const file = path.join(dir, "F01-iniciar-sesion.flow.json");
  fs.writeFileSync(file, JSON.stringify(LOGIN));
  const first = flujos.generate(file);
  assert.deepEqual(first.errors, []);
  assert.equal(first.written.length, 2);
  const md = fs.readFileSync(path.join(dir, "F01-iniciar-sesion.md"), "utf8");
  assert.match(md, /```mermaid\nflowchart TD/);
  assert.match(md, /subgraph lane_0\["Cliente"\]/);
  assert.match(md, /linkStyle \d+(,\d+)* stroke:#e03131/);
  assert.match(md, /`F01:crear_sesion`/);
  assert.match(md, /\*\*CA3\.\*\*/);
  const second = flujos.generate(file);
  assert.deepEqual(second.written, [], "unchanged input rewrites nothing");
  const scene = JSON.parse(fs.readFileSync(path.join(dir, "F01-iniciar-sesion.excalidraw"), "utf8"));
  assert.equal(scene.type, "excalidraw");
  assertConsistentScene(scene);
});

test("excalidraw routes do not cross other steps in the fixture", () => {
  const flow = flujos.normalize(LOGIN);
  const L = flujos.layout(flow);
  for (const r of L.routes) {
    for (let i = 0; i < r.points.length - 1; i++) {
      const [x1, y1] = r.points[i];
      const [x2, y2] = r.points[i + 1];
      for (const [id, b] of L.pos) {
        if (id === r.edge.de || id === r.edge.a) continue;
        const horizontal = y1 === y2;
        const hit = horizontal
          ? y1 > b.y && y1 < b.y + b.h && Math.max(x1, x2) > b.x && Math.min(x1, x2) < b.x + b.w
          : x1 > b.x && x1 < b.x + b.w && Math.max(y1, y2) > b.y && Math.min(y1, y2) < b.y + b.h;
        assert.ok(!hit, `${r.edge.de}→${r.edge.a} crosses ${id}`);
      }
    }
  }
});

test("invalid flows still render, with a warning banner", () => {
  const raw = clone(LOGIN);
  raw.transiciones.push({ de: "fin_ok", a: "inicio" });
  const flow = flujos.normalize(raw);
  const problems = flujos.validate(flow);
  assert.ok(problems.errors.length >= 2);
  const md = flujos.renderMarkdown(flow, { problems, sourceName: "x.flow.json" });
  assert.match(md, /Este flujo tiene problemas/);
  const scene = flujos.renderExcalidraw(flow, { problems }).toJSON();
  assert.ok(scene.elements.some((e) => e.id === "problems"));
  assertConsistentScene(scene);
});

test("index cross-checks flow ids and subflow references", () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, "F01-iniciar-sesion.flow.json"), JSON.stringify(LOGIN));
  const dup = clone(LOGIN);
  dup.titulo = "Copia";
  fs.writeFileSync(path.join(dir, "F01-copia.flow.json"), JSON.stringify(dup));
  const withRef = clone(LOGIN);
  withRef.id = "F02";
  withRef.pasos.find((p) => p.id === "crear_sesion").tipo = "subflujo";
  withRef.pasos.find((p) => p.id === "crear_sesion").flujo = "F07";
  fs.writeFileSync(path.join(dir, "F02-con-subflujo.flow.json"), JSON.stringify(withRef));
  const { markdown, problems } = flujos.buildIndex(dir);
  assert.ok(problems.some((p) => p.includes("F01") && p.includes("se repite")));
  assert.ok(problems.some((p) => p.includes("F07")));
  assert.match(markdown, /## Mapa de flujos/);
});

test("visuals validate and render maps, phases and wireframes", () => {
  for (const name of ["funcionalidades.visual.json", "plan-de-fases.visual.json", "boceto-reservar.visual.json"]) {
    const v = JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
    assert.deepEqual(visuales.validateVisual(v), [], name);
    assertConsistentScene(visuales.renderVisual(v).toJSON());
  }
  assert.ok(visuales.validateVisual({ tipo: "boceto", titulo: "x", pantallas: [{ id: "P1", nombre: "a", elementos: [{ tipo: "carrusel" }] }] }).some((e) => e.includes("carrusel")));
  assert.ok(visuales.validateVisual({ tipo: "fases", titulo: "x", fases: [{ nombre: "Fase 1" }] }).some((e) => e.includes("entrega")));
  assert.ok(visuales.validateVisual({ tipo: "otro" }).length >= 2);
});

test("the CLI exits 0 on valid input and 1 on errors", () => {
  const dir = tmpdir();
  for (const name of fs.readdirSync(FIXTURES)) fs.copyFileSync(path.join(FIXTURES, name), path.join(dir, name));
  const ok = spawnSync(process.execPath, [path.join(SCRIPTS, "diagramas.js"), "generar", dir], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stdout);
  const report = JSON.parse(ok.stdout);
  assert.equal(report.errors, 0);
  assert.ok(fs.existsSync(path.join(dir, "INDEX.md")));
  assert.ok(fs.existsSync(path.join(dir, "boceto-reservar.excalidraw")));

  fs.writeFileSync(path.join(dir, "F05-roto.flow.json"), "{ no es json");
  const bad = spawnSync(process.execPath, [path.join(SCRIPTS, "diagramas.js"), "validar", dir], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.ok(JSON.parse(bad.stdout).results.some((r) => r.errors.some((e) => e.includes("JSON inválido"))));
});
