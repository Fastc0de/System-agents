"use strict";
// Shared helpers for the orquesta hooks.

const fs = require("fs");
const os = require("os");
const path = require("path");

const PLUGIN = "orquesta";
const PLUGIN_ROOT = path.resolve(__dirname, "..", "..", "..");

const ROLES = [
  "orquestador",
  "scout",
  "arquitecto",
  "builder-frontend",
  "builder-backend",
  "reviewer",
  "jefe-de-pruebas",
  "tester-recorridos",
  "tester-servidor",
  "tester-limites",
  "tester-experiencia",
  "archivista",
];
const TESTERS = ["tester-recorridos", "tester-servidor", "tester-limites", "tester-experiencia"];
const BUILDERS = ["builder-frontend", "builder-backend"];

const ZONES = {
  producto: "docs/producto/",
  tecnico: "docs/tecnico/",
  pruebas: "docs/pruebas/",
  memoria: "docs/project-memory/",
  plan: "docs/tecnico/trabajo/PLAN.md",
  evidencias: "docs/pruebas/evidencias/",
  aceptacion: "tests/aceptacion/",
  e2e: "tests/e2e/",
  regresion: "tests/regresion/",
};
const QA_TEST_DIRS = [ZONES.aceptacion, ZONES.e2e, ZONES.regresion];
// Places a builder must never write: the product, technical, testing and
// memory layers, the independent tests, and tool configuration.
const BUILDER_PROTECTED = [ZONES.producto, ZONES.tecnico, ZONES.pruebas, ZONES.memoria, ...QA_TEST_DIRS, ".claude/", ".git/"];

// Maps an agent_type to one of our roles. Plugin-scoped names must carry our
// prefix; a bare name is accepted because the main-thread agent may arrive
// without it. Anything else is not ours and is left alone.
function roleOf(agentType) {
  if (typeof agentType !== "string" || !agentType) return null;
  const parts = agentType.split(":");
  const name = parts[parts.length - 1];
  if (parts.length > 1 && parts[parts.length - 2] !== PLUGIN) return null;
  return ROLES.includes(name) ? name : null;
}

function readInput() {
  return new Promise((resolve) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });
    process.stdin.on("end", () => {
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch (err) {
        resolve(null);
      }
    });
    process.stdin.on("error", () => resolve(null));
  });
}

function projectRoot(input) {
  const env = process.env.CLAUDE_PROJECT_DIR;
  if (env) return path.resolve(env);
  if (input && typeof input.cwd === "string" && input.cwd) return path.resolve(input.cwd);
  return process.cwd();
}

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

// Project-relative POSIX path, or null when the path is outside the project.
function relPath(file, root) {
  let p = String(file);
  if (process.platform === "win32") p = p.replace(/^\/([a-zA-Z])\//, "$1:/");
  const abs = path.resolve(root, p);
  const rel = toPosix(path.relative(root, abs));
  if (rel === "" || rel.startsWith("../") || rel === ".." || path.isAbsolute(rel)) return null;
  return rel;
}

function inTmp(file) {
  const abs = toPosix(path.resolve(String(file)));
  const tmp = toPosix(fs.realpathSync.native ? safeReal(os.tmpdir()) : os.tmpdir());
  return abs.startsWith(tmp + "/") || abs.startsWith(toPosix(os.tmpdir()) + "/");
}

function safeReal(p) {
  try {
    return fs.realpathSync(p);
  } catch (err) {
    return p;
  }
}

function under(rel, prefix) {
  if (rel === null) return false;
  const a = process.platform === "win32" ? rel.toLowerCase() : rel;
  const b = process.platform === "win32" ? prefix.toLowerCase() : prefix;
  return b.endsWith("/") ? a.startsWith(b) : a === b;
}

// Minimal glob: ** any path, * any segment part, ? one character.
function globToRegex(glob) {
  let re = "";
  const g = toPosix(glob);
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        re += ".*";
        i++;
        if (g[i + 1] === "/") i++;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re + "$");
}

function matchesAny(rel, globs) {
  return (globs || []).some((g) => globToRegex(g).test(rel));
}

function isSecretFile(file) {
  const base = toPosix(String(file)).split("/").pop().toLowerCase();
  if ([".env.example", ".env.sample", ".env.template"].includes(base)) return false;
  return base === ".env" || base.startsWith(".env.") || base.endsWith(".pem") || base.endsWith(".key");
}

// Skipped or focused tests silently shrink a suite.
const SKIP_MARKERS = /\b(?:it|test|describe|context|suite)\.(?:skip|only|todo)\s*\(|\bx(?:it|test|describe)\s*\(|@pytest\.mark\.skip|@unittest\.skip|\bt\.Skip\(|\bpending\s*\(\s*\)/;

function isTestFile(rel) {
  return /(^|\/)(tests?|__tests__|spec|e2e)\//.test(rel) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel) || /(^|\/)test_[^/]*\.py$/.test(rel) || /_test\.(py|go)$/.test(rel);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  } catch (err) {
    return null;
  }
}

function readText(file, max) {
  try {
    let text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim();
    if (max && text.length > max) text = text.slice(0, max) + "\n[…recortado; lee el archivo completo si lo necesitas]";
    return text;
  } catch (err) {
    return null;
  }
}

// Splits one simple command into words. Returns null for anything that is
// not a single plain command: chaining, pipes, redirection, substitution,
// newlines, unbalanced quotes, or a backslash outside quotes.
function tokenize(command) {
  const text = String(command).trim();
  const tokens = [];
  let current = "";
  let started = false;
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n" || ch === "\r" || ch === "`") return null;
    if (quote === "'") {
      if (ch === "'") quote = null;
      else current += ch;
      continue;
    }
    if (ch === "$" && text[i + 1] === "(") return null;
    if (quote === '"') {
      if (ch === '"') quote = null;
      else if (ch === "\\" && (text[i + 1] === '"' || text[i + 1] === "\\")) current += text[++i];
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started) tokens.push(current);
      current = "";
      started = false;
    } else if (";&|<>\\".includes(ch)) {
      return null;
    } else {
      current += ch;
      started = true;
    }
  }
  if (quote) return null;
  if (started) tokens.push(current);
  return tokens;
}

// Splits a shell line into simple command segments (on ; && || | and newlines),
// respecting quotes. Good enough to inspect each command a line would run.
function segments(command) {
  const out = [];
  let cur = "";
  let quote = null;
  const text = String(command);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === "\\" && quote === '"') cur += ch + (text[++i] || "");
      else cur += ch;
      if (!quote) cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (ch === ";" || ch === "\n" || (ch === "&" && text[i + 1] === "&") || ch === "|") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      if ((ch === "&" || ch === "|") && text[i + 1] === ch) i++;
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Loose word split for one segment: strips quotes, keeps redirection markers
// as separate words.
function words(segment) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\d?>>?|<)|([^\s"'<>]+)/g;
  let m;
  while ((m = re.exec(segment))) out.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4]);
  return out;
}

// Files a shell line would create, change or delete, as far as can be told
// from its text: redirections, tee, rm, mv, cp, touch, mkdir, sed -i, truncate.
function writeTargets(command) {
  const targets = [];
  for (const seg of segments(command)) {
    const w = words(seg);
    for (let i = 0; i < w.length; i++) {
      if (/^\d?>>?$/.test(w[i]) && w[i + 1] && !w[i + 1].startsWith("&")) targets.push(w[i + 1]);
    }
    const cmdIndex = w.findIndex((x) => !/^[A-Z_][A-Z0-9_]*=/.test(x) && x !== "sudo" && x !== "env");
    const cmd = cmdIndex >= 0 ? w[cmdIndex].split("/").pop() : "";
    const args = w.slice(cmdIndex + 1).filter((x) => !x.startsWith("-") && !/^\d?>>?$/.test(x));
    if (["rm", "rmdir", "touch", "mkdir", "truncate", "unlink"].includes(cmd)) targets.push(...args);
    if (cmd === "tee") targets.push(...args);
    if (cmd === "mv") targets.push(...args);
    if (cmd === "cp" || cmd === "install" || cmd === "ln") targets.push(...args.slice(-1));
    if (cmd === "sed" && w.slice(cmdIndex + 1).some((x) => /^-i/.test(x) || x === "--in-place")) targets.push(...args.slice(1));
    if (cmd === "git" && ["rm", "mv"].includes(w[cmdIndex + 1])) targets.push(...args.slice(1));
  }
  return targets.filter((t) => t && t !== "/dev/null" && t !== "/dev/stderr" && t !== "/dev/stdout");
}

// git subcommands in a shell line, e.g. ["status", "commit"].
function gitSubcommands(command) {
  const subs = [];
  for (const seg of segments(command)) {
    const w = words(seg);
    for (let i = 0; i < w.length; i++) {
      if (w[i].split("/").pop() !== "git") continue;
      let j = i + 1;
      while (j < w.length && w[j].startsWith("-")) j += w[j] === "-C" || w[j] === "-c" ? 2 : 1;
      if (w[j]) subs.push({ sub: w[j], args: w.slice(j + 1) });
      break;
    }
  }
  return subs;
}

// Commands that add dependencies, which changes the app's manifests.
const ADDS_PACKAGE = /\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\s+(?!-)[^\s]|\b(?:pnpm|yarn|bun)\s+add\b|\bpip3?\s+install\s+(?!-r\b)(?!-e\b)[^\s-]|\bpoetry\s+add\b|\bcargo\s+add\b|\bgo\s+get\b/;

function deny(reason) {
  process.stderr.write("orquesta: " + reason + "\n");
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
  process.exit(0);
}

module.exports = {
  PLUGIN,
  PLUGIN_ROOT,
  ROLES,
  TESTERS,
  BUILDERS,
  ZONES,
  QA_TEST_DIRS,
  BUILDER_PROTECTED,
  roleOf,
  readInput,
  projectRoot,
  relPath,
  toPosix,
  inTmp,
  under,
  globToRegex,
  matchesAny,
  isSecretFile,
  SKIP_MARKERS,
  isTestFile,
  readJson,
  readText,
  tokenize,
  segments,
  words,
  writeTargets,
  gitSubcommands,
  ADDS_PACKAGE,
  deny,
  allow,
  emit,
};
