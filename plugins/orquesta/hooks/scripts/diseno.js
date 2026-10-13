#!/usr/bin/env node
"use strict";
// PostToolUse on Write/Edit: when docs/diseno/tokens.json is saved, validate
// it (structure, contrast, typefaces) and regenerate docs/diseno/tokens.css.
// Errors go back to Claude so it fixes the tokens right away.

const path = require("path");
const c = require("./lib/comun");
const tokens = require("../../skills/diseno/scripts/lib/tokens");

function handle(input) {
  const args = input.tool_input || {};
  const file = args.file_path;
  if (typeof file !== "string") return null;
  const root = c.projectRoot(input);
  const rel = c.relPath(file, root);
  if (rel !== "docs/diseno/tokens.json") return null;

  const result = tokens.generate(path.resolve(root, file));
  if (result.errors.length) {
    const lines = ["docs/diseno/tokens.json tiene problemas; corrígelos (tokens.css se regenera solo cuando el archivo es válido):"];
    result.errors.forEach((e) => lines.push("- " + e));
    return { decision: "block", reason: lines.join("\n") };
  }
  const lines = [result.written.length ? "tokens.json es válido; docs/diseno/tokens.css regenerado." : "tokens.json es válido; tokens.css ya estaba al día."];
  if (result.warnings.length) {
    lines.push("Revisa antes de entregar:");
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
