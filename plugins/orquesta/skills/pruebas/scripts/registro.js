#!/usr/bin/env node
"use strict";
// Failure ledger tool.
//
//   node registro.js resumen   [project-root]   counts, pending failures, fragile areas
//   node registro.js siguiente [project-root]   next free id (FALLO-013)
//   node registro.js validar   [project-root]   format and test-file checks
//
// Prints JSON. Exit 0 = ok. Exit 1 = validation problems or bad usage.

const path = require("path");
const registro = require("./lib/registro");

function main(argv) {
  const [command, rootArg] = argv.slice(2);
  const root = path.resolve(rootArg || process.cwd());
  let out;
  let code = 0;
  if (command === "resumen") out = registro.summary(root);
  else if (command === "siguiente") out = { siguiente: registro.nextId(root) };
  else if (command === "validar") {
    out = registro.validate(root);
    code = out.problems.length ? 1 : 0;
  } else {
    out = { error: "usage: node registro.js resumen|siguiente|validar [project-root]" };
    code = 1;
  }
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  return code;
}

process.exit(main(process.argv));
