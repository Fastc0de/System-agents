#!/usr/bin/env node
"use strict";
// PostToolUse on Write/Edit: when a .flow.json or .visual.json is saved,
// validate it and regenerate its views (.md / .excalidraw, plus the flow
// INDEX.md). Errors go back to Claude so it fixes the source right away.

const path = require("path");
const c = require("./lib/comun");
const flujos = require("../../skills/producto/scripts/lib/flujos");
const visuales = require("../../skills/producto/scripts/lib/visuales");

function handle(input) {
  const args = input.tool_input || {};
  const file = args.file_path;
  if (typeof file !== "string") return null;
  const isFlow = file.endsWith(".flow.json");
  const isVisual = file.endsWith(".visual.json");
  if (!isFlow && !isVisual) return null;
  const abs = path.resolve(c.projectRoot(input), file);

  const result = isFlow ? flujos.generate(abs) : visuales.generateVisual(abs);
  const index = isFlow ? flujos.writeIndex(path.dirname(abs)) : { problems: [], written: [] };
  const root = c.projectRoot(input);
  const show = (p) => c.relPath(p, root) || p;
  const name = path.basename(abs);

  if (result.errors.length || index.problems.length) {
    const lines = [`${name} tiene problemas; corrígelos en el archivo fuente (las vistas se regeneran solas):`];
    result.errors.forEach((e) => lines.push("- " + e));
    index.problems.forEach((p) => lines.push("- " + p));
    return { decision: "block", reason: lines.join("\n") };
  }
  const lines = [];
  const written = [...result.written, ...index.written].map(show);
  lines.push(written.length ? `Vistas regeneradas: ${written.join(", ")}.` : `${name} es válido; las vistas ya estaban al día.`);
  if (result.warnings.length) {
    lines.push("Detalles por completar (obligatorios antes de aprobar):");
    result.warnings.forEach((w) => lines.push("- " + w));
  }
  return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "[orquesta] " + lines.join("\n") } };
}

if (require.main === module) {
  c.readInput().then((input) => {
    try {
      const out = input && handle(input);
      return out ? c.emit(out) : c.allow();
    } catch (err) {
      return c.allow();
    }
  });
}

module.exports = { handle };
