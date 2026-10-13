---
name: pruebas
description: Spec-driven testing for an orquesta project - four testing levels, phase evaluations run by the test lead with four specialized testers, the permanent failure ledger (docs/pruebas/registro-de-fallos.md) and an audit mode for existing apps. Use to evaluate a phase or a whole app, re-test fixed failures, audit an app that was built without specs, or read and validate the failure ledger.
argument-hint: "[fase N | re-prueba FALLO-xxx | app | auditoria | resumen]"
---

# Testing

The testing team checks that the app does what the person asked for, in every agreed case, and that what already worked keeps working.

| Level | When | Who |
| --- | --- | --- |
| 1 · Quick tests | While building each work package | Builder; a hook blocks it from finishing with failing quick tests |
| 2 · Package review | After each work package | Reviewer |
| 3 · Phase evaluation | When a phase is built | `orquesta:jefe-de-pruebas` with four testers |
| 4 · Whole-app evaluation | At the end, on request, or on an existing app | `orquesta:jefe-de-pruebas` with four testers |

## References

- `references/evaluacion.md`: modes, steps, severity, verdict, re-test and audit.
- `references/plantillas.md`: Playwright config, test naming, plan, coverage matrix, ledger entry, both reports, tester brief.

## Running it

Inside orquesta, the orchestrator delegates to `orquesta:jefe-de-pruebas` with the mode. When this skill is invoked directly with an argument:

- `fase N`, `re-prueba FALLO-xxx …`, `app` or `auditoria`: delegate to `orquesta:jefe-de-pruebas` with that mode and the scope, then present its report for the person (`docs/pruebas/informes/*-para-ti.md`) in plain language.
- `resumen`: run `node "${CLAUDE_PLUGIN_ROOT}/skills/pruebas/scripts/registro.js" resumen .` and explain pending failures and fragile areas in plain language.

## Failure ledger tool

```text
node "${CLAUDE_PLUGIN_ROOT}/skills/pruebas/scripts/registro.js" resumen   [project-root]
node "${CLAUDE_PLUGIN_ROOT}/skills/pruebas/scripts/registro.js" siguiente [project-root]
node "${CLAUDE_PLUGIN_ROOT}/skills/pruebas/scripts/registro.js" validar   [project-root]
```
