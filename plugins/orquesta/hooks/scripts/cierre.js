#!/usr/bin/env node
"use strict";
// SubagentStop: an orquesta subagent cannot finish without its report, and a
// builder that reports "done" cannot finish while its quick tests fail
// (testing level 1). Blocking returns the reason to the subagent as its next
// instruction.
//
// Format problems are nudged once (stop_hook_active stops the loop). Failing
// tests are blocked up to MAX_TEST_BLOCKS times per subagent; after that the
// subagent may stop and the reviewer catches the failure.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const c = require("./lib/comun");

const MAX_TEST_BLOCKS = 3;
const TEST_TIMEOUT_MS = 240000;

const REPORTS = {
  scout: { marker: /^##\s*FINDINGS\b/m, name: "## FINDINGS" },
  arquitecto: { marker: /^##\s*ARCHITECT REPORT\b/m, name: "## ARCHITECT REPORT" },
  disenador: { marker: /^##\s*DESIGN REPORT\b/m, name: "## DESIGN REPORT" },
  "builder-frontend": { marker: /^##\s*BUILD REPORT\b/m, name: "## BUILD REPORT" },
  "builder-backend": { marker: /^##\s*BUILD REPORT\b/m, name: "## BUILD REPORT" },
  reviewer: { marker: /^##\s*REVIEW VERDICT\b/m, name: "## REVIEW VERDICT" },
  "jefe-de-pruebas": { marker: /^##\s*EVALUATION VERDICT\b/m, name: "## EVALUATION VERDICT" },
  tester: { marker: /^##\s*TESTER REPORT\b/m, name: "## TESTER REPORT" },
};

const BUILD_STATUS = /^\s*[-*]?\s*Status:\s*(done|blocked|product-gap|contract-gap|design-gap|scope-gap)\b/im;
const DESIGN_MODE = /^\s*[-*]?\s*Modo:\s*(direcciones|sistema|ajuste)\b/im;
const REVIEW_VERDICT = /^\s*[-*]?\s*Verdict:\s*(PASS|FAIL)\b/m;
const EVAL_VERDICT = /^\s*[-*]?\s*Verdict:\s*(PASA CON OBSERVACIONES|PASA|NO PASA)\b/m;

function section(text, heading) {
  const re = new RegExp("^###\\s*" + heading + "[^\\n]*\\n([\\s\\S]*?)(?=^##|$(?![\\s\\S]))", "m");
  const m = text.match(re);
  return m ? m[1] : null;
}

// Returns the reason a report is incomplete, or null.
function reportProblem(role, text) {
  const key = c.TESTERS.includes(role) ? "tester" : role;
  const spec = REPORTS[key];
  if (!spec) return null;
  if (!spec.marker.test(text)) return `Termina con tu bloque de reporte «${spec.name}» en el formato de tus instrucciones.`;
  if (c.BUILDERS.includes(role)) {
    const m = text.match(BUILD_STATUS);
    if (!m) return "Tu BUILD REPORT necesita una línea «Status: done | blocked | product-gap | contract-gap | design-gap | scope-gap».";
    if (m[1].toLowerCase() === "done") {
      const v = section(text, "Verification");
      if (!v || !/`[^`]+`/.test(v)) return "Dices «done» sin evidencia: añade «### Verification» con cada comando ejecutado entre comillas invertidas y su resultado.";
    }
  }
  if (role === "disenador" && !DESIGN_MODE.test(text)) return "Tu DESIGN REPORT necesita una línea «Modo: direcciones | sistema | ajuste».";
  if (role === "reviewer") {
    if (!REVIEW_VERDICT.test(text)) return "Tu REVIEW VERDICT necesita una línea «Verdict: PASS» o «Verdict: FAIL».";
    const v = section(text, "Verification run");
    if (!v || !/`[^`]+`/.test(v)) return "Añade «### Verification run» con los comandos que ejecutaste tú mismo y sus resultados.";
  }
  if (role === "jefe-de-pruebas") {
    if (!EVAL_VERDICT.test(text)) return "Tu EVALUATION VERDICT necesita «Verdict: PASA», «Verdict: PASA CON OBSERVACIONES» o «Verdict: NO PASA».";
    if (!section(text, "Regression")) return "Añade «### Regression» con el resultado de la batería de regresión (o «todavía no hay pruebas de regresión»).";
  }
  return null;
}

function quickTestCommand(root, role) {
  const cmds = c.readJson(path.join(root, "docs", "tecnico", "comandos.json"));
  if (!cmds) return null;
  const quick = cmds.pruebas_rapidas;
  if (typeof quick === "string") return quick;
  if (quick && typeof quick === "object") {
    const side = role === "builder-frontend" ? "frontend" : "backend";
    return quick[side] || quick.todas || null;
  }
  return null;
}

function counterFile(input) {
  const id = String(input.agent_id || input.session_id || "x").replace(/[^A-Za-z0-9_-]/g, "");
  return path.join(os.tmpdir(), `orquesta-cierre-${id}.json`);
}

function bumpCounter(input) {
  const file = counterFile(input);
  let n = 0;
  try {
    n = JSON.parse(fs.readFileSync(file, "utf8")).n || 0;
  } catch (err) {
    // first time
  }
  n += 1;
  try {
    fs.writeFileSync(file, JSON.stringify({ n }));
  } catch (err) {
    // best effort
  }
  return n;
}

function tail(text, lines, chars) {
  const t = String(text || "").trim().split("\n").slice(-lines).join("\n");
  return t.length > chars ? t.slice(-chars) : t;
}

function decide(input) {
  const role = c.roleOf(input.agent_type);
  if (!role || role === "orquestador" || role === "archivista") return null;
  const text = String(input.last_assistant_message || "");

  const problem = reportProblem(role, text);
  if (problem) return input.stop_hook_active ? null : problem;

  if (c.BUILDERS.includes(role)) {
    const m = text.match(BUILD_STATUS);
    if (!m || m[1].toLowerCase() !== "done") return null;
    const root = c.projectRoot(input);
    const command = quickTestCommand(root, role);
    if (!command) return null;
    const run = spawnSync(command, { cwd: root, shell: true, encoding: "utf8", timeout: TEST_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });
    if (run.status === 0) return null;
    if (bumpCounter(input) > MAX_TEST_BLOCKS) return null;
    const why = run.error ? String(run.error.message) : `salió con código ${run.status}`;
    return [
      `Nivel 1 de pruebas: dijiste «done», pero las pruebas rápidas fallan (\`${command}\` ${why}).`,
      "Corrígelo y vuelve a entregar tu BUILD REPORT. Si el fallo no es de tu paquete, cambia a «Status: blocked» y explica por qué.",
      "",
      "Últimas líneas de la salida:",
      "```",
      tail((run.stdout || "") + "\n" + (run.stderr || ""), 60, 4000),
      "```",
    ].join("\n");
  }
  return null;
}

if (require.main === module) {
  c.readInput().then((input) => {
    if (!input) return c.allow();
    let reason = null;
    try {
      reason = decide(input);
    } catch (err) {
      return c.allow();
    }
    return reason ? c.emit({ decision: "block", reason }) : c.allow();
  });
}

module.exports = { decide, reportProblem };
