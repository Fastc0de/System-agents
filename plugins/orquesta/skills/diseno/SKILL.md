---
name: diseno
description: The design layer of an orquesta project (docs/diseno/) - the house aesthetic (warm, editorial, calm, inspired by Anthropic's visual language), the three visual directions offered in stage 4, the design system (tokens.json → tokens.css, sistema.md, referencia.html) that frontend builders implement and reviewers verify, and visual-only adjustments. Use when proposing or reviewing how an app looks, writing or validating design tokens, building or reviewing frontend against the design system, or when someone asks what the house style is.
argument-hint: "[validar | generar] [tokens.json | project-root]"
---

# Design layer

How the app looks and feels, decided with the person before anything is built, and kept as a contract while it is built. The orquesta designer writes it; the frontend builder implements it; the reviewer and the experience tester verify it.

## References

- `references/estetica-de-la-casa.md`: the house aesthetic: principles, baseline tokens, typefaces, components, the never-list, the signature, the three directions and the experience options.
- `references/plantillas.md`: `direcciones.html`, `tokens.json`, `sistema.md`, `referencia.html`, adjustments, and how the house stack consumes the tokens.

## Flow

1. **Stage 4, after the screens are agreed:** the designer proposes three directions (`direcciones.html`): A · Casa, B · Casa + mundo, C · Salto. The orchestrator shows them and the person picks one or mixes.
2. **The system:** the designer writes `tokens.json` (a hook validates contrast and generates `tokens.css`), `sistema.md` and `referencia.html`, a navigable version of every screen. The person approves it and stage 4 closes.
3. **Building:** WP-002 installs the tokens, typefaces and the base components; every frontend WP uses only them. A builder that needs something the system does not cover stops with `design-gap`.
4. **Visual-only changes** go to the designer (`ajuste`) and become frontend-only work packages: the backend and the contract stay untouched.

## Tools

A hook validates `docs/diseno/tokens.json` on every save and regenerates `tokens.css`. To run it by hand:

```text
node "${CLAUDE_PLUGIN_ROOT}/skills/diseno/scripts/tokens.js" validar <tokens.json|project-root>
node "${CLAUDE_PLUGIN_ROOT}/skills/diseno/scripts/tokens.js" generar <tokens.json|project-root>
```

The script prints a JSON report; exit code 1 means at least one error. When invoked as a command with `validar` or `generar`, run the matching line and summarize the result in plain language.
