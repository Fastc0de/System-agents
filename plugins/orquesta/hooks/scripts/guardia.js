#!/usr/bin/env node
"use strict";
// PreToolUse guard: each role writes only in its own zone, runs only the
// commands its job needs and delegates only to the agents it coordinates.
//
// Acts only on our agents (identified by agent_type). Every other call is
// allowed untouched. Exit 0 = allow. Exit 2 = block, with the reason on
// stderr, which Claude receives. An unexpected error allows the call, so a
// broken guard never blocks work.
//
// The archivista rules are a port of the project-memory archiver guard.

const fs = require("fs");
const path = require("path");
const c = require("./lib/comun");

const DIAGRAMS_SCRIPT = path.join(c.PLUGIN_ROOT, "skills", "producto", "scripts", "diagramas.js");
const LEDGER_SCRIPT = path.join(c.PLUGIN_ROOT, "skills", "pruebas", "scripts", "registro.js");
const ARCHIVE_SCRIPT = path.join(c.PLUGIN_ROOT, "skills", "memoria", "scripts", "archive.js");

const ORCHESTRATOR_DELEGATES = ["scout", "arquitecto", "builder-frontend", "builder-backend", "reviewer", "jefe-de-pruebas", "archivista"];

// Bulky or generated files the orchestrator should never pull into the
// conversation; the scout reads and summarizes them instead.
const BULKY = [
  /(^|\/)(node_modules|\.git|dist|build|out|\.next|\.nuxt|\.svelte-kit|coverage|\.turbo|\.cache|vendor|target|__pycache__|\.venv|venv)\//,
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|Cargo\.lock|poetry\.lock|composer\.lock|Gemfile\.lock)$/,
  /\.(log|min\.js|min\.css|map)$/,
];
const READ_SIZE_LIMIT = 60 * 1024;
const READ_LINE_LIMIT = 400;

function samePath(a, b) {
  const real = (p) => {
    try {
      return fs.realpathSync(p);
    } catch (err) {
      return path.resolve(p);
    }
  };
  const x = real(a).replace(/\\/g, "/");
  const y = real(b).replace(/\\/g, "/");
  return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y;
}

// ---------------------------------------------------------------- writes

function writeZones(role, root) {
  switch (role) {
    case "orquestador":
      return { allow: [c.ZONES.producto, c.ZONES.plan], text: "docs/producto/** y el estado del tablero en docs/tecnico/trabajo/PLAN.md" };
    case "arquitecto":
      return { allow: [c.ZONES.tecnico], text: "docs/tecnico/**" };
    case "jefe-de-pruebas":
      return { allow: [c.ZONES.pruebas, ...c.QA_TEST_DIRS], text: "docs/pruebas/** y tests/aceptacion|e2e|regresion/**" };
    case "archivista":
      return { allow: [c.ZONES.memoria], text: "docs/project-memory/**" };
    default:
      if (c.TESTERS.includes(role)) return { allow: [c.ZONES.evidencias, ...c.QA_TEST_DIRS], text: "tests/aceptacion|e2e|regresion/** y docs/pruebas/evidencias/**" };
      return null;
  }
}

function builderZoneCheck(role, rel, root) {
  if (c.BUILDER_PROTECTED.some((p) => c.under(rel, p))) {
    return `un builder no escribe en ${rel}: las capas de producto, técnica, pruebas y memoria, las pruebas de aceptación/e2e/regresión y .claude/ tienen dueño. Si hace falta un cambio ahí, detente y repórtalo en tu BUILD REPORT.`;
  }
  const zonas = c.readJson(path.join(root, "docs", "tecnico", "zonas.json"));
  if (zonas && typeof zonas === "object") {
    const side = role === "builder-frontend" ? "frontend" : "backend";
    const mine = [].concat(zonas[side] || [], zonas.compartido || []);
    if (mine.length && !c.matchesAny(rel, mine)) {
      return `${rel} está fuera de la zona ${side} definida en docs/tecnico/zonas.json (${mine.join(", ")}). Si tu paquete necesita tocarlo, detente con Status: scope-gap.`;
    }
  }
  return null;
}

function checkWrite(role, input, root) {
  const tool = input.tool_name;
  const args = input.tool_input || {};
  const target = args.file_path || args.notebook_path;
  if (typeof target !== "string") return "falta la ruta del archivo.";
  if (role === "scout" || role === "reviewer") return `el ${role} no escribe archivos; reporta lo que encuentres.`;

  const rel = c.relPath(target, root);
  if (rel === null) {
    if ((c.BUILDERS.includes(role) || c.TESTERS.includes(role)) && c.inTmp(target)) return null;
    return "solo se escribe dentro del proyecto.";
  }

  if (c.BUILDERS.includes(role)) {
    const reason = builderZoneCheck(role, rel, root);
    if (reason) return reason;
  } else {
    const zones = writeZones(role, root);
    if (!zones || !zones.allow.some((z) => c.under(rel, z))) {
      return `el rol ${role} solo escribe en ${zones ? zones.text : "ningún archivo"}; ${rel} está fuera.`;
    }
    if (c.TESTERS.includes(role) && c.under(rel, c.ZONES.regresion)) {
      const exists = fs.existsSync(path.join(root, rel));
      if (tool !== "Write" || exists) return "las pruebas de regresión existentes solo las cambia o retira el jefe de pruebas; crea una prueba nueva o repórtalo.";
    }
  }

  if (role !== "jefe-de-pruebas" && c.isTestFile(rel)) {
    const content = [args.content, args.new_string, ...(Array.isArray(args.edits) ? args.edits.map((e) => e && e.new_string) : [])].filter((x) => typeof x === "string").join("\n");
    if (c.SKIP_MARKERS.test(content)) {
      return "no se saltan ni se aíslan pruebas (.skip, .only, xit, @pytest.mark.skip…). Una prueba se arregla o se reporta; solo el jefe de pruebas puede retirarla.";
    }
  }
  return null;
}

// ---------------------------------------------------------------- reads

function checkRead(role, input, root) {
  const args = input.tool_input || {};
  const file = args.file_path;
  if (typeof file !== "string") return null;
  if (!c.BUILDERS.includes(role) && c.isSecretFile(file)) return "no se leen archivos de secretos (.env, .env.*, *.pem, *.key).";
  if (role !== "orquestador") return null;

  const rel = c.relPath(file, root) || c.toPosix(file);
  if (BULKY.some((re) => re.test(rel))) {
    return `${rel} es un archivo generado o voluminoso. Lee con propósito: pide al scout un resumen de lo que necesitas saber.`;
  }
  let size = 0;
  try {
    size = fs.statSync(path.resolve(root, file)).size;
  } catch (err) {
    return null;
  }
  const limit = Number(args.limit) || 0;
  if (size > READ_SIZE_LIMIT && (!limit || limit > READ_LINE_LIMIT)) {
    return `${rel} pesa ${Math.round(size / 1024)} KB. Lee solo la parte que necesitas (offset y limit de hasta ${READ_LINE_LIMIT} líneas) o pide al scout que lo resuma.`;
  }
  return null;
}

// ---------------------------------------------------------------- bash

const GIT_READ = ["status", "diff", "log", "show", "ls-files", "blame", "rev-parse", "grep", "describe", "shortlog", "cat-file"];
const WRITES_OR_RUNS = /^(--output(=.*)?|--ext-diff|--no-index|--exec-path(=.*)?|--config-env(=.*)?)$/;
const PRINTS_CONTENT = /^(-p|-u|-c|-W|--patch|--patch-with-stat|--patch-with-raw|--cc|--binary|--function-context|--remerge-diff|--diff-merges(=.*)?|--unified(=.*)?|--word-diff(=.*)?|--color-words(=.*)?|-U\d*|-L.*)$/;
const DIFF_SUMMARY = /^(--stat(=.*)?|--shortstat|--numstat|--name-only|--name-status|--summary|--compact-summary|--dirstat(=.*)?|--raw|--quiet)$/;

function shortCluster(token, letters) {
  if (!/^-[A-Za-z]+$/.test(token) || /^-[SG]/.test(token)) return false;
  return token
    .slice(1)
    .split("")
    .some((ch) => letters.includes(ch));
}

function splitFlags(tokens, start) {
  const rest = tokens.slice(start);
  const end = rest.indexOf("--");
  return end === -1 ? rest : rest.slice(0, end);
}

// Read-only git that lists changes without printing file contents
// (the archivista's allowlist).
function checkGitSummary(tokens) {
  let i = 1;
  if (tokens[i] === "-C") i += 2;
  const sub = tokens[i];
  if (!["status", "diff", "log", "ls-files"].includes(sub)) return "solo se permiten `git status`, `git diff`, `git log` y `git ls-files`.";
  const flags = splitFlags(tokens, i + 1);
  if (flags.some((t) => WRITES_OR_RUNS.test(t))) return "no se permiten opciones de git que escriben archivos, ejecutan programas o leen fuera del repositorio.";
  if (sub === "status") {
    if (flags.some((t) => t === "--verbose" || shortCluster(t, "v"))) return "`git status -v` imprime contenido; usa `git status` o `git status --short`.";
    return null;
  }
  if (sub === "ls-files") return null;
  if (flags.some((t) => PRINTS_CONTENT.test(t) || shortCluster(t, "pucW"))) return "no se permiten opciones de git que imprimen contenido (-p, --patch, -U, --word-diff, -L…). Usa --stat o --name-status y luego lee los archivos que necesites.";
  if (sub === "diff" && !flags.some((t) => DIFF_SUMMARY.test(t))) return "`git diff` debe usar un formato resumido: --stat, --name-status, --name-only, --numstat o --shortstat.";
  return null;
}

function scriptCall(tokens, script, allowedArgs) {
  if (tokens.length < 2 || !samePath(tokens[1], script)) return false;
  return allowedArgs(tokens.slice(2));
}

function checkOrchestratorBash(command) {
  const tokens = c.tokenize(command);
  if (!tokens || !tokens.length) return "el orquestador ejecuta un solo comando simple por vez: sin tuberías, redirecciones ni encadenamientos.";
  const program = tokens[0].toLowerCase();
  if (program === "node" || program === "node.exe") {
    if (scriptCall(tokens, DIAGRAMS_SCRIPT, (a) => ["validar", "generar", "todo"].includes(a[0]))) return null;
    if (scriptCall(tokens, LEDGER_SCRIPT, (a) => ["resumen", "siguiente", "validar"].includes(a[0]))) return null;
    return "el orquestador solo ejecuta los scripts de diagramas y del registro de fallos del plugin.";
  }
  if (program !== "git") return "el orquestador no ejecuta programas: delega construir, probar o explorar a su equipo. Solo puede usar git y los scripts de diagramas y registro.";
  let i = 1;
  if (tokens[i] === "-C") i += 2;
  const sub = tokens[i];
  const flags = splitFlags(tokens, i + 1);
  switch (sub) {
    case "status":
    case "ls-files":
    case "rev-parse":
      return null;
    case "log":
    case "show":
    case "diff": {
      if (flags.some((t) => WRITES_OR_RUNS.test(t))) return "esa opción de git no está permitida.";
      if (flags.some((t) => PRINTS_CONTENT.test(t) || shortCluster(t, "pucW"))) return "lee con propósito: usa --stat o --name-status; los cambios línea a línea los revisa el reviewer.";
      if ((sub === "diff" || sub === "show") && !flags.some((t) => DIFF_SUMMARY.test(t))) return `\`git ${sub}\` debe usar --stat, --name-status, --name-only o --shortstat; los cambios línea a línea los revisa el reviewer.`;
      return null;
    }
    case "branch":
      if (flags.some((t) => /^-(d|D|m|M|c|C|f)$/.test(t) || /^--(delete|move|copy|force|set-upstream-to|unset-upstream)/.test(t))) return "solo se listan o crean ramas.";
      return null;
    case "switch":
      if (flags.some((t) => t === "--discard-changes" || t === "-f" || t === "--force")) return "no se descartan cambios al cambiar de rama.";
      return null;
    case "checkout":
      if (!flags.includes("-b")) return "usa `git switch <rama>` o `git checkout -b <rama>`; checkout de archivos descartaría cambios.";
      return null;
    case "add":
      return null;
    case "commit":
      if (flags.some((t) => t === "--amend" || t.startsWith("--fixup") || t.startsWith("--squash") || t === "--no-verify" || t === "-n")) return "un commit nuevo por paquete aprobado: sin --amend, --fixup ni --no-verify.";
      return null;
    case "push":
      if (flags.some((t) => /^(-f|--force.*|--delete|-d|--mirror|--prune)$/.test(t) || t.startsWith("+"))) return "solo push normal, nunca forzado ni borrando ramas. Publica solo cuando la persona lo pida.";
      return null;
    case "remote":
      if (flags.length && !["-v", "show", "get-url"].includes(flags[0])) return "solo se consultan los remotos.";
      return null;
    default:
      return `\`git ${sub || ""}\` no está permitido al orquestador.`;
  }
}

function checkArchivistBash(command) {
  const tokens = c.tokenize(command);
  if (!tokens || !tokens.length) return "solo un comando simple por vez: sin tuberías, redirecciones, encadenamientos ni sustituciones (y sin barras invertidas fuera de comillas).";
  const program = tokens[0].toLowerCase();
  if (program === "git") return checkGitSummary(tokens);
  if (program === "node" || program === "node.exe") {
    const usage = 'el único script permitido es el de archivo: node "<skill dir>/scripts/archive.js" "<project root>" [--dry-run].';
    if (tokens.length < 3 || !samePath(tokens[1], ARCHIVE_SCRIPT)) return usage;
    const rest = tokens.slice(2);
    const roots = rest.filter((t) => !t.startsWith("-"));
    const flags = rest.filter((t) => t.startsWith("-"));
    if (roots.length !== 1 || flags.some((f) => f !== "--dry-run")) return usage;
    return null;
  }
  return "solo se permiten `git status`, `git diff --stat`, `git log`, `git ls-files` y el script de archivo de la memoria.";
}

function checkWorkerBash(role, command, root) {
  for (const { sub, args } of c.gitSubcommands(command)) {
    if (sub === "stash" && (!args.length || args[0] === "list" || args[0] === "show")) continue;
    if (!GIT_READ.includes(sub)) return `\`git ${sub}\` no está permitido: solo el orquestador hace commits y maneja ramas. Usa git solo para consultar.`;
  }
  if (!c.BUILDERS.includes(role) && c.ADDS_PACKAGE.test(command)) {
    return "añadir dependencias cambia la app; si falta una herramienta, repórtalo (BLOCKED) para que el orquestador cree un paquete.";
  }
  const zones = c.BUILDERS.includes(role) ? null : writeZones(role, root);
  for (const target of c.writeTargets(command)) {
    const rel = c.relPath(target, root);
    if (rel === null) {
      if (c.inTmp(path.resolve(root, target))) continue;
      return `el comando escribiría fuera del proyecto (${target}).`;
    }
    if (c.BUILDERS.includes(role)) {
      const reason = builderZoneCheck(role, rel, root);
      if (reason) return reason;
    } else if (!zones || !zones.allow.some((z) => c.under(rel, z))) {
      return `el comando escribiría en ${rel}, fuera de tu zona (${zones ? zones.text : "este rol no escribe archivos"}).`;
    } else if (c.TESTERS.includes(role) && c.under(rel, c.ZONES.regresion) && fs.existsSync(path.join(root, rel))) {
      return "las pruebas de regresión existentes solo las cambia o retira el jefe de pruebas.";
    }
  }
  return null;
}

// ---------------------------------------------------------------- agents

function delegateName(subagentType) {
  if (typeof subagentType !== "string") return null;
  const parts = subagentType.split(":");
  if (parts.length > 1 && parts[parts.length - 2] !== c.PLUGIN) return null;
  return parts[parts.length - 1];
}

function checkAgent(role, input) {
  const target = delegateName((input.tool_input || {}).subagent_type);
  if (role === "orquestador") {
    if (ORCHESTRATOR_DELEGATES.includes(target)) return null;
    if (c.TESTERS.includes(target)) return "los testers trabajan bajo el jefe de pruebas: delega la evaluación en orquesta:jefe-de-pruebas.";
    return `el orquestador delega solo en su equipo: ${ORCHESTRATOR_DELEGATES.map((n) => "orquesta:" + n).join(", ")}.`;
  }
  if (role === "jefe-de-pruebas") {
    if (c.TESTERS.includes(target)) return null;
    return `el jefe de pruebas solo lanza testers: ${c.TESTERS.map((n) => "orquesta:" + n).join(", ")}.`;
  }
  return "este rol no delega: termina tu tarea y entrega tu reporte.";
}

// ---------------------------------------------------------------- decision

function decide(input) {
  const role = c.roleOf(input.agent_type);
  if (!role) return null;
  const tool = input.tool_name;
  const root = c.projectRoot(input);

  if (tool === "Write" || tool === "Edit" || tool === "MultiEdit" || tool === "NotebookEdit") return checkWrite(role, input, root);
  if (tool === "Read") return checkRead(role, input, root);
  if (tool === "Grep" && role === "archivista") return "el archivista no busca contenido: usa Glob o `git ls-files` y lee los archivos que necesites.";
  if (tool === "Agent" || tool === "Task") return checkAgent(role, input);
  if (tool === "Bash") {
    const command = (input.tool_input || {}).command;
    if (typeof command !== "string") return "falta el comando.";
    if (role === "orquestador") return checkOrchestratorBash(command);
    if (role === "archivista") return checkArchivistBash(command);
    if (role === "scout" || role === "arquitecto") return `el ${role} no ejecuta comandos.`;
    return checkWorkerBash(role, command, root);
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
    return reason ? c.deny(reason) : c.allow();
  });
}

module.exports = { decide };
