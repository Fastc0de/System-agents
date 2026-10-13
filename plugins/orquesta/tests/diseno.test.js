"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const PLUGIN = path.join(__dirname, "..");
const tokens = require(path.join(PLUGIN, "skills", "diseno", "scripts", "lib", "tokens"));
const CLI = path.join(PLUGIN, "skills", "diseno", "scripts", "tokens.js");
const GOOD = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "tokens.json"), "utf8"));

const clone = () => JSON.parse(JSON.stringify(GOOD));

test("contrast follows the WCAG formula", () => {
  assert.equal(tokens.contrast("#000000", "#FFFFFF").toFixed(2), "21.00");
  assert.equal(tokens.contrast("#FFFFFF", "#FFFFFF").toFixed(2), "1.00");
  assert.equal(tokens.contrast("#777", "#FFF").toFixed(2), tokens.contrast("#777777", "#ffffff").toFixed(2));
});

test("the fixture is a clean system", () => {
  assert.deepEqual(tokens.validate(GOOD), { errors: [], warnings: [] });
});

test("missing roles, bad colors and low contrast are errors, in every mode", () => {
  const t = clone();
  delete t.color.claro.foco;
  t.color.claro.borde = "beige";
  t.color.oscuro.acento_texto = "#FFFFFF";
  const { errors } = tokens.validate(t);
  assert.ok(errors.some((e) => /faltan los roles foco/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /color\.claro\.borde: «beige»/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /modo oscuro: acento_texto sobre acento/.test(e)), errors.join("\n"));
});

test("typefaces: Anthropic's are rejected, generic ones only warned", () => {
  const t = clone();
  t.tipografia.titulos.familia = "Tiempos Headline";
  t.tipografia.texto.familia = "Inter";
  const { errors, warnings } = tokens.validate(t);
  assert.ok(errors.some((e) => /comercial de Anthropic/.test(e)));
  assert.ok(warnings.some((w) => /«Inter» es una tipografía genérica/.test(w)));
});

test("house warnings: pure white page, pure black text, small base, slow motion, no signature", () => {
  const t = clone();
  t.color.claro.fondo = "#FFFFFF";
  t.color.claro.texto = "#000000";
  t.tipografia.escala.base = 14;
  t.movimiento.normal = 600;
  delete t.firma;
  const { errors, warnings } = tokens.validate(t);
  assert.deepEqual(errors, []);
  for (const re of [/blanco puro/, /negro puro/, /14 px/, /600 ms/, /firma/]) assert.ok(warnings.some((w) => re.test(w)), re.source);
});

test("the shape of every section is checked", () => {
  const { errors } = tokens.validate({ nombre: "", version: 0, color: { sepia: {} }, tipografia: {}, espacio: [8, 4], radio: { md: "10px" }, movimiento: {} });
  for (const re of [/nombre/, /version/, /color\.claro/, /sepia/, /titulos\.familia/, /escala/, /de menor a mayor/, /radio/, /movimiento/]) assert.ok(errors.some((e) => re.test(e)), re.source);
  assert.deepEqual(tokens.validate(null).errors, ["tokens.json debe ser un objeto JSON."]);
});

test("tokens.css has variables, dark mode and the Tailwind theme", () => {
  const css = tokens.css(GOOD);
  assert.match(css, /^\/\* Generado desde tokens\.json/);
  assert.match(css, /:root \{\n  --fondo: #FAF9F5;/);
  assert.match(css, /--superficie-alt: #F0EEE6;/);
  assert.match(css, /--fuente-titulos: "Source Serif 4", Georgia, serif;/);
  assert.match(css, /--tam-base: 1rem;/);
  assert.match(css, /--tam-2xl: 1\.5rem;/);
  assert.match(css, /--espacio-4: 16px;/);
  assert.match(css, /--radio-pastilla: 999px;/);
  assert.match(css, /--duracion-normal: 200ms;/);
  assert.match(css, /--ancho-contenido: 1120px;/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n  :root:not\(\[data-tema="claro"\]\) \{\n    --fondo: #21201E;/);
  assert.match(css, /:root\[data-tema="oscuro"\] \{/);
  assert.match(css, /@theme inline \{[\s\S]*--color-texto-suave: var\(--texto-suave\);[\s\S]*--font-titulos: var\(--fuente-titulos\);[\s\S]*--radius-md: var\(--radio-md\);[\s\S]*--ease-curva: var\(--curva\);/);
  const light = clone();
  delete light.color.oscuro;
  assert.doesNotMatch(tokens.css(light), /prefers-color-scheme/);
});

test("generate writes tokens.css only when valid and only when it changes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orquesta-diseno-"));
  const file = path.join(dir, "tokens.json");
  fs.writeFileSync(file, JSON.stringify(GOOD));
  assert.equal(tokens.generate(file).written.length, 1);
  assert.equal(tokens.generate(file).written.length, 0);
  fs.writeFileSync(file, "{ no json");
  assert.match(tokens.generate(file).errors[0], /no es JSON válido/);
});

test("the CLI exits 0 on a valid project and 1 on errors", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orquesta-diseno-"));
  fs.mkdirSync(path.join(root, "docs", "diseno"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "diseno", "tokens.json"), JSON.stringify(GOOD));
  const ok = spawnSync(process.execPath, [CLI, "generar", root], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stdout);
  assert.ok(fs.existsSync(path.join(root, "docs", "diseno", "tokens.css")));
  const bad = { ...GOOD, tipografia: { ...GOOD.tipografia, titulos: { familia: "Styrene A" } } };
  fs.writeFileSync(path.join(root, "docs", "diseno", "tokens.json"), JSON.stringify(bad));
  const ko = spawnSync(process.execPath, [CLI, "validar", root], { encoding: "utf8" });
  assert.equal(ko.status, 1);
  assert.match(JSON.parse(ko.stdout).errors[0], /Styrene/);
  assert.equal(spawnSync(process.execPath, [CLI, "otra"], { encoding: "utf8" }).status, 1);
});
