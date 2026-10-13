"use strict";
// Failure ledger: docs/pruebas/registro-de-fallos.md
//
// Every failure is a level-two entry:
//   ## FALLO-012 · FUN-02 Reservar una cita · mayor · verificado
// followed by plain-language fields and a technical section. This module
// parses, validates and summarizes it. It never rewrites entries.

const fs = require("fs");
const path = require("path");

const LEDGER = path.join("docs", "pruebas", "registro-de-fallos.md");
const SEVERITIES = ["bloqueante", "mayor", "menor", "cosmetico"];
const STATES = ["abierto", "en-correccion", "corregido", "verificado", "reincidente", "retirado"];
const PENDING = ["abierto", "en-correccion", "corregido", "reincidente"];
const HEADING = /^## (FALLO-(\d{3,}))\s*·\s*(.+?)\s*·\s*([^·]+?)\s*·\s*([^·]+?)\s*$/;

function fold(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
}

function field(lines, label) {
  const re = new RegExp("^\\s*(?:-\\s*)?" + label + "\\s*:\\s*(.*)$", "i");
  for (const line of lines) {
    const m = line.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

function parse(text) {
  const lines = String(text).replace(/^﻿/, "").split(/\r?\n/);
  const entries = [];
  const malformed = [];
  let current = null;
  let fence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (!fence && /^## (?!#)/.test(line)) {
      const m = line.match(HEADING);
      if (!m) {
        malformed.push(line.trim());
        current = null;
        continue;
      }
      current = {
        id: m[1],
        number: Number(m[2]),
        funcionalidad: m[3].trim(),
        fun: (m[3].match(/FUN-\d{2,}/) || [""])[0],
        severidad: fold(m[4]),
        estado: fold(m[5]),
        lines: [],
      };
      entries.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  for (const e of entries) {
    e.esperado = field(e.lines, "Qu[eé] se esperaba");
    e.paso = field(e.lines, "Qu[eé] pas[oó]");
    e.reproducir = field(e.lines, "C[oó]mo reproducirlo");
    e.detectado = field(e.lines, "Detectado");
    e.prueba = field(e.lines, "Prueba").replace(/`/g, "").trim();
    e.correccion = field(e.lines, "Correcci[oó]n");
    delete e.lines;
  }
  return { entries, malformed };
}

function load(root) {
  const file = path.join(root, LEDGER);
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (err) {
    return { file, exists: false, entries: [], malformed: [] };
  }
  return { file, exists: true, ...parse(text) };
}

function validate(root) {
  const ledger = load(root);
  const problems = ledger.malformed.map((h) => `Encabezado con formato inválido: «${h}». Usa «## FALLO-012 · FUN-02 Nombre · severidad · estado».`);
  const seen = new Set();
  for (const e of ledger.entries) {
    if (seen.has(e.id)) problems.push(`${e.id} está repetido.`);
    seen.add(e.id);
    if (!SEVERITIES.includes(e.severidad)) problems.push(`${e.id}: severidad «${e.severidad}» desconocida; usa ${SEVERITIES.join(", ")}.`);
    if (!STATES.includes(e.estado)) problems.push(`${e.id}: estado «${e.estado}» desconocido; usa ${STATES.join(", ")}.`);
    if (!e.fun) problems.push(`${e.id}: indica la funcionalidad con su id (FUN-02 …).`);
    for (const [key, label] of [["esperado", "Qué se esperaba"], ["paso", "Qué pasó"], ["reproducir", "Cómo reproducirlo"], ["detectado", "Detectado"]]) {
      if (!e[key]) problems.push(`${e.id}: falta «${label}».`);
    }
    if (e.estado !== "retirado") {
      if (!e.prueba) problems.push(`${e.id}: falta «Prueba»: la ruta de la prueba automática que lo demuestra.`);
      else if (!fs.existsSync(path.join(root, e.prueba))) problems.push(`${e.id}: la prueba «${e.prueba}» no existe.`);
    }
    if (e.prueba && e.estado !== "retirado" && !e.prueba.startsWith("tests/regresion/")) {
      problems.push(`${e.id}: la prueba debe vivir en tests/regresion/ para correr en cada evaluación.`);
    }
  }
  return { file: ledger.file, exists: ledger.exists, entries: ledger.entries.length, problems };
}

function summary(root) {
  const ledger = load(root);
  const byState = {};
  const bySeverity = {};
  const perFun = new Map();
  for (const e of ledger.entries) {
    byState[e.estado] = (byState[e.estado] || 0) + 1;
    bySeverity[e.severidad] = (bySeverity[e.severidad] || 0) + 1;
    const key = e.fun || e.funcionalidad;
    if (!perFun.has(key)) perFun.set(key, { funcionalidad: e.funcionalidad, total: 0, reincidente: false });
    const f = perFun.get(key);
    f.total += 1;
    if (e.estado === "reincidente") f.reincidente = true;
  }
  const pendientes = ledger.entries
    .filter((e) => PENDING.includes(e.estado))
    .map((e) => ({ id: e.id, funcionalidad: e.funcionalidad, severidad: e.severidad, estado: e.estado, prueba: e.prueba }));
  const zonasFragiles = [...perFun.values()].filter((f) => f.total >= 2 || f.reincidente).map((f) => ({ funcionalidad: f.funcionalidad, fallos: f.total, reincidente: f.reincidente }));
  return { exists: ledger.exists, total: ledger.entries.length, porEstado: byState, porSeveridad: bySeverity, pendientes, zonasFragiles };
}

function nextId(root) {
  const ledger = load(root);
  const max = ledger.entries.reduce((m, e) => Math.max(m, e.number), 0);
  return "FALLO-" + String(max + 1).padStart(3, "0");
}

module.exports = { LEDGER, SEVERITIES, STATES, PENDING, parse, load, validate, summary, nextId };
