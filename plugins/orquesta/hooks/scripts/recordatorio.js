#!/usr/bin/env node
"use strict";
// PostToolUse on Agent, in the main conversation: after a subagent returns,
// reminds the orchestrator of the next gate so no step is skipped, and counts
// review failures per work package to enforce the two-cycle limit.

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

function reminder(input) {
  if (input.agent_id) return null; // inside a subagent (the test lead launching testers)
  const caller = c.roleOf(input.agent_type);
  if (input.agent_type && caller !== "orquestador") return null;
  const args = input.tool_input || {};
  const target = String(args.subagent_type || "").split(":").pop();
  const out = responseText(input.tool_response);
  const wp = wpOf(args.prompt || "") || wpOf(out);

  if (c.BUILDERS.includes(target)) {
    const status = (out.match(/Status:\s*(done|blocked|product-gap|contract-gap|scope-gap)/i) || [])[1];
    switch ((status || "").toLowerCase()) {
      case "done":
        return `${wp || "El paquete"} no está hecho todavía: delega en orquesta:reviewer con la ruta del WP y este BUILD REPORT. No lo marques como hecho ni hagas commit antes de un PASS.`;
      case "product-gap":
        return "El builder se detuvo por una duda de producto. Pregúntasela a la persona en lenguaje simple (sin jerga, con opciones y tu recomendación), actualiza docs/producto (sube la versión si el flujo estaba aprobado) y retoma al mismo builder con SendMessage.";
      case "contract-gap":
      case "scope-gap":
        return "El builder necesita un cambio de contrato o de alcance: delega en orquesta:arquitecto para ajustar docs/tecnico (contrato, zonas o plan) y luego retoma al builder con SendMessage.";
      case "blocked":
        return "El builder está bloqueado por algo ajeno al paquete. Decide: pide al arquitecto un paquete que lo resuelva o, si requiere una decisión de la persona, explícaselo en simple.";
      default:
        return "El builder no entregó un BUILD REPORT legible. Retómalo con SendMessage y pídele el reporte completo.";
    }
  }

  if (target === "reviewer") {
    const verdict = (out.match(/Verdict:\s*(PASS|FAIL)/) || [])[1];
    if (verdict === "PASS") {
      return `PASS. Actualiza ${wp || "el WP"} a «hecho» en docs/tecnico/trabajo/PLAN.md, luego \`git add -A\` y \`git commit -m "${wp || "WP-xxx"}: …"\`. Si era el último paquete de la fase, delega la evaluación de fase en orquesta:jefe-de-pruebas.`;
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
    return "El reviewer no entregó un veredicto legible (Verdict: PASS o FAIL). Retómalo con SendMessage.";
  }

  if (target === "jefe-de-pruebas") {
    const verdict = (out.match(/Verdict:\s*(PASA CON OBSERVACIONES|PASA|NO PASA)/) || [])[1];
    if (verdict === "NO PASA") {
      return "La fase NO PASA. Delega en orquesta:arquitecto la creación de paquetes de corrección para cada FALLO bloqueante o mayor (el registro ya tiene la prueba que lo demuestra), constrúyelos con su ciclo builder → reviewer y vuelve a pedir al jefe de pruebas una re-prueba de esos FALLO. Cuéntale a la persona, en simple, qué falló y que se está corrigiendo.";
    }
    if (verdict) {
      return "La fase pasa. Ciérrala: (1) sincroniza la memoria con la skill memoria (`sync`) usando la evidencia del reviewer y del jefe de pruebas; (2) presenta a la persona el informe para ti en lenguaje simple, con capturas y cómo probarlo; (3) actualiza docs/producto/estado.json; (4) sigue el modo de construcción: en «por fases», espera su luz verde.";
    }
    return "El jefe de pruebas no entregó un veredicto legible. Retómalo con SendMessage.";
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
