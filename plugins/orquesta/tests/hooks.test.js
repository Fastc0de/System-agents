"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

delete process.env.CLAUDE_PROJECT_DIR;

const PLUGIN = path.join(__dirname, "..");
const HOOKS = path.join(PLUGIN, "hooks", "scripts");
const guardia = require(path.join(HOOKS, "guardia"));
const contexto = require(path.join(HOOKS, "contexto"));
const cierre = require(path.join(HOOKS, "cierre"));
const recordatorio = require(path.join(HOOKS, "recordatorio"));
const diagramasHook = require(path.join(HOOKS, "diagramas"));
const inicio = require(path.join(HOOKS, "inicio"));
const registro = require(path.join(PLUGIN, "skills", "pruebas", "scripts", "lib", "registro"));

function project(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orquesta-proj-"));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
  return root;
}

const W = (root, agent, file, extra = {}) => guardia.decide({ agent_type: agent, tool_name: "Write", cwd: root, tool_input: { file_path: path.join(root, file), content: "x", ...extra } });
const B = (root, agent, command) => guardia.decide({ agent_type: agent, tool_name: "Bash", cwd: root, tool_input: { command } });
const R = (root, agent, file, extra = {}) => guardia.decide({ agent_type: agent, tool_name: "Read", cwd: root, tool_input: { file_path: path.join(root, file), ...extra } });
const A = (agent, target) => guardia.decide({ agent_type: agent, tool_name: "Agent", cwd: "/", tool_input: { subagent_type: target, prompt: "x" } });

// ---------------------------------------------------------------- guard

test("guard ignores other agents and the plain main thread", () => {
  const root = project();
  assert.equal(W(root, undefined, "src/a.js"), null);
  assert.equal(W(root, "general-purpose", "src/a.js"), null);
  assert.equal(W(root, "otro-plugin:builder-frontend", "docs/producto/x.md"), null);
});

test("each role writes only in its zone", () => {
  const root = project();
  assert.equal(W(root, "orquesta:orquestador", "docs/producto/1-idea.md"), null);
  assert.equal(W(root, "orquestador", "docs/tecnico/trabajo/PLAN.md"), null);
  assert.match(W(root, "orquesta:orquestador", "src/app.js"), /solo escribe en docs\/producto/);
  assert.match(W(root, "orquesta:orquestador", "docs/tecnico/contrato-api.md"), /fuera/);
  assert.equal(W(root, "orquesta:arquitecto", "docs/tecnico/contrato-api.md"), null);
  assert.match(W(root, "orquesta:arquitecto", "docs/producto/1-idea.md"), /fuera/);
  assert.match(W(root, "orquesta:scout", "notas.md"), /no escribe/);
  assert.match(W(root, "orquesta:reviewer", "src/a.js"), /no escribe/);
  assert.equal(W(root, "orquesta:archivista", "docs/project-memory/status.md"), null);
  assert.match(W(root, "orquesta:archivista", "README.md"), /docs\/project-memory/);
  assert.equal(W(root, "orquesta:jefe-de-pruebas", "docs/pruebas/registro-de-fallos.md"), null);
  assert.equal(W(root, "orquesta:tester-recorridos", "tests/e2e/login.spec.ts"), null);
  assert.equal(W(root, "orquesta:tester-limites", "docs/pruebas/evidencias/cap.png"), null);
  assert.match(W(root, "orquesta:tester-servidor", "src/server/api.ts"), /fuera/);
  assert.match(W(root, "orquesta:tester-servidor", "docs/pruebas/registro-de-fallos.md"), /fuera/);
});

test("builders cannot touch other layers, QA tests or files outside their zone", () => {
  const root = project({ "docs/tecnico/zonas.json": { frontend: ["src/app/**", "src/components/**"], backend: ["src/server/**", "prisma/**"], compartido: ["package.json", "src/lib/**"] } });
  assert.equal(W(root, "orquesta:builder-frontend", "src/components/Boton.tsx"), null);
  assert.equal(W(root, "orquesta:builder-frontend", "package.json"), null);
  assert.match(W(root, "orquesta:builder-frontend", "src/server/sesion.ts"), /zona frontend/);
  assert.equal(W(root, "orquesta:builder-backend", "src/server/sesion.ts"), null);
  assert.match(W(root, "orquesta:builder-backend", "tests/regresion/FALLO-001.spec.ts"), /no escribe/);
  assert.match(W(root, "orquesta:builder-backend", "docs/tecnico/contrato-api.md"), /no escribe/);
  assert.match(W(root, "orquesta:builder-backend", ".claude/settings.json"), /no escribe/);
  assert.equal(W(root, "orquesta:builder-backend", path.relative(root, path.join(os.tmpdir(), "x.txt"))), null);
});

test("nobody but the test lead skips or focuses tests", () => {
  const root = project();
  const skip = { content: "test.skip('a', () => {})" };
  assert.match(W(root, "orquesta:builder-backend", "src/server/a.test.ts", skip), /no se saltan/);
  assert.match(W(root, "orquesta:tester-servidor", "tests/aceptacion/a.spec.ts", skip), /no se saltan/);
  assert.equal(W(root, "orquesta:jefe-de-pruebas", "tests/aceptacion/a.spec.ts", skip), null);
  assert.equal(W(root, "orquesta:builder-backend", "src/server/a.test.ts", { content: "test('a', () => {})" }), null);
});

test("testers add regression tests but never change existing ones", () => {
  const root = project({ "tests/regresion/FALLO-001.spec.ts": "test('x', () => {})" });
  assert.equal(W(root, "orquesta:tester-limites", "tests/regresion/FALLO-002.spec.ts"), null);
  assert.match(W(root, "orquesta:tester-limites", "tests/regresion/FALLO-001.spec.ts"), /jefe de pruebas/);
  const edit = guardia.decide({ agent_type: "orquesta:tester-limites", tool_name: "Edit", cwd: root, tool_input: { file_path: path.join(root, "tests/regresion/FALLO-001.spec.ts"), old_string: "x", new_string: "y" } });
  assert.match(edit, /jefe de pruebas/);
  assert.match(B(root, "orquesta:tester-limites", "rm tests/regresion/FALLO-001.spec.ts"), /jefe de pruebas/);
  assert.equal(W(root, "orquesta:jefe-de-pruebas", "tests/regresion/FALLO-001.spec.ts"), null);
});

test("the orchestrator reads with purpose", () => {
  const big = "x".repeat(70 * 1024);
  const root = project({ "src/grande.js": big, "src/chico.js": "ok", "package-lock.json": "{}", ".env": "SECRET=1" });
  assert.equal(R(root, "orquesta:orquestador", "src/chico.js"), null);
  assert.match(R(root, "orquesta:orquestador", "src/grande.js"), /offset y limit/);
  assert.equal(R(root, "orquesta:orquestador", "src/grande.js", { offset: 1, limit: 200 }), null);
  assert.match(R(root, "orquesta:orquestador", "package-lock.json"), /scout/);
  assert.match(R(root, "orquesta:orquestador", "node_modules/x/index.js"), /scout/);
  assert.match(R(root, "orquesta:orquestador", ".env"), /secretos/);
  assert.match(R(root, "orquesta:reviewer", ".env"), /secretos/);
  assert.equal(R(root, "orquesta:builder-backend", ".env"), null);
  assert.equal(R(root, "orquesta:reviewer", "src/grande.js"), null);
});

test("orchestrator bash: git with care and the plugin scripts only", () => {
  const root = project();
  const diagrams = path.join(PLUGIN, "skills", "producto", "scripts", "diagramas.js");
  for (const ok of ["git status", "git log --oneline -5", "git diff --stat", "git add -A", 'git commit -m "WP-001: esqueleto"', "git switch -c fase-1", "git push", `node "${diagrams}" todo .`]) {
    assert.equal(B(root, "orquesta:orquestador", ok), null, ok);
  }
  for (const bad of ["git diff", "git log -p", "git push --force", "git commit --amend", "git reset --hard", "npm test", "cat src/a.js", "git status && rm -rf src", "node otro.js"]) {
    assert.ok(B(root, "orquesta:orquestador", bad), bad);
  }
});

test("worker bash: read-only git, no package additions for reviewers and testers, no writes outside zone", () => {
  const root = project();
  assert.equal(B(root, "orquesta:builder-backend", "npm test && git status"), null);
  assert.equal(B(root, "orquesta:builder-backend", "npm install zod"), null);
  assert.match(B(root, "orquesta:builder-backend", "git commit -m x"), /orquestador hace commits/);
  assert.match(B(root, "orquesta:builder-frontend", "echo hola > docs/producto/1-idea.md"), /no escribe/);
  assert.equal(B(root, "orquesta:reviewer", "npm test 2>&1 | tail -40"), null);
  assert.match(B(root, "orquesta:reviewer", "npm install lodash"), /dependencias/);
  assert.match(B(root, "orquesta:reviewer", "sed -i s/a/b/ src/a.js"), /fuera de tu zona/);
  assert.equal(B(root, "orquesta:tester-recorridos", "npx playwright test -c tests/e2e > /tmp/salida.txt"), null);
  assert.match(B(root, "orquesta:tester-recorridos", "echo x > src/app.js"), /fuera de tu zona/);
  assert.match(B(root, "orquesta:scout", "ls"), /no ejecuta/);
});

test("archivista keeps the original archiver limits", () => {
  const root = project();
  const archive = path.join(PLUGIN, "skills", "memoria", "scripts", "archive.js");
  assert.equal(B(root, "orquesta:archivista", "git status"), null);
  assert.equal(B(root, "orquesta:archivista", "git diff --stat"), null);
  assert.equal(B(root, "orquesta:archivista", `node "${archive}" "${root}" --dry-run`), null);
  assert.match(B(root, "orquesta:archivista", "git diff"), /resumido/);
  assert.match(B(root, "orquesta:archivista", "git log -p"), /imprimen contenido/);
  assert.match(B(root, "orquesta:archivista", "git status | cat"), /un comando simple/);
  assert.match(B(root, "orquesta:archivista", "npm test"), /solo se permiten/);
  assert.match(guardia.decide({ agent_type: "orquesta:archivista", tool_name: "Grep", cwd: root, tool_input: { pattern: "x" } }), /no busca/);
  assert.match(R(root, "orquesta:archivista", "secrets/server.key"), /secretos/);
});

test("delegation: orchestrator to its team, test lead to testers, nobody else", () => {
  for (const t of ["orquesta:scout", "orquesta:arquitecto", "orquesta:builder-frontend", "orquesta:builder-backend", "orquesta:reviewer", "orquesta:jefe-de-pruebas", "orquesta:archivista"]) {
    assert.equal(A("orquesta:orquestador", t), null, t);
  }
  assert.match(A("orquesta:orquestador", "general-purpose"), /solo en su equipo/);
  assert.match(A("orquesta:orquestador", "orquesta:tester-recorridos"), /jefe de pruebas/);
  assert.equal(A("orquesta:jefe-de-pruebas", "orquesta:tester-experiencia"), null);
  assert.match(A("orquesta:jefe-de-pruebas", "orquesta:builder-backend"), /solo lanza testers/);
  assert.match(A("orquesta:builder-backend", "orquesta:scout"), /no delega/);
});

test("guard script blocks with exit 2 and allows with exit 0", () => {
  const root = project();
  const run = (input) => spawnSync(process.execPath, [path.join(HOOKS, "guardia.js")], { input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: "" } });
  const blocked = run({ agent_type: "orquesta:orquestador", tool_name: "Write", cwd: root, tool_input: { file_path: path.join(root, "src/a.js"), content: "x" } });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /orquesta:/);
  assert.equal(run({ agent_type: "orquesta:orquestador", tool_name: "Write", cwd: root, tool_input: { file_path: path.join(root, "docs/producto/x.md"), content: "x" } }).status, 0);
  const garbage = spawnSync(process.execPath, [path.join(HOOKS, "guardia.js")], { input: "no json", encoding: "utf8" });
  assert.equal(garbage.status, 0);
});

// ---------------------------------------------------------------- context

const LEDGER = `# Registro de fallos

## FALLO-001 · FUN-02 Reservar una cita · mayor · verificado

Qué se esperaba: solo una persona consigue la hora.
Qué pasó: las dos recibieron confirmación.
Cómo reproducirlo: dos navegadores a la vez.

- Detectado: 2026-10-20 · fase 1 · tester de casos límite
- Prueba: \`tests/regresion/FALLO-001-doble-reserva.spec.ts\`

## FALLO-002 · FUN-02 Reservar una cita · menor · abierto

Qué se esperaba: el nombre del servicio se ve entero.
Qué pasó: se corta en móviles pequeños.
Cómo reproducirlo: pantalla de 320 px.

- Detectado: 2026-10-20 · fase 1 · tester de experiencia
- Prueba: \`tests/regresion/FALLO-002-nombre-cortado.spec.ts\`
`;

test("context injection carries memory, product, technical and failures by role", () => {
  const root = project({
    "docs/project-memory/overview.md": "# Project Overview\n\n## Identity\n- Name: Barbería Navaja",
    "docs/project-memory/status.md": "# Project Status\n\n## Phase\nbuilding",
    "docs/project-memory/decisions.md": "# Project Decisions\n\n## PM-ADR-0001: Stack de la casa\n\n- Status: accepted\n- Date: 2026-10-13\n- Scope: todo\n\n### Context\nx\n\n### Decision\nNext.js + SQLite.\n\n## PM-ADR-0002: Viejo\n\n- Status: superseded\n- Date: 2026-10-01\n\n### Decision\nOtra cosa.\n",
    "docs/producto/estado.json": { proyecto: "Barbería Navaja", etapa: 5, modo: "por-fases", fase_actual: 1 },
    "docs/producto/2-funcionalidades.md": "| FUN-02 | Reservar una cita |",
    "docs/producto/3-logica/F01-iniciar-sesion.flow.json": fs.readFileSync(path.join(__dirname, "fixtures", "F01-iniciar-sesion.flow.json"), "utf8"),
    "docs/tecnico/comandos.json": { pruebas_rapidas: { frontend: "npm run test:web", backend: "npm run test:api" } },
    "docs/tecnico/zonas.json": { frontend: ["src/app/**"], backend: ["src/server/**"], compartido: ["package.json"] },
    "docs/tecnico/contrato-api.md": "# Contrato\n\n## Sesiones\n\n### POST /api/sesiones\n",
    "docs/pruebas/registro-de-fallos.md": LEDGER,
  });
  const builder = contexto.build("builder-backend", root);
  assert.match(builder, /<project-context/);
  assert.match(builder, /Barbería Navaja/);
  assert.match(builder, /PM-ADR-0001: Stack de la casa: Next\.js \+ SQLite\./);
  assert.doesNotMatch(builder, /PM-ADR-0002/);
  assert.match(builder, /F01 · Iniciar sesión · FUN-03 · aprobado/);
  assert.match(builder, /Tu zona \(backend\): src\/server\/\*\*/);
  assert.match(builder, /### POST \/api\/sesiones/);
  assert.match(builder, /FALLO-002/);
  assert.match(builder, /Zonas frágiles/);
  assert.match(builder, /BUILD REPORT/);
  const scout = contexto.build("scout", root);
  assert.doesNotMatch(scout, /Contrato frontend/);
  assert.doesNotMatch(scout, /Registro de fallos/);
  assert.match(contexto.build("tester-recorridos", root), /TESTER REPORT/);
  assert.match(contexto.build("scout", project()), /todavía no tiene memoria/);
});

// ---------------------------------------------------------------- stop gates

const BUILD_DONE = "## BUILD REPORT\n- WP: WP-004\n- Status: done\n### Verification\n- `npm test` → 12 passed\n";

test("reports are required, once", () => {
  assert.match(cierre.reportProblem("builder-frontend", "listo"), /BUILD REPORT/);
  assert.match(cierre.reportProblem("builder-frontend", "## BUILD REPORT\n- Status: done\n"), /sin evidencia/);
  assert.equal(cierre.reportProblem("builder-frontend", "## BUILD REPORT\n- Status: product-gap\n"), null);
  assert.equal(cierre.reportProblem("builder-frontend", BUILD_DONE), null);
  assert.match(cierre.reportProblem("reviewer", "## REVIEW VERDICT\n- Verdict: PASS\n"), /Verification run/);
  assert.equal(cierre.reportProblem("reviewer", "## REVIEW VERDICT\n- Verdict: FAIL\n### Verification run\n- `npm test` → 2 failed\n"), null);
  assert.match(cierre.reportProblem("jefe-de-pruebas", "## EVALUATION VERDICT\n- Verdict: PASA\n"), /Regression/);
  assert.equal(cierre.reportProblem("jefe-de-pruebas", "## EVALUATION VERDICT\n- Verdict: NO PASA\n### Regression\n- 3/3\n"), null);
  assert.match(cierre.reportProblem("tester-limites", "hecho"), /TESTER REPORT/);
  const nudge = cierre.decide({ agent_type: "orquesta:scout", last_assistant_message: "hecho", stop_hook_active: false, cwd: "/" });
  assert.match(nudge, /FINDINGS/);
  assert.equal(cierre.decide({ agent_type: "orquesta:scout", last_assistant_message: "hecho", stop_hook_active: true, cwd: "/" }), null);
  assert.equal(cierre.decide({ agent_type: "orquesta:archivista", last_assistant_message: "x", cwd: "/" }), null);
});

test("a builder that says done cannot stop while its quick tests fail", () => {
  const failing = project({ "docs/tecnico/comandos.json": { pruebas_rapidas: { backend: "node -e \"console.log('1 failed'); process.exit(1)\"" } } });
  const input = { agent_type: "orquesta:builder-backend", agent_id: "t-" + Date.now(), last_assistant_message: BUILD_DONE, stop_hook_active: true, cwd: failing };
  const first = cierre.decide(input);
  assert.match(first, /Nivel 1/);
  assert.match(first, /1 failed/);
  cierre.decide(input);
  cierre.decide(input);
  assert.equal(cierre.decide(input), null, "gives up after three blocks so it never loops forever");

  const passing = project({ "docs/tecnico/comandos.json": { pruebas_rapidas: "node -e \"process.exit(0)\"" } });
  assert.equal(cierre.decide({ ...input, agent_id: "p-" + Date.now(), cwd: passing }), null);
  const blocked = BUILD_DONE.replace("Status: done", "Status: blocked");
  assert.equal(cierre.decide({ ...input, agent_id: "b-" + Date.now(), last_assistant_message: blocked }), null);
});

// ---------------------------------------------------------------- reminders

test("reminders point the orchestrator to the next gate and count FAILs", () => {
  const session = "s-" + Date.now();
  const base = { agent_type: "orquesta:orquestador", session_id: session, tool_name: "Agent" };
  const r = (target, response, prompt = "WP-007") => recordatorio.reminder({ ...base, tool_input: { subagent_type: target, prompt }, tool_response: response });
  assert.match(r("orquesta:builder-frontend", BUILD_DONE), /reviewer/);
  assert.match(r("orquesta:builder-frontend", "## BUILD REPORT\n- Status: product-gap"), /lenguaje simple/);
  assert.match(r("orquesta:reviewer", "## REVIEW VERDICT\n- Verdict: PASS"), /git commit -m "WP-007/);
  assert.match(r("orquesta:reviewer", "Verdict: FAIL"), /FAIL n\.º 1/);
  assert.match(r("orquesta:reviewer", "Verdict: FAIL"), /límite de 2/);
  assert.match(r("orquesta:jefe-de-pruebas", { content: [{ type: "text", text: "Verdict: NO PASA" }] }), /corrección/);
  assert.match(r("orquesta:jefe-de-pruebas", "Verdict: PASA CON OBSERVACIONES"), /memoria/);
  assert.match(r("orquesta:arquitecto", "## ARCHITECT REPORT"), /cobertura/);
  assert.equal(recordatorio.reminder({ ...base, agent_id: "sub", agent_type: "orquesta:jefe-de-pruebas", tool_input: { subagent_type: "orquesta:tester-limites" } }), null);
});

// ---------------------------------------------------------------- render on save, session start, ledger

test("saving a flow regenerates its views or returns the errors", () => {
  const root = project({ "docs/producto/3-logica/F01-iniciar-sesion.flow.json": fs.readFileSync(path.join(__dirname, "fixtures", "F01-iniciar-sesion.flow.json"), "utf8") });
  const file = path.join(root, "docs/producto/3-logica/F01-iniciar-sesion.flow.json");
  const ok = diagramasHook.handle({ cwd: root, tool_input: { file_path: file } });
  assert.match(ok.hookSpecificOutput.additionalContext, /Vistas regeneradas/);
  assert.ok(fs.existsSync(path.join(root, "docs/producto/3-logica/F01-iniciar-sesion.excalidraw")));
  assert.ok(fs.existsSync(path.join(root, "docs/producto/3-logica/INDEX.md")));
  fs.writeFileSync(file, JSON.stringify({ id: "F01", titulo: "x", pasos: [] }));
  const bad = diagramasHook.handle({ cwd: root, tool_input: { file_path: file } });
  assert.equal(bad.decision, "block");
  assert.match(bad.reason, /no tiene pasos/);
  assert.equal(diagramasHook.handle({ cwd: root, tool_input: { file_path: path.join(root, "src/a.js") } }), null);
});

test("session start summarizes memory, stages, board and failures", () => {
  const root = project({
    ".git/HEAD": "ref: refs/heads/main",
    "docs/project-memory/status.md": "# Project Status\n\n## Phase\nbuilding",
    "docs/producto/estado.json": { proyecto: "Barbería Navaja", etapa: 5, etapas: { 1: "aprobada", 2: "aprobada" }, modo: "por-fases", fase_actual: 1 },
    "docs/tecnico/trabajo/PLAN.md": "# Plan\n\n| WP | Título | Especialidad | Fase | Estado |\n| --- | --- | --- | --- | --- |\n| WP-001 | Esqueleto | backend | 1 | hecho |\n| WP-002 | Login | frontend | 1 | pendiente |\n",
    "docs/pruebas/registro-de-fallos.md": LEDGER,
  });
  const text = inicio.run({ cwd: path.join(root) });
  assert.match(text, /<project-memory-status>/);
  assert.match(text, /etapa actual 5 \(implementación\)/);
  assert.match(text, /fase 1: 1 hecho, 1 pendiente/);
  assert.match(text, /FALLO-002 abierto/);
  assert.equal(inicio.run({ cwd: project({ ".git/HEAD": "x" }) }), null);
});

test("ledger parses, validates and summarizes", () => {
  const root = project({ "docs/pruebas/registro-de-fallos.md": LEDGER, "tests/regresion/FALLO-001-doble-reserva.spec.ts": "x" });
  const s = registro.summary(root);
  assert.equal(s.total, 2);
  assert.deepEqual(s.pendientes.map((p) => p.id), ["FALLO-002"]);
  assert.equal(s.zonasFragiles[0].fallos, 2);
  assert.equal(registro.nextId(root), "FALLO-003");
  const v = registro.validate(root);
  assert.equal(v.problems.length, 1);
  assert.match(v.problems[0], /FALLO-002.*no existe/);
  const broken = project({ "docs/pruebas/registro-de-fallos.md": "## FALLO-9 sin formato\n" });
  assert.match(registro.validate(broken).problems[0], /formato inválido/);
  assert.equal(registro.nextId(project()), "FALLO-001");
});
