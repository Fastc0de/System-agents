---
name: producto
description: Method, templates and tools for the plain-language product layer of an orquesta project (docs/producto/): the five conversation stages (vision, features, logic, experience, implementation), feature cards, flow diagrams (.flow.json → Mermaid + Excalidraw), people and feature maps, wireframes and the phase plan. Use when writing or reviewing docs/producto/, when a .flow.json or .visual.json needs to be created, validated or regenerated, or when someone asks how the orquesta stages work.
argument-hint: "[validar | generar <ruta> | todo]"
---

# Product layer

The product layer is what the person reads: their app described in their words. The orquesta orchestrator writes it with them in five stages. Builders and testers treat it as the contract.

## References

Read the one you need:

- `references/etapas.md`: the five stages: goal, questions, files, approval, exit criteria.
- `references/plantillas.md`: templates for `estado.json`, `1-idea.md`, `2-funcionalidades.md`, feature cards, `pantallas.md`, `5-plan-de-fases.md`, `glosario.md`.
- `references/formatos.md`: the `.flow.json` and `.visual.json` formats and what the validator checks.
- `references/lenguaje.md`: how to talk with a person who does not program.

## Files

```text
docs/producto/
  estado.json                      progress of the stages and the build
  1-idea.md · 1-personas.visual.json
  2-funcionalidades.md · 2-funcionalidades.visual.json
  3-logica/
    FUN-xx-<slug>.md               feature cards
    F<nn>-<slug>.flow.json         flow sources → .md + .excalidraw (generated)
    INDEX.md                       generated index and map of flows
  4-experiencia/
    pantallas.md · <slug>.visual.json (wireframes)
  5-plan-de-fases.md · 5-plan-de-fases.visual.json
  glosario.md
```

## Tools

A hook regenerates the views whenever a `.flow.json` or `.visual.json` is saved. To run it by hand:

```text
node "${CLAUDE_PLUGIN_ROOT}/skills/producto/scripts/diagramas.js" validar <file|dir>...
node "${CLAUDE_PLUGIN_ROOT}/skills/producto/scripts/diagramas.js" generar <file|dir>...
node "${CLAUDE_PLUGIN_ROOT}/skills/producto/scripts/diagramas.js" todo [project-root]
```

The script prints a JSON report; exit code 1 means at least one error. When invoked as a command with `validar`, `generar <ruta>` or `todo`, run the matching line and summarize the result in plain language.
