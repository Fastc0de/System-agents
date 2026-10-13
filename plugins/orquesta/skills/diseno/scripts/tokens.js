#!/usr/bin/env node
"use strict";
// Validates design tokens and generates tokens.css.
//
//   node tokens.js validar <tokens.json|project-root>   check structure, contrast and typefaces
//   node tokens.js generar <tokens.json|project-root>   check and write tokens.css next to tokens.json
//
// Prints a JSON report. Exit 0 = no errors. Exit 1 = at least one error.

const fs = require("fs");
const path = require("path");
const tokens = require("./lib/tokens");

function locate(target) {
  const abs = path.resolve(target || ".");
  try {
    if (fs.statSync(abs).isDirectory()) return path.join(abs, "docs", "diseno", "tokens.json");
  } catch (err) {
    return abs;
  }
  return abs;
}

function main(argv) {
  const [command, target] = argv.slice(2);
  if (!["validar", "generar"].includes(command)) {
    process.stdout.write(JSON.stringify({ error: "usage: node tokens.js validar|generar <tokens.json|project-root>" }) + "\n");
    return 1;
  }
  const file = locate(target);
  if (!fs.existsSync(file)) {
    process.stdout.write(JSON.stringify({ command, file, errors: [`No existe ${file}.`], warnings: [] }, null, 2) + "\n");
    return 1;
  }
  let result;
  if (command === "generar") result = tokens.generate(file);
  else {
    try {
      result = tokens.validate(JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, "")));
    } catch (err) {
      result = { errors: [`JSON inválido: ${err.message}`], warnings: [] };
    }
  }
  process.stdout.write(JSON.stringify({ command, file, ...result }, null, 2) + "\n");
  return result.errors.length ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { main };
