---
name: tecnico
description: Formats and rules for the technical layer of an orquesta project (docs/tecnico/): house stack, architecture, data, the frontend↔backend contract, file zones per builder, commands, technical specs per feature, the work board and work packages (WPs). Use when writing, reading or reviewing docs/tecnico/, sizing or splitting work packages, or setting up a new project's stack and commands.
---

# Technical layer

The technical layer translates the approved product layer (`docs/producto/`) into something builders can execute and reviewers can check. The orquesta architect writes it; builders, the reviewer and the testing team read it; the orchestrator updates only the status column of the board.

## References

- `references/stack-de-la-casa.md`: the default stack, default `zonas.json` and `comandos.json`, and the walking-skeleton WP.
- `references/plantillas.md`: templates for every file in `docs/tecnico/`, plus sizing and splitting rules.

## Rules

1. Never change a product decision. If the product layer is ambiguous or contradictory, list the question for the person; do not guess.
2. Contract first: every frontend↔backend interaction is written in `contrato-api.md` before either side is built, with every error mapped to the exact text the person approved.
3. Full coverage: every acceptance criterion and every step of every approved flow maps to a WP and a planned test (table in `trabajo/PLAN.md`).
4. One specialty per WP; small, vertical, verifiable; disjoint files for anything marked parallel.
5. `zonas.json` and `comandos.json` are read by hooks: keep them valid and true to the real tree.
