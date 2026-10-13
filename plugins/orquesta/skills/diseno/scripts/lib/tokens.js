"use strict";
// Design tokens of an orquesta project (docs/diseno/tokens.json): validation
// (structure, WCAG contrast, typefaces) and generation of tokens.css, the
// file the reference page and the app's styles use.

const fs = require("fs");
const path = require("path");

const ROLES = ["fondo", "superficie", "superficie_alt", "borde", "texto", "texto_suave", "acento", "acento_texto", "acento_suave", "exito", "aviso", "error", "foco"];

// [foreground, background, minimum ratio, what it is for]
const PAIRS = [
  ["texto", "fondo", 4.5, "texto normal sobre el fondo"],
  ["texto", "superficie", 4.5, "texto sobre tarjetas y campos"],
  ["texto", "superficie_alt", 4.5, "texto sobre la superficie alternativa"],
  ["texto", "acento_suave", 4.5, "texto sobre el resaltado"],
  ["texto_suave", "fondo", 4.5, "texto secundario sobre el fondo"],
  ["texto_suave", "superficie", 4.5, "texto secundario sobre tarjetas"],
  ["acento_texto", "acento", 4.5, "texto del botón principal"],
  ["acento", "fondo", 3, "el acento como borde, icono o control"],
  ["foco", "fondo", 3, "el anillo de foco sobre el fondo"],
  ["foco", "superficie", 3, "el anillo de foco sobre tarjetas y campos"],
  ["exito", "superficie", 4.5, "mensajes de éxito"],
  ["aviso", "superficie", 4.5, "mensajes de aviso"],
  ["error", "superficie", 4.5, "mensajes de error"],
];

// Families that would make the app look like every other generated app.
const GENERIC_FAMILIES = ["inter", "roboto", "arial", "helvetica", "helvetica neue", "open sans", "system-ui", "-apple-system", "segoe ui", "sans-serif", "serif", "times new roman"];
// Anthropic's commercial typefaces: the house is inspired by its look, it never
// uses its brand assets.
const PROPRIETARY = ["styrene", "tiempos", "copernicus"];

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
const isNumber = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;

function checkPalette(palette, mode, errors, warnings) {
  if (!isObject(palette)) {
    errors.push(`color.${mode} debe ser un objeto con los colores por rol (${ROLES.join(", ")}).`);
    return;
  }
  const missing = ROLES.filter((r) => !(r in palette));
  if (missing.length) errors.push(`color.${mode}: faltan los roles ${missing.join(", ")}.`);
  for (const [role, value] of Object.entries(palette)) {
    if (typeof value !== "string" || !HEX.test(value)) errors.push(`color.${mode}.${role}: «${value}» no es un color hexadecimal (#RRGGBB).`);
  }
  for (const [fg, bg, min, what] of PAIRS) {
    if (!HEX.test(palette[fg] || "") || !HEX.test(palette[bg] || "")) continue;
    const ratio = contrast(palette[fg], palette[bg]);
    if (ratio < min) errors.push(`Contraste insuficiente en modo ${mode}: ${fg} sobre ${bg} da ${ratio.toFixed(2)}:1 y necesita ${min}:1 (${what}).`);
  }
  if (HEX.test(palette.acento || "") && HEX.test(palette.fondo || "")) {
    const ratio = contrast(palette.acento, palette.fondo);
    if (ratio >= 3 && ratio < 4.5) warnings.push(`En modo ${mode}, el acento sobre el fondo da ${ratio.toFixed(2)}:1: sirve para bordes, iconos y botones, no para texto pequeño ni enlaces.`);
  }
  if (palette.fondo && /^#f{3}(f{3})?$/i.test(palette.fondo)) warnings.push(`color.${mode}.fondo es blanco puro: la casa usa un fondo cálido tipo papel y deja el blanco para las superficies.`);
  if (palette.texto && /^#0{3}(0{3})?$/.test(palette.texto)) warnings.push(`color.${mode}.texto es negro puro: la casa usa un casi negro cálido.`);
}

function checkFamily(key, spec, errors, warnings) {
  if (!isObject(spec) || typeof spec.familia !== "string" || !spec.familia.trim()) {
    errors.push(`tipografia.${key}.familia es obligatoria.`);
    return;
  }
  const name = spec.familia.trim().toLowerCase();
  if (PROPRIETARY.some((p) => name.includes(p))) errors.push(`tipografia.${key}: «${spec.familia}» es una tipografía comercial de Anthropic. La casa se inspira en su estilo, pero usa alternativas libres (Google Fonts).`);
  else if (GENERIC_FAMILIES.includes(name)) warnings.push(`tipografia.${key}: «${spec.familia}» es una tipografía genérica; como identidad hace que la app parezca una más. Úsala solo como respaldo.`);
  if (spec.pesos !== undefined && (!Array.isArray(spec.pesos) || !spec.pesos.every((w) => Number.isInteger(w) && w >= 100 && w <= 900))) errors.push(`tipografia.${key}.pesos debe ser una lista de pesos entre 100 y 900.`);
}

function validate(tokens) {
  const errors = [];
  const warnings = [];
  if (!isObject(tokens)) return { errors: ["tokens.json debe ser un objeto JSON."], warnings };
  if (typeof tokens.nombre !== "string" || !tokens.nombre.trim()) errors.push("Falta «nombre»: el proyecto y la dirección elegida.");
  if (!Number.isInteger(tokens.version) || tokens.version < 1) errors.push("«version» debe ser un entero desde 1; súbela en cada ajuste.");

  if (!isObject(tokens.color)) errors.push("Falta «color» con al menos el modo «claro».");
  else {
    const modes = Object.keys(tokens.color);
    if (!tokens.color.claro) errors.push("Falta color.claro.");
    for (const mode of modes) {
      if (mode !== "claro" && mode !== "oscuro") errors.push(`color.${mode}: los modos posibles son «claro» y «oscuro».`);
      else checkPalette(tokens.color[mode], mode, errors, warnings);
    }
  }

  const t = tokens.tipografia;
  if (!isObject(t)) errors.push("Falta «tipografia» con «titulos», «texto» y «escala».");
  else {
    checkFamily("titulos", t.titulos, errors, warnings);
    checkFamily("texto", t.texto, errors, warnings);
    if (t.mono !== undefined) checkFamily("mono", t.mono, errors, warnings);
    if (!isObject(t.escala) || !Object.values(t.escala).every(isNumber) || !("base" in t.escala)) errors.push("tipografia.escala debe tener tamaños en píxeles, incluido «base».");
    else if (t.escala.base < 16) warnings.push(`El texto base mide ${t.escala.base} px: en el móvil conviene 16 px o más.`);
    if (t.interlineado !== undefined && (!isObject(t.interlineado) || !Object.values(t.interlineado).every(isNumber))) errors.push("tipografia.interlineado debe tener números (1.15, 1.6…).");
  }

  if (!Array.isArray(tokens.espacio) || !tokens.espacio.every(isNumber)) errors.push("«espacio» debe ser una lista de medidas en píxeles (0, 4, 8, 12, 16…).");
  else if (tokens.espacio.some((v, i) => i && v <= tokens.espacio[i - 1])) errors.push("«espacio» debe ir de menor a mayor.");
  if (!isObject(tokens.radio) || !Object.values(tokens.radio).every(isNumber)) errors.push("«radio» debe tener radios en píxeles (sm, md, lg, pastilla).");
  if (tokens.sombra !== undefined && (!isObject(tokens.sombra) || !Object.values(tokens.sombra).every((v) => typeof v === "string"))) errors.push("«sombra» debe tener sombras escritas como en CSS.");

  const m = tokens.movimiento;
  if (!isObject(m) || !isNumber(m.rapido) || !isNumber(m.normal) || typeof m.curva !== "string") errors.push("«movimiento» necesita «rapido» y «normal» en milisegundos y «curva».");
  else if (m.normal > 400) warnings.push(`Una transición normal de ${m.normal} ms se siente lenta; la casa usa entre 150 y 250 ms.`);

  if (tokens.ancho !== undefined && !isObject(tokens.ancho)) errors.push("«ancho» debe ser un objeto (lectura, contenido).");
  if (typeof tokens.firma !== "string" || !tokens.firma.trim()) warnings.push("Falta «firma»: el detalle propio de este proyecto que lo distingue.");
  return { errors, warnings };
}

// ---------------------------------------------------------------- CSS

const kebab = (s) => String(s).replace(/_/g, "-");
const px = (v) => (v === 0 ? "0px" : `${v}px`);
const rem = (v) => `${+(v / 16).toFixed(4)}rem`;

function family(spec) {
  const name = /\s/.test(spec.familia) ? `"${spec.familia}"` : spec.familia;
  return spec.respaldo ? `${name}, ${spec.respaldo}` : name;
}

function colorLines(palette, indent) {
  return Object.entries(palette).map(([role, value]) => `${indent}--${kebab(role)}: ${value};`);
}

function css(tokens) {
  const t = tokens.tipografia;
  const lines = [
    "/* Generado desde tokens.json por orquesta. No lo edites a mano: cambia tokens.json. */",
    `/* ${tokens.nombre} · versión ${tokens.version} */`,
    "",
    ":root {",
    ...colorLines(tokens.color.claro, "  "),
  ];
  for (const key of ["titulos", "texto", "mono"]) if (t[key]) lines.push(`  --fuente-${key}: ${family(t[key])};`);
  for (const [k, v] of Object.entries(t.escala)) lines.push(`  --tam-${k}: ${rem(v)};`);
  for (const [k, v] of Object.entries(t.interlineado || {})) lines.push(`  --interlineado-${kebab(k)}: ${v};`);
  tokens.espacio.forEach((v, i) => lines.push(`  --espacio-${i}: ${px(v)};`));
  for (const [k, v] of Object.entries(tokens.radio)) lines.push(`  --radio-${kebab(k)}: ${px(v)};`);
  for (const [k, v] of Object.entries(tokens.sombra || {})) lines.push(`  --sombra-${kebab(k)}: ${v};`);
  for (const k of ["rapido", "normal", "lento"]) if (isNumber(tokens.movimiento[k])) lines.push(`  --duracion-${k}: ${tokens.movimiento[k]}ms;`);
  lines.push(`  --curva: ${tokens.movimiento.curva};`);
  const ancho = tokens.ancho || {};
  for (const [k, v] of Object.entries(ancho)) lines.push(`  --ancho-${kebab(k)}: ${typeof v === "number" ? px(v) : v};`);
  lines.push(`  color-scheme: ${tokens.color.oscuro ? "light dark" : "light"};`, "}");

  if (tokens.color.oscuro) {
    lines.push(
      "",
      "/* Modo oscuro: automático según el dispositivo, o forzado con data-tema=\"oscuro\" | \"claro\" en <html>. */",
      "@media (prefers-color-scheme: dark) {",
      '  :root:not([data-tema="claro"]) {',
      ...colorLines(tokens.color.oscuro, "    "),
      "    color-scheme: dark;",
      "  }",
      "}",
      ':root[data-tema="oscuro"] {',
      ...colorLines(tokens.color.oscuro, "  "),
      "  color-scheme: dark;",
      "}",
      ':root[data-tema="claro"] {',
      "  color-scheme: light;",
      "}"
    );
  }

  lines.push(
    "",
    "/* Para Tailwind CSS v4 (utilidades bg-fondo, text-texto-suave, font-titulos, rounded-md, shadow-flotante, ease-curva…).",
    "   Los navegadores ignoran este bloque cuando el archivo se usa como CSS normal. */",
    "@theme inline {"
  );
  for (const role of Object.keys(tokens.color.claro)) lines.push(`  --color-${kebab(role)}: var(--${kebab(role)});`);
  for (const key of ["titulos", "texto", "mono"]) if (t[key]) lines.push(`  --font-${key}: var(--fuente-${key});`);
  for (const k of Object.keys(t.escala)) lines.push(`  --text-${k}: var(--tam-${k});`);
  for (const k of Object.keys(tokens.radio)) lines.push(`  --radius-${kebab(k)}: var(--radio-${kebab(k)});`);
  for (const k of Object.keys(tokens.sombra || {})) lines.push(`  --shadow-${kebab(k)}: var(--sombra-${kebab(k)});`);
  lines.push("  --ease-curva: var(--curva);", "}", "");
  return lines.join("\n");
}

// Validates a tokens.json file and, when it is valid, writes tokens.css next
// to it (only if the content changed).
function generate(file) {
  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  } catch (err) {
    return { errors: [`${path.basename(file)} no es JSON válido: ${err.message}`], warnings: [], written: [] };
  }
  const { errors, warnings } = validate(tokens);
  if (errors.length) return { errors, warnings, written: [] };
  const out = path.join(path.dirname(file), "tokens.css");
  const text = css(tokens);
  let current = null;
  try {
    current = fs.readFileSync(out, "utf8");
  } catch (err) {
    // first time
  }
  if (current === text) return { errors, warnings, written: [] };
  fs.writeFileSync(out, text);
  return { errors, warnings, written: [out] };
}

module.exports = { ROLES, PAIRS, contrast, validate, css, generate };
