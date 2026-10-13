#!/usr/bin/env node
"use strict";
// Validates and renders the product-layer diagrams.
//
//   node diagramas.js validar <file|dir>...   check *.flow.json and *.visual.json
//   node diagramas.js generar <file|dir>...   check and write .md / .excalidraw (and INDEX.md per flow dir)
//   node diagramas.js todo [project-root]     generar for everything under docs/producto/
//
// Prints a JSON report. Exit 0 = no errors. Exit 1 = at least one error.

const fs = require("fs");
const path = require("path");
const flujos = require("./lib/flujos");
const visuales = require("./lib/visuales");

function collect(target, out) {
  let stat;
  try {
    stat = fs.statSync(target);
  } catch (err) {
    out.missing.push(target);
    return;
  }
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target).sort()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      collect(path.join(target, entry), out);
    }
  } else if (target.endsWith(".flow.json") || target.endsWith(".visual.json")) {
    out.files.push(target);
  }
}

function run(command, targets) {
  const found = { files: [], missing: [] };
  targets.forEach((t) => collect(path.resolve(t), found));
  const report = { command, results: [], indexes: [], missing: found.missing, errors: 0, warnings: 0 };

  for (const file of found.files) {
    let result;
    if (command === "validar") {
      if (file.endsWith(".flow.json")) {
        const { flow, parseError } = flujos.loadFlow(file);
        result = parseError ? { file, errors: [parseError], warnings: [] } : { file, id: flow.id, ...flujos.validate(flow) };
      } else {
        let v = null;
        let parseError = null;
        try {
          v = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
        } catch (err) {
          parseError = "JSON inválido: " + err.message;
        }
        result = { file, errors: parseError ? [parseError] : visuales.validateVisual(v), warnings: [] };
      }
    } else {
      result = file.endsWith(".flow.json") ? flujos.generate(file) : visuales.generateVisual(file);
    }
    report.errors += result.errors.length;
    report.warnings += result.warnings.length;
    report.results.push(result);
  }

  if (command !== "validar") {
    const dirs = [...new Set(found.files.filter((f) => f.endsWith(".flow.json")).map((f) => path.dirname(f)))];
    for (const dir of dirs) {
      const idx = flujos.writeIndex(dir);
      report.errors += idx.problems.length;
      report.indexes.push(idx);
    }
  }
  return report;
}

function main(argv) {
  const [command, ...rest] = argv.slice(2);
  if (!["validar", "generar", "todo"].includes(command)) {
    process.stdout.write(JSON.stringify({ error: "usage: node diagramas.js validar|generar <file|dir>... | todo [project-root]" }) + "\n");
    return 1;
  }
  let targets = rest;
  let effective = command;
  if (command === "todo") {
    targets = [path.join(path.resolve(rest[0] || process.cwd()), "docs", "producto")];
    effective = "generar";
  }
  if (!targets.length) {
    process.stdout.write(JSON.stringify({ error: "no files or directories given" }) + "\n");
    return 1;
  }
  const report = run(effective, targets);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  return report.errors || report.missing.length ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { run };
