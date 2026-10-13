"use strict";
// Stage visuals other than flows. The orchestrator writes <name>.visual.json
// and this module renders <name>.excalidraw next to it.
//   tipo "mapa"    stage 1 (people and what they want) and stage 2 (features per person)
//   tipo "boceto"  stage 4 (simple screen wireframes and how they connect)
//   tipo "fases"   stage 5 (what you get at the end of each phase)

const fs = require("fs");
const path = require("path");
const { Scene, COLORS, anchor, wrap, LINE_H } = require("./escena");

const TAGS = {
  imprescindible: COLORS.green,
  despues: COLORS.softYellow,
  después: COLORS.softYellow,
  quizas: COLORS.gray,
  quizás: COLORS.gray,
};
const PHASE_STATES = { pendiente: COLORS.blue, "en-curso": COLORS.softYellow, terminada: COLORS.green };
const ELEMENTS = ["menu", "encabezado", "texto", "campo", "boton", "lista", "tarjeta", "imagen", "aviso", "separador"];

function str(v) {
  return v === undefined || v === null ? "" : String(v);
}

function validateVisual(v) {
  const errors = [];
  if (!v || typeof v !== "object" || Array.isArray(v)) return ["El archivo debe ser un objeto JSON."];
  if (!["mapa", "boceto", "fases"].includes(v.tipo)) errors.push("«tipo» debe ser mapa, boceto o fases.");
  if (!str(v.titulo).trim()) errors.push("Falta «titulo».");
  if (v.tipo === "mapa") {
    if (!Array.isArray(v.grupos) || !v.grupos.length) errors.push("Un mapa necesita «grupos» con al menos un grupo.");
    (v.grupos || []).forEach((g, i) => {
      if (!str(g && g.nombre).trim()) errors.push(`Grupo #${i + 1}: falta «nombre».`);
      if (!Array.isArray(g && g.items)) errors.push(`Grupo #${i + 1}: «items» debe ser una lista.`);
      ((g && g.items) || []).forEach((it, j) => {
        if (!str(typeof it === "string" ? it : it && it.texto).trim()) errors.push(`Grupo #${i + 1}, elemento #${j + 1}: falta «texto».`);
      });
    });
  }
  if (v.tipo === "fases") {
    if (!Array.isArray(v.fases) || !v.fases.length) errors.push("Una línea de fases necesita «fases».");
    (v.fases || []).forEach((f, i) => {
      if (!str(f && f.nombre).trim()) errors.push(`Fase #${i + 1}: falta «nombre».`);
      if (!str(f && f.entrega).trim()) errors.push(`Fase #${i + 1}: falta «entrega» (qué podrás hacer al terminarla).`);
      if (f && f.estado && !PHASE_STATES[f.estado]) errors.push(`Fase #${i + 1}: estado «${f.estado}» desconocido; usa pendiente, en-curso o terminada.`);
    });
  }
  if (v.tipo === "boceto") {
    if (!Array.isArray(v.pantallas) || !v.pantallas.length) errors.push("Un boceto necesita «pantallas».");
    if (v.dispositivo && !["movil", "escritorio"].includes(v.dispositivo)) errors.push("«dispositivo» debe ser movil o escritorio.");
    const ids = new Set();
    (v.pantallas || []).forEach((p, i) => {
      const id = str(p && p.id);
      if (!id) errors.push(`Pantalla #${i + 1}: falta «id».`);
      else if (ids.has(id)) errors.push(`Pantalla «${id}»: id repetido.`);
      ids.add(id);
      if (!str(p && p.nombre).trim()) errors.push(`Pantalla #${i + 1}: falta «nombre».`);
      ((p && p.elementos) || []).forEach((el, j) => {
        if (!ELEMENTS.includes(el && el.tipo)) errors.push(`Pantalla «${id}», elemento #${j + 1}: tipo «${el && el.tipo}» desconocido; usa ${ELEMENTS.join(", ")}.`);
      });
    });
    (v.navegacion || []).forEach((n, i) => {
      if (!ids.has(str(n && n.de)) || !ids.has(str(n && n.a))) errors.push(`Navegación #${i + 1}: «de» y «a» deben ser ids de pantallas.`);
    });
  }
  return errors;
}

function header(scene, v) {
  scene.text("title", 0, 0, str(v.titulo), { fontSize: 28 });
  let y = 44;
  if (v.subtitulo) {
    const t = scene.text("subtitle", 0, y, str(v.subtitulo), { fontSize: 15, maxChars: 120, color: "#495057" });
    y += t.height + 8;
  }
  return y + 30;
}

function boxHeight(text, width, fontSize, minH) {
  const lines = wrap(text, Math.max(6, Math.floor((width - 28) / (fontSize * 0.56))));
  return Math.max(minH, Math.ceil(lines.length * fontSize * LINE_H + 28));
}

function renderMapa(v) {
  const scene = new Scene("mapa:" + v.titulo);
  const top = header(scene, v);
  const W = 300;
  const GAP = 40;
  v.grupos.forEach((g, i) => {
    const x = i * (W + GAP);
    let y = top;
    const head = scene.box(`g${i}`, x, y, W, 64, str(g.nombre), { color: COLORS.purple, fontSize: 18 });
    y += head.height + 10;
    if (g.descripcion) {
      const t = scene.text(`g${i}-desc`, x, y, str(g.descripcion), { fontSize: 14, maxChars: 38, color: "#495057" });
      y += t.height + 14;
    }
    (g.items || []).forEach((it, j) => {
      const item = typeof it === "string" ? { texto: it } : it;
      const text = (item.id ? item.id + "\n" : "") + str(item.texto) + (item.etiqueta ? `\n(${item.etiqueta})` : "");
      const h = boxHeight(text, W, 15, 60);
      const color = TAGS[str(item.etiqueta).toLowerCase()] || COLORS.blue;
      scene.box(`g${i}-i${j}`, x, y, W, h, text, { color, fontSize: 15 });
      y += h + 12;
    });
  });
  return scene;
}

function renderFases(v) {
  const scene = new Scene("fases:" + v.titulo);
  const top = header(scene, v);
  const W = 330;
  const GAP = 70;
  const texts = v.fases.map((f) => {
    const parts = [str(f.nombre).toUpperCase(), "", str(f.entrega)];
    if (Array.isArray(f.funcionalidades) && f.funcionalidades.length) parts.push("", "Incluye: " + f.funcionalidades.join(", "));
    if (f.estado) parts.push("", "Estado: " + f.estado);
    return parts.join("\n");
  });
  const H = Math.max(...texts.map((t) => boxHeight(t, W, 15, 160)));
  const boxes = v.fases.map((f, i) => scene.box(`f${i}`, i * (W + GAP), top, W, H, texts[i], { color: PHASE_STATES[f.estado] || COLORS.blue, fontSize: 15, align: "left", valign: "top", pad: 18 }));
  for (let i = 0; i < boxes.length - 1; i++) scene.arrow(`fa${i}`, boxes[i].id, boxes[i + 1].id, [anchor.right(boxes[i]), anchor.left(boxes[i + 1])]);
  return scene;
}

// Lays out one screen's elements top to bottom inside a device frame.
function screenElements(scene, prefix, x, y, width, elements) {
  const inner = width - 32;
  let cy = y;
  elements.forEach((el, i) => {
    const id = `${prefix}-e${i}`;
    const text = str(el.texto);
    const left = x + 16;
    switch (el.tipo) {
      case "menu": {
        scene.box(id, x, cy - 16, width, 48, text || "Menú", { color: COLORS.gray, fontSize: 14, roughness: 0 });
        cy += 44;
        break;
      }
      case "encabezado": {
        const t = scene.text(id, left, cy, text, { fontSize: 22, maxChars: Math.floor(inner / 12.3) });
        cy += t.height + 12;
        break;
      }
      case "texto": {
        const t = scene.text(id, left, cy, text, { fontSize: 14, maxChars: Math.floor(inner / 7.84), color: "#495057" });
        cy += t.height + 12;
        break;
      }
      case "campo": {
        if (el.etiqueta) {
          const t = scene.text(id + "-label", left, cy, str(el.etiqueta), { fontSize: 13, color: "#495057" });
          cy += t.height + 4;
        }
        scene.box(id, left, cy, inner, 40, text, { color: COLORS.white, fontSize: 14, align: "left", textColor: "#868e96", roughness: 0 });
        cy += 52;
        break;
      }
      case "boton": {
        scene.box(id, left, cy, inner, 44, text || "Botón", { color: COLORS.blue, fontSize: 15, roughness: 0 });
        cy += 56;
        break;
      }
      case "lista": {
        const items = Array.isArray(el.items) && el.items.length ? el.items.map(str) : [text || "elemento"];
        const body = items.map((it) => "• " + it).join("\n");
        const h = boxHeight(body, inner, 14, 44);
        scene.box(id, left, cy, inner, h, body, { color: COLORS.white, fontSize: 14, align: "left", valign: "top", roughness: 0 });
        cy += h + 12;
        break;
      }
      case "tarjeta": {
        const h = boxHeight(text, inner, 14, 60);
        scene.box(id, left, cy, inner, h, text, { color: COLORS.note, fontSize: 14, roughness: 0 });
        cy += h + 12;
        break;
      }
      case "imagen": {
        scene.box(id, left, cy, inner, 120, "imagen: " + (text || ""), { color: COLORS.gray, fontSize: 14, dashed: true, roughness: 0 });
        cy += 132;
        break;
      }
      case "aviso": {
        const h = boxHeight(text, inner, 14, 44);
        scene.box(id, left, cy, inner, h, text, { color: COLORS.softYellow, fontSize: 14, roughness: 0 });
        cy += h + 12;
        break;
      }
      case "separador": {
        scene.line(id, [[left, cy + 6], [left + inner, cy + 6]]);
        cy += 18;
        break;
      }
      default:
        break;
    }
  });
  return cy;
}

function renderBoceto(v) {
  const scene = new Scene("boceto:" + v.titulo);
  const top = header(scene, v) + 30;
  const desktop = v.dispositivo === "escritorio";
  const W = desktop ? 760 : 340;
  const GAP = 150;
  const minH = desktop ? 460 : 600;
  const frames = new Map();

  // Measure content first so every frame in the row has the same height.
  const probe = new Scene("probe");
  const heights = v.pantallas.map((p, i) => screenElements(probe, "p" + i, 0, 0, W, p.elementos || []) + 40);
  const H = Math.max(minH, ...heights);

  v.pantallas.forEach((p, i) => {
    const x = i * (W + GAP);
    scene.text(`s${i}-title`, x, top - 30, `${str(p.id)} · ${str(p.nombre)}`, { fontSize: 16 });
    const frame = scene.box(`s${i}`, x, top, W, H, "", { color: COLORS.white, roughness: 0, strokeWidth: 3 });
    frames.set(str(p.id), frame);
    screenElements(scene, `s${i}`, x, top + 24, W, p.elementos || []);
    if (p.notas) scene.text(`s${i}-notes`, x, top + H + 14, "Nota: " + str(p.notas), { fontSize: 14, maxChars: Math.floor(W / 7.84), color: "#495057" });
  });

  // Neighbours to the right connect straight across the gap; any other jump
  // goes under the frames, below the notes.
  const index = new Map(v.pantallas.map((p, i) => [str(p.id), i]));
  const across = new Map();
  let below = 0;
  (v.navegacion || []).forEach((n, i) => {
    const a = frames.get(str(n.de));
    const b = frames.get(str(n.a));
    if (!a || !b) return;
    const label = str(n.accion) || undefined;
    if (index.get(str(n.a)) === index.get(str(n.de)) + 1) {
      const k = across.get(a.id) || 0;
      across.set(a.id, k + 1);
      const y = a.y + 90 + k * 70;
      scene.arrow(`nav${i}`, a.id, b.id, [[a.x + a.width, y], [b.x, y]], { label, color: "#1971c2", labelChars: 14 });
    } else {
      const level = a.y + a.height + 90 + below * 30;
      below += 1;
      const ax = a.x + a.width / 2;
      const bx = b.x + b.width / 2 + (b.x > a.x ? -30 : 30);
      scene.arrow(`nav${i}`, a.id, b.id, [[ax, a.y + a.height], [ax, level], [bx, level], [bx, b.y + b.height]], { label, color: "#1971c2", labelChars: 30 });
    }
  });
  return scene;
}

function renderVisual(v) {
  if (v.tipo === "mapa") return renderMapa(v);
  if (v.tipo === "fases") return renderFases(v);
  return renderBoceto(v);
}

function generateVisual(file) {
  let v;
  try {
    v = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  } catch (err) {
    return { file, errors: ["JSON inválido en " + path.basename(file) + ": " + err.message], warnings: [], written: [] };
  }
  const errors = validateVisual(v);
  if (errors.length) return { file, errors, warnings: [], written: [] };
  const out = file.replace(/\.visual\.json$/, ".excalidraw");
  const content = renderVisual(v).serialize();
  let changed = true;
  try {
    changed = fs.readFileSync(out, "utf8") !== content;
  } catch (err) {
    // new file
  }
  if (changed) fs.writeFileSync(out, content);
  return { file, errors: [], warnings: [], written: changed ? [out] : [] };
}

module.exports = { validateVisual, renderVisual, generateVisual, ELEMENTS };
