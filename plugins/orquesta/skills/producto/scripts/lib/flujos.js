"use strict";
// Flow diagrams: the orchestrator writes a flow as structured data
// (<ID>-<slug>.flow.json) and this module validates it and renders two views:
//   <ID>-<slug>.md          Mermaid diagram + plain-language step cards
//   <ID>-<slug>.excalidraw  visual map with lanes per actor
// The source is data, not drawings: layout is computed here, never by a model.

const fs = require("fs");
const path = require("path");
const { Scene, COLORS, anchor, wrap, measure, maxCharsFor, LINE_H } = require("./escena");

const TYPES = {
  inicio: { shape: "ellipse", color: COLORS.green, label: "Inicio" },
  fin: { shape: "ellipse", color: COLORS.lightGreen, label: "Fin" },
  pantalla: { shape: "rectangle", color: COLORS.blue, label: "Pantalla" },
  accion: { shape: "rectangle", color: COLORS.softYellow, label: "Acción del sistema" },
  decision: { shape: "diamond", color: COLORS.orange, label: "Decisión" },
  datos: { shape: "rectangle", color: COLORS.lavender, label: "Datos guardados" },
  externo: { shape: "rectangle", color: COLORS.teal, dashed: true, label: "Servicio externo" },
  espera: { shape: "rectangle", color: COLORS.gray, dotted: true, label: "Espera" },
  subflujo: { shape: "rectangle", color: COLORS.pink, strokeWidth: 4, label: "Otro flujo" },
};
const END_RESULTS = { exito: COLORS.lightGreen, error: COLORS.red, cancelado: COLORS.gray };
const END_LABELS = { exito: "fin con éxito", error: "fin con error", cancelado: "fin cancelado" };
const EDGE_TYPES = ["normal", "error", "espera"];
const STATES = ["borrador", "revision", "aprobado", "obsoleto"];
const FLOW_ID = /^F\d{2,}$/;
const FUN_ID = /^FUN-\d{2,}$/;
const STEP_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

const FONT_SIZE = 15;
const GAP_X = 60;
const GAP_Y = 90;
const LANE_PAD = 30;
const LANE_MIN = 320;

// ---------------------------------------------------------------- loading

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

// Fills defaults and coerces shapes so later code can trust the structure.
// Never invents content: missing text stays empty and validation reports it.
function normalize(raw) {
  const flow = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const actores = (Array.isArray(flow.actores) ? flow.actores : []).map((a) =>
    typeof a === "string" ? { id: a, nombre: a } : { id: String(a && a.id !== undefined ? a.id : ""), nombre: String((a && (a.nombre || a.id)) || "") }
  );
  const pasos = (Array.isArray(flow.pasos) ? flow.pasos : []).map((p) => {
    const s = p && typeof p === "object" ? p : {};
    return {
      id: s.id === undefined ? "" : String(s.id),
      tipo: String(s.tipo || ""),
      texto: String(s.texto || ""),
      actor: s.actor === undefined || s.actor === null ? "" : String(s.actor),
      detalle: String(s.detalle || ""),
      ve: String(s.ve || ""),
      reglas: asList(s.reglas),
      datos: asList(s.datos),
      si_falla: asList(s.si_falla),
      notas: String(s.notas || ""),
      flujo: s.flujo ? String(s.flujo) : "",
      resultado: s.resultado ? String(s.resultado) : "",
    };
  });
  const transiciones = (Array.isArray(flow.transiciones) ? flow.transiciones : []).map((t) => {
    const e = t && typeof t === "object" ? t : {};
    return {
      de: e.de === undefined ? "" : String(e.de),
      a: e.a === undefined ? "" : String(e.a),
      condicion: String(e.condicion || ""),
      tipo: String(e.tipo || "normal"),
    };
  });
  return {
    id: String(flow.id || ""),
    titulo: String(flow.titulo || ""),
    funcionalidad: asList(flow.funcionalidad),
    version: Number.isInteger(flow.version) ? flow.version : flow.version === undefined ? 1 : flow.version,
    estado: String(flow.estado || "borrador"),
    resumen: String(flow.resumen || ""),
    disparador: String(flow.disparador || ""),
    actores,
    precondiciones: asList(flow.precondiciones),
    postcondiciones: asList(flow.postcondiciones),
    pasos,
    transiciones,
    criterios: asList(flow.criterios),
    preguntas_abiertas: asList(flow.preguntas_abiertas),
    cambios: (Array.isArray(flow.cambios) ? flow.cambios : []).map((c) => ({
      version: c && c.version !== undefined ? c.version : "",
      fecha: String((c && c.fecha) || ""),
      cambio: String((c && c.cambio) || ""),
    })),
  };
}

function loadFlow(file) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  } catch (err) {
    return { flow: null, parseError: "JSON inválido en " + path.basename(file) + ": " + err.message };
  }
  return { flow: normalize(raw), parseError: null };
}

// ---------------------------------------------------------------- validation

function graph(flow) {
  const byId = new Map();
  for (const p of flow.pasos) if (p.id && !byId.has(p.id)) byId.set(p.id, p);
  const edges = flow.transiciones.filter((e) => byId.has(e.de) && byId.has(e.a));
  const out = new Map([...byId.keys()].map((id) => [id, []]));
  const inc = new Map([...byId.keys()].map((id) => [id, []]));
  edges.forEach((e) => {
    out.get(e.de).push(e);
    inc.get(e.a).push(e);
  });
  return { byId, edges, out, inc };
}

function reach(startIds, next) {
  const seen = new Set(startIds);
  const queue = [...startIds];
  while (queue.length) {
    const id = queue.shift();
    for (const n of next(id)) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}

// Returns { errors, warnings }: arrays of plain-language strings.
// Errors make a flow unusable as a contract; warnings point at missing detail.
// An approved flow turns completeness warnings into errors.
function validate(flow) {
  const errors = [];
  const warnings = [];
  const approved = flow.estado === "aprobado";
  const gap = (msg) => (approved ? errors : warnings).push(msg);

  if (!FLOW_ID.test(flow.id)) errors.push(`El id del flujo debe tener la forma F01, F02…; es «${flow.id}».`);
  if (!flow.titulo.trim()) errors.push("Falta el título del flujo.");
  if (!STATES.includes(flow.estado)) errors.push(`Estado «${flow.estado}» desconocido; usa ${STATES.join(", ")}.`);
  if (!Number.isInteger(flow.version) || flow.version < 1) errors.push("La versión debe ser un número entero desde 1.");
  for (const f of flow.funcionalidad) if (!FUN_ID.test(f)) errors.push(`Funcionalidad «${f}» no tiene la forma FUN-01.`);
  if (!flow.funcionalidad.length) warnings.push("El flujo no indica a qué funcionalidad (FUN-xx) pertenece.");
  if (!flow.resumen.trim()) warnings.push("Falta el resumen del flujo.");
  if (!flow.disparador.trim()) warnings.push("Falta el disparador: qué hace que este flujo empiece.");

  const actorIds = new Set();
  for (const a of flow.actores) {
    if (!a.id) errors.push("Hay un actor sin id.");
    else if (actorIds.has(a.id)) errors.push(`El actor «${a.id}» está repetido.`);
    actorIds.add(a.id);
  }

  if (!flow.pasos.length) {
    errors.push("El flujo no tiene pasos.");
    return { errors, warnings };
  }

  const seenIds = new Set();
  flow.pasos.forEach((p, i) => {
    const where = p.id ? `Paso «${p.id}»` : `Paso #${i + 1}`;
    if (!STEP_ID.test(p.id)) errors.push(`${where}: el id debe usar letras, números, «_» o «-» (máx. 40).`);
    else if (seenIds.has(p.id)) errors.push(`${where}: id repetido.`);
    seenIds.add(p.id);
    if (!TYPES[p.tipo]) errors.push(`${where}: tipo «${p.tipo}» desconocido; usa ${Object.keys(TYPES).join(", ")}.`);
    if (!p.texto.trim()) errors.push(`${where}: falta el texto que se muestra en el diagrama.`);
    else if (p.texto.length > 80) warnings.push(`${where}: el texto tiene ${p.texto.length} caracteres; resúmelo (máx. 80) y lleva el resto a «detalle».`);
    if (flow.actores.length) {
      if (!p.actor) errors.push(`${where}: falta el actor (el flujo declara actores).`);
      else if (!actorIds.has(p.actor)) errors.push(`${where}: el actor «${p.actor}» no está declarado en «actores».`);
    } else if (p.actor) {
      warnings.push(`${where}: usa el actor «${p.actor}» pero el flujo no declara «actores».`);
    }
    if (TYPES[p.tipo] && p.tipo !== "inicio" && p.tipo !== "fin" && !p.detalle.trim()) {
      gap(`${where}: falta «detalle»: qué ocurre exactamente en este paso.`);
    }
    if (p.tipo === "subflujo" && !FLOW_ID.test(p.flujo)) errors.push(`${where}: un subflujo debe indicar «flujo» (por ejemplo F02).`);
    if (p.tipo === "fin" && p.resultado && !END_RESULTS[p.resultado]) {
      errors.push(`${where}: resultado «${p.resultado}» desconocido; usa exito, error o cancelado.`);
    }
    if (p.tipo === "fin" && !p.resultado) warnings.push(`${where}: indica el «resultado» del fin (exito, error o cancelado).`);
    if (p.tipo === "datos" && !p.datos.length) warnings.push(`${where}: indica en «datos» qué información se guarda o se consulta.`);
    if (p.tipo === "pantalla" && !p.ve.trim()) warnings.push(`${where}: describe en «ve» lo que la persona ve en esta pantalla.`);
  });

  const { byId, out, inc } = graph(flow);
  const seenEdges = new Set();
  flow.transiciones.forEach((e, i) => {
    const where = `Transición #${i + 1} (${e.de || "?"} → ${e.a || "?"})`;
    if (!byId.has(e.de)) errors.push(`${where}: el paso de origen «${e.de}» no existe.`);
    if (!byId.has(e.a)) errors.push(`${where}: el paso de destino «${e.a}» no existe.`);
    if (!EDGE_TYPES.includes(e.tipo)) errors.push(`${where}: tipo «${e.tipo}» desconocido; usa ${EDGE_TYPES.join(", ")}.`);
    const key = e.de + "\u0000" + e.a + "\u0000" + e.condicion;
    if (seenEdges.has(key)) errors.push(`${where}: transición repetida.`);
    seenEdges.add(key);
  });

  const starts = flow.pasos.filter((p) => p.tipo === "inicio" && byId.get(p.id) === p);
  const ends = flow.pasos.filter((p) => p.tipo === "fin" && byId.get(p.id) === p);
  if (!starts.length) errors.push("El flujo necesita al menos un paso de tipo «inicio».");
  if (!ends.length) errors.push("El flujo necesita al menos un paso de tipo «fin».");

  for (const [id, p] of byId) {
    const outs = out.get(id);
    const where = `Paso «${id}»`;
    if (p.tipo === "inicio" && inc.get(id).length) errors.push(`${where}: un inicio no puede tener transiciones que lleguen a él.`);
    if (p.tipo === "fin" && outs.length) errors.push(`${where}: un fin no puede tener transiciones de salida.`);
    if (p.tipo !== "fin" && TYPES[p.tipo] && !outs.length) errors.push(`${where}: no tiene salida; todo paso que no es un fin debe llevar a otro.`);
    if (p.tipo === "decision") {
      if (outs.length < 2) errors.push(`${where}: una decisión necesita al menos dos ramas.`);
      const labels = outs.map((e) => e.condicion.trim().toLowerCase());
      if (labels.some((l) => !l)) errors.push(`${where}: todas las ramas de una decisión deben tener «condicion» (por ejemplo «sí» y «no»).`);
      if (new Set(labels.filter(Boolean)).size !== labels.filter(Boolean).length) errors.push(`${where}: dos ramas tienen la misma condición.`);
    } else if (outs.length > 1 && outs.some((e) => !e.condicion.trim())) {
      warnings.push(`${where}: tiene ${outs.length} salidas y alguna sin condición; usa una «decision» o etiqueta cada salida.`);
    }
    if (p.tipo === "externo" && !outs.some((e) => e.tipo === "error") && !p.si_falla.length) {
      gap(`${where}: es un servicio externo; modela qué pasa si falla (transición de tipo «error» o «si_falla»).`);
    }
  }

  if (starts.length) {
    const reachable = reach(
      starts.map((s) => s.id),
      (id) => out.get(id).map((e) => e.a)
    );
    for (const id of byId.keys()) if (!reachable.has(id)) errors.push(`Paso «${id}»: no se puede llegar a él desde el inicio.`);
  }
  if (ends.length) {
    const canEnd = reach(
      ends.map((s) => s.id),
      (id) => inc.get(id).map((e) => e.de)
    );
    for (const [id, p] of byId) {
      if (!canEnd.has(id) && out.get(id).length) errors.push(`Paso «${id}»: desde aquí no se llega a ningún fin.`);
    }
  }

  const hasUnhappy = flow.transiciones.some((e) => e.tipo === "error") || ends.some((p) => p.resultado === "error" || p.resultado === "cancelado");
  if (!hasUnhappy && flow.pasos.some((p) => p.tipo === "decision" || p.tipo === "externo" || p.tipo === "pantalla")) {
    warnings.push("Solo está el camino feliz: ¿qué pasa si algo sale mal? Añade ramas de error o un fin con error.");
  }

  if (approved && flow.preguntas_abiertas.length) errors.push("Un flujo aprobado no puede tener preguntas abiertas.");
  if (!flow.criterios.length) gap("Faltan los criterios de aceptación: cuándo se da por buena la funcionalidad.");

  return { errors, warnings };
}

// ---------------------------------------------------------------- layout

function nodeText(step) {
  return step.tipo === "subflujo" && step.flujo ? `${step.texto}\n→ ${step.flujo}` : step.texto;
}

function nodeSize(step) {
  const t = TYPES[step.tipo] || TYPES.accion;
  const text = nodeText(step) || " ";
  let w = t.shape === "diamond" ? 260 : t.shape === "ellipse" ? 240 : 260;
  let lines = wrap(text, maxCharsFor(t.shape, w, FONT_SIZE, 14));
  if (lines.length > 3 && t.shape !== "rectangle") {
    w += 40;
    lines = wrap(text, maxCharsFor(t.shape, w, FONT_SIZE, 14));
  }
  const lh = FONT_SIZE * LINE_H;
  let h;
  if (t.shape === "diamond") h = Math.max(120, Math.ceil(lines.length * lh * 2 + 30));
  else if (t.shape === "ellipse") h = Math.max(70, Math.ceil(lines.length * lh + 40));
  else h = Math.max(70, Math.ceil(lines.length * lh + 30));
  return { w, h, text };
}

// Layered layout: ranks from the longest path over a DAG (back edges removed),
// x positions pulled toward each node's predecessors, lanes per actor.
function layout(flow) {
  const { byId, edges, out } = graph(flow);
  const ids = [...byId.keys()];
  const indexOf = new Map(ids.map((id, i) => [id, i]));

  let roots = ids.filter((id) => byId.get(id).tipo === "inicio");
  if (!roots.length) {
    const hasIn = new Set(edges.map((e) => e.a));
    roots = ids.filter((id) => !hasIn.has(id));
  }
  if (!roots.length && ids.length) roots = [ids[0]];

  // DFS: discovery order and back edges.
  const state = new Map();
  const order = [];
  const back = new Set();
  const visit = (id) => {
    state.set(id, 1);
    order.push(id);
    for (const e of out.get(id)) {
      const s = state.get(e.a);
      if (s === 1) back.add(e);
      else if (!s) visit(e.a);
    }
    state.set(id, 2);
  };
  for (const r of roots) if (!state.get(r)) visit(r);
  for (const id of ids) if (!state.get(id)) visit(id);
  const orderIndex = new Map(order.map((id, i) => [id, i]));

  // Longest-path ranks over forward edges.
  const fwd = edges.filter((e) => !back.has(e));
  const indeg = new Map(ids.map((id) => [id, 0]));
  fwd.forEach((e) => indeg.set(e.a, indeg.get(e.a) + 1));
  const rank = new Map(ids.map((id) => [id, 0]));
  const queue = ids.filter((id) => indeg.get(id) === 0).sort((a, b) => orderIndex.get(a) - orderIndex.get(b));
  while (queue.length) {
    const id = queue.shift();
    for (const e of fwd.filter((x) => x.de === id)) {
      rank.set(e.a, Math.max(rank.get(e.a), rank.get(id) + 1));
      indeg.set(e.a, indeg.get(e.a) - 1);
      if (indeg.get(e.a) === 0) queue.push(e.a);
    }
  }

  // Lanes.
  const useLanes = flow.actores.length >= 2;
  const laneIds = useLanes ? flow.actores.map((a) => a.id) : ["_"];
  const laneOf = (id) => {
    if (!useLanes) return 0;
    const i = laneIds.indexOf(byId.get(id).actor);
    return i < 0 ? 0 : i;
  };

  const size = new Map(ids.map((id) => [id, nodeSize(byId.get(id))]));
  const maxRank = Math.max(0, ...ids.map((id) => rank.get(id)));
  const rows = Array.from({ length: maxRank + 1 }, () => []);
  ids.forEach((id) => rows[rank.get(id)].push(id));

  const rowY = [];
  let y = 0;
  rows.forEach((row, r) => {
    rowY[r] = y;
    y += Math.max(0, ...row.map((id) => size.get(id).h)) + GAP_Y;
  });
  const graphHeight = y - GAP_Y;

  // Lane widths: widest group of one lane in one rank.
  const laneWidth = laneIds.map((_, l) => {
    let widest = 0;
    rows.forEach((row) => {
      const group = row.filter((id) => laneOf(id) === l);
      const w = group.reduce((sum, id) => sum + size.get(id).w, 0) + GAP_X * Math.max(0, group.length - 1);
      widest = Math.max(widest, w);
    });
    return Math.max(LANE_MIN, widest + LANE_PAD * 2);
  });
  const laneX = [];
  laneWidth.reduce((x0, w, l) => {
    laneX[l] = x0;
    return x0 + w;
  }, 0);

  const preds = new Map(ids.map((id) => [id, []]));
  fwd.forEach((e) => preds.get(e.a).push(e.de));
  const cx = new Map();

  rows.forEach((row) => {
    for (let l = 0; l < laneIds.length; l++) {
      const group = row.filter((id) => laneOf(id) === l);
      if (!group.length) continue;
      const center = useLanes ? laneX[l] + laneWidth[l] / 2 : 0;
      const desired = new Map(
        group.map((id) => {
          const placed = preds.get(id).filter((p) => cx.has(p));
          return [id, placed.length ? placed.reduce((s, p) => s + cx.get(p), 0) / placed.length : center];
        })
      );
      group.sort((a, b) => desired.get(a) - desired.get(b) || orderIndex.get(a) - orderIndex.get(b));
      const xs = [];
      group.forEach((id, i) => {
        const want = desired.get(id);
        if (i === 0) xs.push(want);
        else {
          const prev = group[i - 1];
          xs.push(Math.max(want, xs[i - 1] + (size.get(prev).w + size.get(id).w) / 2 + GAP_X));
        }
      });
      const shift = group.reduce((s, id, i) => s + (desired.get(id) - xs[i]), 0) / group.length;
      for (let i = 0; i < xs.length; i++) xs[i] += shift;
      if (useLanes) {
        const left = xs[0] - size.get(group[0]).w / 2;
        const right = xs[xs.length - 1] + size.get(group[group.length - 1]).w / 2;
        const minL = laneX[l] + LANE_PAD;
        const maxR = laneX[l] + laneWidth[l] - LANE_PAD;
        let fix = 0;
        if (left < minL) fix = minL - left;
        else if (right > maxR) fix = maxR - right;
        for (let i = 0; i < xs.length; i++) xs[i] += fix;
      }
      group.forEach((id, i) => cx.set(id, xs[i]));
    }
  });

  if (!useLanes && ids.length) {
    const minLeft = Math.min(...ids.map((id) => cx.get(id) - size.get(id).w / 2));
    ids.forEach((id) => cx.set(id, cx.get(id) - minLeft + LANE_PAD));
  }

  const pos = new Map();
  ids.forEach((id) => {
    const s = size.get(id);
    const r = rank.get(id);
    const rowH = Math.max(...rows[r].map((n) => size.get(n).h));
    pos.set(id, {
      id,
      x: cx.get(id) - s.w / 2,
      y: rowY[r] + (rowH - s.h) / 2,
      w: s.w,
      h: s.h,
      text: s.text,
      rank: r,
      lane: laneOf(id),
    });
  });

  const nodesRight = ids.length ? Math.max(...ids.map((id) => pos.get(id).x + pos.get(id).w)) : 0;
  const lanesRight = useLanes ? laneX[laneX.length - 1] + laneWidth[laneWidth.length - 1] : nodesRight + LANE_PAD;

  // Route edges. Each edge tries a few orthogonal routes in order of
  // preference and keeps the first that crosses no other node.
  const boxes = ids.map((id) => pos.get(id));
  const crossings = (points, skip) => {
    let count = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      for (const b of boxes) {
        if (skip.includes(b.id)) continue;
        const left = b.x - 4;
        const right = b.x + b.w + 4;
        const top = b.y - 4;
        const bottom = b.y + b.h + 4;
        const horizontal = y1 === y2;
        if (horizontal && y1 > top && y1 < bottom && Math.max(x1, x2) > left && Math.min(x1, x2) < right) count++;
        if (!horizontal && x1 > left && x1 < right && Math.max(y1, y2) > top && Math.min(y1, y2) < bottom) count++;
      }
    }
    return count;
  };
  const pick = (candidates, skip) => {
    let best = null;
    for (const points of candidates) {
      const c = crossings(points, skip);
      if (c === 0) return points;
      if (!best || c < best.c) best = { points, c };
    }
    return best.points;
  };

  const forwardOut = new Map(ids.map((id) => [id, 0]));
  fwd.forEach((e) => forwardOut.set(e.de, forwardOut.get(e.de) + 1));
  const loopsInto = new Map();
  let loops = 0;
  const routes = edges.map((e) => {
    const s = pos.get(e.de);
    const t = pos.get(e.a);
    const skip = [e.de, e.a];
    if (back.has(e) || t.rank <= s.rank) {
      const lo = Math.min(s.rank, t.rank);
      const hi = Math.max(s.rank, t.rank);
      const span = ids.map((id) => pos.get(id)).filter((p) => p.rank >= lo && p.rank <= hi);
      const loopRight = Math.max(...span.map((p) => p.x + p.w)) + 40 + loops * 26;
      const loopLeft = Math.min(...span.map((p) => p.x)) - 40 - loops * 26;
      loops += 1;
      const n = loopsInto.get(e.a) || 0;
      loopsInto.set(e.a, n + 1);
      const offset = Math.min(t.h / 2 - 8, n * 12);
      const sy = s.y + s.h / 2 + (e.de === e.a ? -12 : 0);
      const ty = t.y + t.h / 2 + (e.de === e.a ? 12 : offset);
      const points = pick(
        [
          [[s.x + s.w, sy], [loopRight, sy], [loopRight, ty], [t.x + t.w, ty]],
          [[s.x, sy], [loopLeft, sy], [loopLeft, ty], [t.x, ty]],
        ],
        skip
      );
      return { edge: e, points };
    }
    const sxc = s.x + s.w / 2;
    const txc = t.x + t.w / 2;
    const dx = txc - sxc;
    const sBottom = s.y + s.h;
    const branching = forwardOut.get(e.de) > 1 || byId.get(e.de).tipo === "decision";
    const straight = [[sxc, sBottom], [sxc, t.y]];
    const sideX = dx < 0 ? s.x : s.x + s.w;
    const side = [[sideX, s.y + s.h / 2], [txc, s.y + s.h / 2], [txc, t.y]];
    const low = [[sxc, sBottom], [sxc, t.y - GAP_Y / 2], [txc, t.y - GAP_Y / 2], [txc, t.y]];
    const high = [[sxc, sBottom], [sxc, sBottom + GAP_Y / 2], [txc, sBottom + GAP_Y / 2], [txc, t.y]];
    let candidates;
    if (Math.abs(dx) <= 8) candidates = [straight, side, low];
    else if (branching) candidates = [side, high, low];
    else candidates = [low, high, side];
    return { edge: e, points: pick(candidates, skip) };
  });

  const routesRight = Math.max(lanesRight, ...routes.flatMap((r) => r.points.map((p) => p[0])));
  return {
    pos,
    routes,
    useLanes,
    lanes: laneIds.map((id, l) => ({ id, nombre: useLanes ? flow.actores[l].nombre : "", x: laneX[l], w: laneWidth[l] })),
    width: routesRight,
    height: graphHeight,
    order: [...ids].sort((a, b) => pos.get(a).rank - pos.get(b).rank || pos.get(a).x - pos.get(b).x),
  };
}

// ---------------------------------------------------------------- excalidraw

function styleFor(step) {
  const t = TYPES[step.tipo] || TYPES.accion;
  const color = step.tipo === "fin" ? END_RESULTS[step.resultado] || END_RESULTS.exito : t.color;
  return { shape: t.shape, color, dashed: t.dashed, dotted: t.dotted, strokeWidth: t.strokeWidth };
}

function renderExcalidraw(flow, opts = {}) {
  const problems = opts.problems || validate(flow);
  const scene = new Scene(flow.id || "flujo");
  const L = layout(flow);
  const sourceName = opts.sourceName || "";

  scene.text("title", 0, 0, `${flow.id} · ${flow.titulo}`, { fontSize: 28 });
  const meta = [flow.funcionalidad.join(", "), `versión ${flow.version}`, flow.estado, sourceName ? `generado desde ${sourceName}` : ""].filter(Boolean).join(" · ");
  scene.text("meta", 0, 42, meta, { fontSize: 14, color: "#495057" });
  let top = 72;
  if (flow.resumen) {
    const t = scene.text("summary", 0, top, flow.resumen, { fontSize: 15, maxChars: 110, color: "#343a40" });
    top += t.height + 12;
  }
  if (flow.disparador) {
    const t = scene.text("trigger", 0, top, "Cuándo empieza: " + flow.disparador, { fontSize: 15, maxChars: 110, color: "#343a40" });
    top += t.height + 12;
  }
  if (problems.errors.length) {
    const shown = problems.errors.slice(0, 6).map((e) => "• " + e);
    if (problems.errors.length > 6) shown.push(`… y ${problems.errors.length - 6} más`);
    const lines = ["⚠ Este flujo tiene problemas y no sirve todavía como contrato:", ...shown].join("\n");
    const box = scene.box("problems", 0, top + 6, 900, 30 + wrap(lines, 100).length * 19, lines, {
      color: COLORS.red,
      fontSize: 14,
      align: "left",
      valign: "top",
    });
    top = box.y + box.height + 12;
  }

  const GX = 0;
  const GY = top + (L.useLanes ? 90 : 50);
  if (L.useLanes) {
    L.lanes.forEach((lane, i) => {
      scene.zone("lane-" + i, GX + lane.x, GY - 60, lane.w, L.height + 100, null, { color: i % 2 ? { bg: "#f1f3f5", stroke: "#ced4da" } : { bg: "#f8f9fa", stroke: "#ced4da" } });
      scene.text("lane-" + i + "-title", GX + lane.x + 14, GY - 50, lane.nombre, { fontSize: 17, color: "#343a40" });
    });
  }

  const steps = new Map(flow.pasos.map((p) => [p.id, p]));
  const nodeId = (id) => "n-" + id;
  for (const id of L.order) {
    const p = L.pos.get(id);
    const step = steps.get(id);
    const st = styleFor(step);
    scene.box(nodeId(id), GX + p.x, GY + p.y, p.w, p.h, p.text, {
      shape: st.shape,
      color: st.color,
      dashed: st.dashed,
      dotted: st.dotted,
      strokeWidth: st.strokeWidth,
      fontSize: FONT_SIZE,
    });
    scene.text("tag-" + id, GX + p.x, GY + p.y - 18, "#" + id, { fontSize: 12, color: "#868e96" });
  }

  L.routes.forEach((r, i) => {
    const e = r.edge;
    const color = e.tipo === "error" ? "#e03131" : e.tipo === "espera" ? "#495057" : "#1e1e1e";
    scene.arrow("e-" + i, nodeId(e.de), nodeId(e.a), r.points.map(([x, y]) => [GX + x, GY + y]), {
      label: e.condicion || undefined,
      color,
      dashed: e.tipo === "error",
      dotted: e.tipo === "espera",
    });
  });

  // Side panel: acceptance criteria, open questions, legend.
  const panelX = GX + L.width + 80;
  let panelY = GY - (L.useLanes ? 60 : 0);
  const panel = [];
  panel.push("CRITERIOS DE ACEPTACIÓN");
  if (flow.criterios.length) flow.criterios.forEach((c) => panel.push("✓ " + c));
  else panel.push("(todavía no hay criterios)");
  if (flow.preguntas_abiertas.length) {
    panel.push("", "PREGUNTAS ABIERTAS");
    flow.preguntas_abiertas.forEach((q) => panel.push("? " + q));
  }
  const panelText = panel.join("\n");
  const panelLines = wrap(panelText, 58);
  const panelBox = scene.box("panel", panelX, panelY, 520, panelLines.length * FONT_SIZE * LINE_H + 40, panelText, {
    color: flow.preguntas_abiertas.length ? COLORS.red : COLORS.note,
    fontSize: FONT_SIZE,
    align: "left",
    valign: "top",
    pad: 20,
  });
  panelY = panelBox.y + panelBox.height + 30;
  scene.text("legend-title", panelX, panelY, "LEYENDA", { fontSize: 14, color: "#495057" });
  panelY += 26;
  const usedTypes = Object.keys(TYPES).filter((t) => flow.pasos.some((p) => p.tipo === t));
  const legend = [];
  for (const t of usedTypes) {
    if (t === "fin") {
      for (const res of Object.keys(END_RESULTS)) if (flow.pasos.some((p) => p.tipo === "fin" && (p.resultado || "exito") === res)) legend.push(["fin-" + res, END_LABELS[res], { shape: "ellipse", color: END_RESULTS[res] }]);
    } else {
      const st = TYPES[t];
      legend.push([t, st.label, { shape: st.shape, color: st.color, dashed: st.dashed, dotted: st.dotted, strokeWidth: st.strokeWidth }]);
    }
  }
  legend.forEach(([key, label, st], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    scene.box("legend-" + key, panelX + col * 260, panelY + row * 60, 240, 46, label, { ...st, fontSize: 13 });
  });
  if (flow.transiciones.some((e) => e.tipo === "error")) {
    const row = Math.ceil(legend.length / 2);
    scene.arrow("legend-error", null, null, [[panelX, panelY + row * 60 + 20], [panelX + 120, panelY + row * 60 + 20]], { color: "#e03131", dashed: true });
    scene.text("legend-error-label", panelX + 132, panelY + row * 60 + 10, "camino de error", { fontSize: 13, color: "#e03131" });
  }
  return scene;
}

// ---------------------------------------------------------------- markdown

function mermaidId(id) {
  return "n_" + id.replace(/[^A-Za-z0-9_]/g, "_");
}

function mermaidText(text) {
  return String(text).replace(/"/g, "#quot;").replace(/</g, "#lt;").replace(/>/g, "#gt;").replace(/\n/g, "<br/>");
}

const MERMAID_SHAPES = {
  inicio: (t) => `(["${t}"])`,
  fin: (t) => `(["${t}"])`,
  pantalla: (t) => `[/"${t}"/]`,
  accion: (t) => `("${t}")`,
  decision: (t) => `{"${t}"}`,
  datos: (t) => `[("${t}")]`,
  externo: (t) => `{{"${t}"}}`,
  espera: (t) => `>"${t}"]`,
  subflujo: (t) => `[["${t}"]]`,
};

function mermaid(flow) {
  const { byId, edges } = graph(flow);
  const lines = ["flowchart TD"];
  const node = (p) => `${mermaidId(p.id)}${(MERMAID_SHAPES[p.tipo] || MERMAID_SHAPES.accion)(mermaidText(nodeText(p)))}`;
  const steps = [...byId.values()];
  if (flow.actores.length >= 2) {
    flow.actores.forEach((a, i) => {
      const inLane = steps.filter((p) => p.actor === a.id);
      if (!inLane.length) return;
      lines.push(`  subgraph lane_${i}["${mermaidText(a.nombre)}"]`);
      lines.push("    direction TB");
      inLane.forEach((p) => lines.push("    " + node(p)));
      lines.push("  end");
    });
    steps.filter((p) => !flow.actores.some((a) => a.id === p.actor)).forEach((p) => lines.push("  " + node(p)));
  } else {
    steps.forEach((p) => lines.push("  " + node(p)));
  }
  const errorLinks = [];
  edges.forEach((e, i) => {
    const arrow = e.tipo === "normal" ? "-->" : "-.->";
    const label = e.condicion ? `|"${mermaidText(e.condicion)}"|` : "";
    lines.push(`  ${mermaidId(e.de)} ${arrow}${label} ${mermaidId(e.a)}`);
    if (e.tipo === "error") errorLinks.push(i);
  });
  const classes = {
    inicio: "fill:#b2f2bb,stroke:#2f9e44,color:#1e1e1e",
    fin: "fill:#d3f9d8,stroke:#2f9e44,color:#1e1e1e",
    finError: "fill:#ffc9c9,stroke:#e03131,color:#1e1e1e",
    finCancelado: "fill:#e9ecef,stroke:#868e96,color:#1e1e1e",
    pantalla: "fill:#a5d8ff,stroke:#1971c2,color:#1e1e1e",
    accion: "fill:#fff3bf,stroke:#f08c00,color:#1e1e1e",
    decision: "fill:#ffd8a8,stroke:#e8590c,color:#1e1e1e",
    datos: "fill:#e5dbff,stroke:#7048e8,color:#1e1e1e",
    externo: "fill:#c3fae8,stroke:#0c8599,color:#1e1e1e,stroke-dasharray:5 3",
    espera: "fill:#e9ecef,stroke:#495057,color:#1e1e1e,stroke-dasharray:2 2",
    subflujo: "fill:#fcc2d7,stroke:#c2255c,color:#1e1e1e,stroke-width:3px",
  };
  const used = new Map();
  for (const p of steps) {
    let cls = TYPES[p.tipo] ? p.tipo : "accion";
    if (p.tipo === "fin" && p.resultado === "error") cls = "finError";
    if (p.tipo === "fin" && p.resultado === "cancelado") cls = "finCancelado";
    if (!used.has(cls)) used.set(cls, []);
    used.get(cls).push(mermaidId(p.id));
  }
  for (const [cls, members] of used) {
    lines.push(`  classDef ${cls} ${classes[cls]}`);
    lines.push(`  class ${members.join(",")} ${cls}`);
  }
  if (errorLinks.length) lines.push(`  linkStyle ${errorLinks.join(",")} stroke:#e03131,color:#e03131`);
  return lines.join("\n");
}

function mdEscape(text) {
  return String(text).replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function bullets(items) {
  return items.map((i) => `- ${i}`).join("\n");
}

function renderMarkdown(flow, opts = {}) {
  const problems = opts.problems || validate(flow);
  const sourceName = opts.sourceName || `${flow.id}.flow.json`;
  const excalidrawName = opts.excalidrawName || sourceName.replace(/\.flow\.json$/, ".excalidraw");
  const L = layout(flow);
  const steps = new Map(flow.pasos.map((p) => [p.id, p]));
  const actorName = new Map(flow.actores.map((a) => [a.id, a.nombre]));
  const out = [];

  out.push(`<!-- Generado por orquesta desde ${sourceName}. No lo edites a mano: edita el .flow.json y se regenera. -->`);
  out.push(`# ${flow.id} · ${flow.titulo}`);
  out.push("");
  out.push("| Funcionalidad | Versión | Estado | Actores |");
  out.push("| --- | --- | --- | --- |");
  out.push(`| ${flow.funcionalidad.join(", ") || "—"} | ${flow.version} | ${flow.estado} | ${flow.actores.map((a) => a.nombre).join(", ") || "—"} |`);
  out.push("");
  if (problems.errors.length) {
    out.push("> **⚠ Este flujo tiene problemas y todavía no sirve como contrato:**");
    problems.errors.forEach((e) => out.push(`> - ${e}`));
    out.push("");
  }
  if (flow.resumen) out.push(flow.resumen, "");
  if (flow.disparador) out.push(`**Cuándo empieza:** ${flow.disparador}`, "");
  if (flow.precondiciones.length) out.push("**Antes de empezar:**", "", bullets(flow.precondiciones), "");
  if (flow.postcondiciones.length) out.push("**Al terminar:**", "", bullets(flow.postcondiciones), "");

  out.push("## Diagrama", "", "```mermaid", mermaid(flow), "```", "");
  out.push(`Mapa visual editable: [${excalidrawName}](${encodeURI(excalidrawName)})`, "");

  out.push("## Paso a paso", "");
  const outgoing = (id) => flow.transiciones.filter((e) => e.de === id && steps.has(e.a));
  L.order.forEach((id, i) => {
    const p = steps.get(id);
    const type = p.tipo === "fin" ? END_LABELS[p.resultado] || "Fin" : (TYPES[p.tipo] || {}).label || p.tipo;
    out.push(`### ${i + 1}. ${p.texto} · \`${flow.id}:${p.id}\``);
    out.push("");
    const metaLine = [`*${type}*`];
    if (p.actor) metaLine.push(`Actor: ${actorName.get(p.actor) || p.actor}`);
    if (p.tipo === "subflujo" && p.flujo) metaLine.push(`Continúa en: ${p.flujo}`);
    out.push(metaLine.join(" · "));
    out.push("");
    if (p.detalle) out.push(p.detalle, "");
    const facts = [];
    if (p.ve) facts.push(`- **Lo que ve la persona:** ${p.ve}`);
    if (p.reglas.length) facts.push(`- **Reglas:** ${p.reglas.join(" · ")}`);
    if (p.datos.length) facts.push(`- **Información que usa o guarda:** ${p.datos.join(" · ")}`);
    if (p.si_falla.length) facts.push(`- **Si algo sale mal:** ${p.si_falla.join(" · ")}`);
    if (p.notas) facts.push(`- **Notas:** ${p.notas}`);
    const next = outgoing(id).map((e) => `\`${e.a}\`${e.condicion ? ` (${e.condicion})` : ""}${e.tipo === "error" ? " ⚠" : ""}`);
    if (next.length) facts.push(`- **Siguiente:** ${next.join(" · ")}`);
    if (facts.length) out.push(facts.join("\n"), "");
  });

  if (flow.transiciones.length) {
    out.push("## Transiciones", "", "| De | A | Condición | Tipo |", "| --- | --- | --- | --- |");
    flow.transiciones.forEach((e) => out.push(`| \`${e.de}\` | \`${e.a}\` | ${mdEscape(e.condicion) || "—"} | ${e.tipo} |`));
    out.push("");
  }
  out.push("## Criterios de aceptación", "");
  out.push(flow.criterios.length ? flow.criterios.map((c, i) => `- [ ] **CA${i + 1}.** ${c}`).join("\n") : "_Todavía no hay criterios._");
  out.push("");
  if (flow.preguntas_abiertas.length) out.push("## Preguntas abiertas", "", bullets(flow.preguntas_abiertas), "");
  if (problems.warnings.length) out.push("## Detalles por completar", "", bullets(problems.warnings), "");
  if (flow.cambios.length) {
    out.push("## Historial de cambios", "", "| Versión | Fecha | Cambio |", "| --- | --- | --- |");
    flow.cambios.forEach((c) => out.push(`| ${c.version} | ${c.fecha} | ${mdEscape(c.cambio)} |`));
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------- files

function outputsFor(file) {
  const base = file.replace(/\.flow\.json$/, "");
  return { md: base + ".md", excalidraw: base + ".excalidraw" };
}

function writeIfChanged(file, content) {
  try {
    if (fs.readFileSync(file, "utf8") === content) return false;
  } catch (err) {
    // new file
  }
  fs.writeFileSync(file, content);
  return true;
}

// Validates one .flow.json and writes its .md and .excalidraw next to it.
function generate(file) {
  const { flow, parseError } = loadFlow(file);
  if (parseError) return { file, errors: [parseError], warnings: [], written: [] };
  const problems = validate(flow);
  const outputs = outputsFor(file);
  const sourceName = path.basename(file);
  const written = [];
  if (writeIfChanged(outputs.md, renderMarkdown(flow, { problems, sourceName, excalidrawName: path.basename(outputs.excalidraw) }))) written.push(outputs.md);
  if (writeIfChanged(outputs.excalidraw, renderExcalidraw(flow, { problems, sourceName }).serialize())) written.push(outputs.excalidraw);
  return { file, id: flow.id, errors: problems.errors, warnings: problems.warnings, written };
}

function listFlowFiles(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".flow.json"))
      .sort()
      .map((f) => path.join(dir, f));
  } catch (err) {
    return [];
  }
}

// Builds INDEX.md for a directory of flows, with cross-flow checks.
function buildIndex(dir) {
  const rows = [];
  const problems = [];
  const ids = new Map();
  const refs = [];
  for (const file of listFlowFiles(dir)) {
    const { flow, parseError } = loadFlow(file);
    const name = path.basename(file);
    if (parseError) {
      problems.push(parseError);
      rows.push({ name, flow: null, errors: 1 });
      continue;
    }
    const v = validate(flow);
    if (ids.has(flow.id)) problems.push(`El id ${flow.id} se repite en ${ids.get(flow.id)} y ${name}.`);
    else ids.set(flow.id, name);
    flow.pasos.filter((p) => p.tipo === "subflujo" && p.flujo).forEach((p) => refs.push({ from: flow.id, to: p.flujo, name, step: p.id }));
    rows.push({ name, flow, errors: v.errors.length, warnings: v.warnings.length });
  }
  for (const r of refs) if (!ids.has(r.to)) problems.push(`${r.name}: el paso «${r.step}» remite a ${r.to}, que no existe.`);

  const out = ["<!-- Generado por orquesta. No lo edites a mano. -->", "# Índice de flujos", ""];
  if (!rows.length) out.push("_Todavía no hay flujos._", "");
  else {
    out.push("| Flujo | Funcionalidad | Estado | Versión | Pasos | Problemas | Archivos |", "| --- | --- | --- | --- | --- | --- | --- |");
    for (const r of rows) {
      const base = r.name.replace(/\.flow\.json$/, "");
      const files = `[ficha](${encodeURI(base + ".md")}) · [mapa](${encodeURI(base + ".excalidraw")}) · [fuente](${encodeURI(r.name)})`;
      if (!r.flow) out.push(`| ${r.name} | — | — | — | — | JSON inválido | ${files} |`);
      else out.push(`| ${r.flow.id} · ${mdEscape(r.flow.titulo)} | ${r.flow.funcionalidad.join(", ") || "—"} | ${r.flow.estado} | ${r.flow.version} | ${r.flow.pasos.length} | ${r.errors ? r.errors + " errores" : "—"} | ${files} |`);
    }
    out.push("");
    const valid = rows.filter((r) => r.flow);
    if (valid.length) {
      out.push("## Mapa de flujos", "", "```mermaid", "flowchart LR");
      valid.forEach((r) => out.push(`  ${r.flow.id}["${mermaidText(r.flow.id + " · " + r.flow.titulo)}"]`));
      refs.filter((r) => ids.has(r.to)).forEach((r) => out.push(`  ${r.from} --> ${r.to}`));
      out.push("```", "");
    }
  }
  if (problems.length) out.push("## Problemas entre flujos", "", bullets(problems), "");
  return { markdown: out.join("\n").trimEnd() + "\n", problems };
}

function writeIndex(dir) {
  const { markdown, problems } = buildIndex(dir);
  const file = path.join(dir, "INDEX.md");
  const changed = writeIfChanged(file, markdown);
  return { file, problems, written: changed ? [file] : [] };
}

module.exports = {
  TYPES,
  STATES,
  normalize,
  loadFlow,
  validate,
  layout,
  mermaid,
  renderMarkdown,
  renderExcalidraw,
  generate,
  buildIndex,
  writeIndex,
  listFlowFiles,
  outputsFor,
};
