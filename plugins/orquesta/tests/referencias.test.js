"use strict";
// The examples in the reference guides are what agents copy: keep them valid.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const PLUGIN = path.join(__dirname, "..");
const flujos = require(path.join(PLUGIN, "skills", "producto", "scripts", "lib", "flujos"));
const visuales = require(path.join(PLUGIN, "skills", "producto", "scripts", "lib", "visuales"));
const registro = require(path.join(PLUGIN, "skills", "pruebas", "scripts", "lib", "registro"));

function blocks(rel, lang) {
  const text = fs.readFileSync(path.join(PLUGIN, rel), "utf8");
  return [...text.matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)```", "g"))].map((m) => m[1]);
}

test("flow and visual examples in formatos.md validate", () => {
  const json = blocks("skills/producto/references/formatos.md", "json").map((b) => JSON.parse(b));
  const flows = json.filter((j) => j.pasos);
  const visuals = json.filter((j) => j.tipo);
  assert.ok(flows.length >= 1 && visuals.length >= 3);
  for (const f of flows) assert.deepEqual(flujos.validate(flujos.normalize(f)).errors, []);
  for (const v of visuals) assert.deepEqual(visuales.validateVisual(v), [], v.tipo);
});

test("every JSON example in the references parses", () => {
  for (const rel of ["skills/producto/references/plantillas.md", "skills/tecnico/references/stack-de-la-casa.md"]) {
    for (const b of blocks(rel, "json")) assert.doesNotThrow(() => JSON.parse(b), rel);
  }
});

test("the ledger example in the testing templates parses cleanly", () => {
  const md = blocks("skills/pruebas/references/plantillas.md", "markdown").find((b) => b.includes("## FALLO-"));
  const { entries, malformed } = registro.parse(md);
  assert.deepEqual(malformed, []);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].estado, "verificado");
  assert.ok(entries[0].esperado && entries[0].paso && entries[0].reproducir && entries[0].detectado && entries[0].prueba);
});

test("agent definitions name only known roles and keep the team flat", () => {
  const dir = path.join(PLUGIN, "agents");
  const names = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const delegators = [];
  for (const f of names) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const name = (text.match(/^name:\s*(\S+)/m) || [])[1];
    assert.equal(name + ".md", f);
    if (/^- "Agent"$/m.test(text)) delegators.push(name);
  }
  assert.equal(names.length, 12);
  assert.deepEqual(delegators.sort(), ["jefe-de-pruebas", "orquestador"]);
});
