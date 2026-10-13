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
const tokens = require(path.join(PLUGIN, "skills", "diseno", "scripts", "lib", "tokens"));
const comun = require(path.join(PLUGIN, "hooks", "scripts", "lib", "comun"));

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
  for (const rel of ["skills/producto/references/plantillas.md", "skills/tecnico/references/stack-de-la-casa.md", "skills/diseno/references/plantillas.md"]) {
    for (const b of blocks(rel, "json")) assert.doesNotThrow(() => JSON.parse(b), rel);
  }
});

test("the tokens example in the design templates is clean, and so is the house baseline", () => {
  const [example] = blocks("skills/diseno/references/plantillas.md", "json").map((b) => JSON.parse(b));
  assert.deepEqual(tokens.validate(example), { errors: [], warnings: [] });
  const guide = fs.readFileSync(path.join(PLUGIN, "skills", "diseno", "references", "estetica-de-la-casa.md"), "utf8");
  const rows = [...guide.matchAll(/^\| `([a-z_]+)` \| `(#[0-9A-F]{6})` \| `(#[0-9A-F]{6})` \|/gm)];
  assert.equal(rows.length, tokens.ROLES.length);
  const claro = Object.fromEntries(rows.map((r) => [r[1], r[2]]));
  const oscuro = Object.fromEntries(rows.map((r) => [r[1], r[3]]));
  assert.deepEqual(example.color.claro, claro, "the template uses the house baseline");
  assert.deepEqual(example.color.oscuro, oscuro, "the template uses the house baseline");
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
    assert.ok(comun.ROLES.includes(name), `${name} is a role the hooks know`);
    if (/^- "Agent"$/m.test(text)) delegators.push(name);
  }
  assert.equal(names.length, 13);
  assert.deepEqual(delegators.sort(), ["jefe-de-pruebas", "orquestador"]);
});
