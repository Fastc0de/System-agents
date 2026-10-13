"use strict";
// Minimal, deterministic Excalidraw scene builder.
// The same input always produces byte-identical output, so generated
// diagrams diff cleanly in git.

const FONT = 2; // Helvetica ("Normal" in Excalidraw)
const CHAR_W = 0.56; // average character width relative to font size
const LINE_H = 1.25;

const COLORS = {
  yellow: { bg: "#ffec99", stroke: "#f08c00" },
  purple: { bg: "#d0bfff", stroke: "#6741d9" },
  lavender: { bg: "#e5dbff", stroke: "#7048e8" },
  blue: { bg: "#a5d8ff", stroke: "#1971c2" },
  green: { bg: "#b2f2bb", stroke: "#2f9e44" },
  lightGreen: { bg: "#d3f9d8", stroke: "#2f9e44" },
  orange: { bg: "#ffd8a8", stroke: "#e8590c" },
  gray: { bg: "#e9ecef", stroke: "#495057" },
  red: { bg: "#ffc9c9", stroke: "#e03131" },
  teal: { bg: "#c3fae8", stroke: "#0c8599" },
  softYellow: { bg: "#fff3bf", stroke: "#f08c00" },
  pink: { bg: "#fcc2d7", stroke: "#c2255c" },
  note: { bg: "#fff9db", stroke: "#fab005" },
  zone: { bg: "#f8f9fa", stroke: "#adb5bd" },
  white: { bg: "#ffffff", stroke: "#495057" },
};

function hash(text) {
  let h = 2166136261;
  for (const c of text) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2147483646) + 1;
}

// Wraps text to lines of at most maxChars, honoring explicit newlines.
function wrap(text, maxChars) {
  const out = [];
  for (const paragraph of String(text).split("\n")) {
    if (!paragraph.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if ((line + " " + word).length <= maxChars) line += " " + word;
      else {
        out.push(line);
        line = word;
      }
      while (line.length > maxChars) {
        out.push(line.slice(0, maxChars));
        line = line.slice(maxChars);
      }
    }
    out.push(line);
  }
  return out;
}

function measure(lines, fontSize) {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return { w: Math.ceil(longest * fontSize * CHAR_W), h: Math.ceil(lines.length * fontSize * LINE_H) };
}

// Usable text width as a fraction of the shape width.
const INNER = { rectangle: 1, ellipse: 0.74, diamond: 0.58 };

function maxCharsFor(shape, width, fontSize, pad) {
  return Math.max(6, Math.floor((width * (INNER[shape] || 1) - pad * 2) / (fontSize * CHAR_W)));
}

class Scene {
  constructor(name) {
    this.name = name;
    this.elements = [];
    this.byId = new Map();
  }

  base(id, type, x, y, width, height, o = {}) {
    if (this.byId.has(id)) throw new Error("duplicate element id " + id);
    let roundness = null;
    if (o.round !== false) {
      if (type === "rectangle") roundness = { type: 3 };
      else if (type === "diamond") roundness = { type: 2 };
    }
    const el = {
      id,
      type,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      angle: 0,
      strokeColor: o.stroke || "#1e1e1e",
      backgroundColor: o.bg || "transparent",
      fillStyle: "solid",
      strokeWidth: o.strokeWidth || 2,
      strokeStyle: o.dashed ? "dashed" : o.dotted ? "dotted" : "solid",
      roughness: o.roughness === undefined ? 1 : o.roughness,
      opacity: 100,
      groupIds: o.groupIds || [],
      frameId: null,
      roundness,
      seed: hash(this.name + ":" + id),
      version: 1,
      versionNonce: hash("nonce:" + this.name + ":" + id),
      isDeleted: false,
      boundElements: [],
      updated: 1,
      link: null,
      locked: false,
    };
    this.elements.push(el);
    this.byId.set(id, el);
    return el;
  }

  textLines(id, x, y, lines, o = {}) {
    const fontSize = o.fontSize || 16;
    const m = measure(lines, fontSize);
    const el = this.base(id, "text", x, y, m.w, m.h, {
      stroke: o.color || "#1e1e1e",
      strokeWidth: 1,
      roughness: 0,
      round: false,
      groupIds: o.groupIds,
    });
    Object.assign(el, {
      text: lines.join("\n"),
      fontSize,
      fontFamily: FONT,
      textAlign: o.align || "left",
      verticalAlign: o.valign || "top",
      containerId: o.containerId || null,
      originalText: o.originalText !== undefined ? o.originalText : lines.join("\n"),
      autoResize: true,
      lineHeight: LINE_H,
    });
    return el;
  }

  text(id, x, y, str, o = {}) {
    const lines = o.maxChars ? wrap(str, o.maxChars) : String(str).split("\n");
    return this.textLines(id, x, y, lines, o);
  }

  // A shape with bound, wrapped text.
  box(id, x, y, width, height, str, o = {}) {
    const shape = o.shape || "rectangle";
    const color = o.color || COLORS.gray;
    const el = this.base(id, shape, x, y, width, height, {
      bg: color.bg,
      stroke: color.stroke,
      dashed: o.dashed,
      dotted: o.dotted,
      strokeWidth: o.strokeWidth,
      roughness: o.roughness,
      groupIds: o.groupIds,
    });
    if (str) {
      const fontSize = o.fontSize || 16;
      const pad = o.pad === undefined ? 14 : o.pad;
      const lines = wrap(str, maxCharsFor(shape, width, fontSize, pad));
      const m = measure(lines, fontSize);
      const align = o.align || "center";
      const valign = o.valign || "middle";
      const tx = align === "left" ? x + pad : x + (width - m.w) / 2;
      const ty = valign === "top" ? y + pad : y + (height - m.h) / 2;
      const t = this.textLines(id + "-t", tx, ty, lines, {
        fontSize,
        align,
        valign,
        containerId: id,
        originalText: str,
        color: o.textColor,
        groupIds: o.groupIds,
      });
      el.boundElements.push({ type: "text", id: t.id });
    }
    return el;
  }

  // Background area with an optional title in its top-left corner.
  zone(id, x, y, width, height, title, o = {}) {
    const color = o.color || COLORS.zone;
    const el = this.base(id, "rectangle", x, y, width, height, {
      bg: color.bg,
      stroke: color.stroke,
      dashed: o.dashed !== false,
      roughness: 0,
      strokeWidth: 1,
    });
    if (title) this.text(id + "-title", x + 16, y + 12, title, { fontSize: o.fontSize || 16, color: color.stroke });
    return el;
  }

  line(id, points, o = {}) {
    const x0 = points[0][0];
    const y0 = points[0][1];
    const rel = points.map(([x, y]) => [Math.round(x - x0), Math.round(y - y0)]);
    const xs = rel.map((p) => p[0]);
    const ys = rel.map((p) => p[1]);
    const el = this.base(id, "line", x0, y0, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), {
      stroke: o.color || "#868e96",
      strokeWidth: o.strokeWidth || 1,
      roughness: 0,
      round: false,
    });
    Object.assign(el, { points: rel, lastCommittedPoint: null, startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: null });
    return el;
  }

  // points: absolute [[x, y], ...]. from/to: element ids or null.
  arrow(id, from, to, points, o = {}) {
    const x0 = points[0][0];
    const y0 = points[0][1];
    const rel = points.map(([x, y]) => [Math.round(x - x0), Math.round(y - y0)]);
    const xs = rel.map((p) => p[0]);
    const ys = rel.map((p) => p[1]);
    const el = this.base(id, "arrow", x0, y0, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), {
      stroke: o.color || "#1e1e1e",
      dashed: o.dashed,
      dotted: o.dotted,
      strokeWidth: o.strokeWidth || 2,
      round: false,
    });
    Object.assign(el, {
      points: rel,
      lastCommittedPoint: null,
      startBinding: from ? { elementId: from, focus: 0, gap: 4 } : null,
      endBinding: to ? { elementId: to, focus: 0, gap: 4 } : null,
      startArrowhead: o.both ? "arrow" : null,
      endArrowhead: "arrow",
      elbowed: false,
    });
    if (from) this.byId.get(from).boundElements.push({ type: "arrow", id });
    if (to) this.byId.get(to).boundElements.push({ type: "arrow", id });
    if (o.label) {
      // Same placement rule Excalidraw uses for arrow labels.
      let mx;
      let my;
      if (points.length % 2 === 1) {
        [mx, my] = points[Math.floor(points.length / 2)];
      } else {
        const i = points.length / 2 - 1;
        mx = (points[i][0] + points[i + 1][0]) / 2;
        my = (points[i][1] + points[i + 1][1]) / 2;
      }
      const fontSize = o.fontSize || 14;
      const lines = wrap(o.label, o.labelChars || 22);
      const m = measure(lines, fontSize);
      const t = this.textLines(id + "-label", mx - m.w / 2, my - m.h / 2, lines, {
        fontSize,
        align: "center",
        valign: "middle",
        containerId: id,
        originalText: o.label,
        color: o.color || "#1e1e1e",
      });
      el.boundElements.push({ type: "text", id: t.id });
    }
    return el;
  }

  toJSON() {
    return {
      type: "excalidraw",
      version: 2,
      source: "https://excalidraw.com",
      elements: this.elements,
      appState: { viewBackgroundColor: "#ffffff", gridSize: null },
      files: {},
    };
  }

  serialize() {
    return JSON.stringify(this.toJSON(), null, 2) + "\n";
  }
}

const anchor = {
  top: (b, dx = 0) => [b.x + b.width / 2 + dx, b.y],
  bottom: (b, dx = 0) => [b.x + b.width / 2 + dx, b.y + b.height],
  left: (b, dy = 0) => [b.x, b.y + b.height / 2 + dy],
  right: (b, dy = 0) => [b.x + b.width, b.y + b.height / 2 + dy],
};

module.exports = { Scene, COLORS, anchor, wrap, measure, maxCharsFor, CHAR_W, LINE_H, hash };
