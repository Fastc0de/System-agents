#!/usr/bin/env node
"use strict";
// PostToolUse on Agent (and SendMessage, when a subagent is resumed), in the
// main conversation: after a subagent returns, reminds the orchestrator of the
// next gate so no step is skipped, and counts review failures per work package
// to enforce the two-cycle limit.

const fs = require("fs");
const os = require("os");
const path = require("path");
const c = require("./lib/comun");

const MAX_FIX_CYCLES = 2;

function responseText(response) {
  if (typeof response === "string") return response;
  try {
    return JSON.stringify(response);
  } catch (err) {
    return "";
  }
}

function stateFile(input) {
  const id = String(input.session_id || "x").replace(/[^A-Za-z0-9_-]/g, "");
  return path.join(os.tmpdir(), `orquesta-sesion-${id}.json`);
}

function readState(input) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(input), "utf8"));
  } catch (err) {
    return { fails: {} };
  }
}

function writeState(input, state) {
  try {
    fs.writeFileSync(stateFile(input), JSON.stringify(state));
  } catch (err) {
    // best effort
  }
}

function wpOf(text) {
  const m = String(text).match(/WP-\d{3,}/);
  return m ? m[0] : null;
}

// A resumed subagent (SendMessage) carries no subagent_type: recognize it by
// the report block it returned.
const REPORT_OF = [
  [/##\s*BUILD REPORT\b/, "builder-frontend"],
  [/##\s*REVIEW VERDICT\b/, "reviewer"],
  [/##\s*EVALUATION VERDICT\b/, "jefe-de-pruebas"],
  [/##\s*ARCHITECT REPORT\b/, "arquitecto"],
  [/##\s*DESIGN REPORT\b/, "disenador"],
];

function targetOf(args, out) {
  if (args.subagent_type) return String(args.subagent_type).split(":").pop();
  const hit = REPORT_OF.find(([re]) => re.test(out));
  return hit ? hit[1] : "";
}

const NO_REPORT = "Si lo lanzaste en segundo plano, espera su resultado antes de seguir; si terminó sin reporte, retómalo con SendMessage y pídeselo.";

function reminder(input) {
  if (input.agent_id) return null; // inside a subagent (the test lead launching testers)
  const caller = c.roleOf(input.agent_type);
  if (input.agent_type && caller !== "orquestador") return null;
  const args = input.tool_input || {};
  const out = responseText(input.tool_response).replace(/\\n/g, "\n");
  const target = targetOf(args, out);
  const wp = wpOf(args.prompt || args.message || "") || wpOf(out);

  if (c.BUILDERS.includes(target)) {
    const status = (out.match(/Status:\s*(done|blocked|product-gap|contract-gap|design-gap|scope-gap)/i) || [])[1];
    switch ((status || "").toLowerCase()) {
      case "done":
        return `${wp || "El paquete"} no está hecho todavía: delega en orquesta:reviewer con la ruta del WP y este BUILD REPORT (si otro WP sigue abierto en paralelo, nómbralo en el brief). No lo marques como hecho ni hagas commit antes de un PASS. Si el builder dejó «Textos nuevos», añádelos a docs/producto/4-experiencia/pantallas.md.`;
      case "design-gap":
        return "El builder necesita algo que el sistema de diseño no cubre. Delega en orquesta:disenador en modo ajuste con su pregunta exacta (sin cambiar lo ya aprobado salvo que haga falta) y retoma al mismo builder con SendMessage cuando el diseño esté actualizado.";
      case "product-gap":
        return "El builder se detuvo por una duda de producto. Pregúntasela a la persona en lenguaje simple (sin jerga, con opciones y tu recomendación), actualiza docs/producto (sube la versión si el flujo estaba aprobado) y retoma al mismo builder con SendMessage.";
      case "contract-gap":
      case "scope-gap":
        return "El builder necesita un cambio de contrato o de alcance: delega en orquesta:arquitecto para ajustar docs/tecnico (contrato, zonas o plan) y luego retoma al builder con SendMessage.";
      case "blocked":
        return "El builder está bloqueado por algo ajeno al paquete. Decide: pide al arquitecto un paquete que lo resuelva o, si requiere una decisión de la persona, explícaselo en simple.";
      default:
        return "El builder no entregó un BUILD REPORT legible. " + NO_REPORT;
    }
  }

  if (target === "reviewer") {
    const verdict = (out.match(/Verdict:\s*(PASS|FAIL)/) || [])[1];
    if (verdict === "PASS") {
      return `PASS. Actualiza ${wp || "el WP"} a «hecho» en docs/tecnico/trabajo/PLAN.md y guarda solo este paquete: si otro WP sigue abierto (en paralelo o pendiente de corrección), \`git add -- <cada archivo de «Archivos del paquete» del reviewer> docs/tecnico/trabajo/PLAN.md\`; si es el único abierto, \`git add -A\`. Después \`git commit -m "${wp || "WP-xxx"}: …"\`. Si era el último paquete de la fase, delega la evaluación de fase en orquesta:jefe-de-pruebas.`;
    }
    if (verdict === "FAIL") {
      const state = readState(input);
      const key = wp || "sin-id";
      state.fails[key] = (state.fails[key] || 0) + 1;
      writeState(input, state);
      if (state.fails[key] >= MAX_FIX_CYCLES) {
        return `FAIL n.º ${state.fails[key]} para ${key}: se alcanzó el límite de ${MAX_FIX_CYCLES} ciclos de corrección. Escala: pide al arquitecto que replanifique el paquete o, si es un hueco de producto, resuélvelo con la persona antes de seguir.`;
      }
      return `FAIL n.º ${state.fails[key]} para ${key}. Retoma al mismo builder con SendMessage y pásale los hallazgos numerados del reviewer. Máximo ${MAX_FIX_CYCLES} ciclos por paquete.`;
    }
    return "El reviewer no entregó un veredicto legible (Verdict: PASS o FAIL). " + NO_REPORT;
  }

  if (target === "jefe-de-pruebas") {
    const verdict = (out.match(/Verdict:\s*(PASA CON OBSERVACIONES|PASA|NO PASA)/) || [])[1];
    if (verdict === "NO PASA") {
      return "La fase NO PASA. Delega en orquesta:arquitecto la creación de paquetes de corrección para cada FALLO bloqueante o mayor (el registro ya tiene la prueba que lo demuestra), constrúyelos con su ciclo builder → reviewer y vuelve a pedir al jefe de pruebas una re-prueba de esos FALLO. Cuéntale a la persona, en simple, qué falló y que se está corrigiendo.";
    }
    if (verdict) {
      return "La fase pasa. Ciérrala: (1) sincroniza la memoria con la skill memoria (`sync`) usando la evidencia del reviewer y del jefe de pruebas; (2) presenta a la persona el informe para ti en lenguaje simple, con capturas y cómo probarlo; (3) actualiza docs/producto/estado.json y el plan de fases, y haz commit; (4) integra la fase en la rama base: `git switch <rama_base>` y `git merge --no-ff <rama de la fase> -m \"Fase N: …\"`; (5) sigue el modo de construcción: en «por fases», espera su luz verde y crea la rama de la fase siguiente desde la rama base.";
    }
    return "El jefe de pruebas no entregó un veredicto legible. " + NO_REPORT;
  }

  if (target === "disenador") {
    const mode = (out.match(/Modo:\s*(direcciones|sistema|ajuste)/i) || [])[1];
    switch ((mode || "").toLowerCase()) {
      case "direcciones":
        return "Muestra a la persona docs/diseno/direcciones.html (que lo abra con doble clic en su navegador). Cuéntale cada dirección en dos líneas, con tu recomendación, y pregúntale cuál prefiere o qué mezcla quiere, junto con las opciones de experiencia. Anota la elección en la sección Estilo de docs/producto/4-experiencia/pantallas.md y pide al diseñador el modo sistema.";
      case "sistema":
        return "Muestra a la persona docs/diseno/referencia.html: puede navegar entre pantallas como si usara la app. Pregúntale «¿Se siente como la imaginas?». Los cambios van al diseñador en modo ajuste; con su sí, aprueba la etapa 4.";
      case "ajuste":
        return "El diseño cambió. Si ya hay código, pide al arquitecto los WPs de frontend para las pantallas y componentes afectados (sin tocar backend ni contrato) y constrúyelos con su ciclo builder → reviewer. Si un builder esperaba este ajuste, retómalo con SendMessage.";
      default:
        return "El diseñador no entregó un DESIGN REPORT legible. " + NO_REPORT;
    }
  }

  if (target === "arquitecto") {
    return "Antes de construir, verifica la cobertura: cada funcionalidad aprobada y cada criterio tienen paquete y prueba prevista en docs/tecnico, y cada paso de cada flujo aprobado está cubierto por algún WP. Luego da a la persona el resumen de 5 líneas en lenguaje simple.";
  }
  return null;
}

if (require.main === module) {
  c.readInput().then((input) => {
    try {
      const text = input && reminder(input);
      if (!text) return c.allow();
      return c.emit({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "[orquesta] " + text } });
    } catch (err) {
      return c.allow();
    }
  });
}

module.exports = { reminder };
