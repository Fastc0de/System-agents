# How an evaluation works

The test lead (`orquesta:jefe-de-pruebas`) runs every evaluation. It tests what was built against what the person asked for, in four testing levels: levels 1 and 2 belong to builders and the reviewer; **levels 3 and 4 belong to the testing team**.

## Modes

| Mode | When | Scope |
| --- | --- | --- |
| `fase N` | Every WP of phase N is reviewed and PASS | Features of phase N, everything that changed since the last evaluation, and the full regression suite |
| `re-prueba` | Correction WPs for given FALLO ids were built and reviewed | Those FALLO tests, the features they touch, and the full regression suite |
| `app` | After the last phase, or on request | Every feature of the product layer, end-to-end journeys, the full regression suite |
| `auditoría` | An app exists without a product layer (or the person wants a check) | First map what the app does in plain language for the person to confirm; then `app` against the confirmed spec |

## Inputs

- The spec: `docs/producto/2-funcionalidades.md`, feature cards and flows in `docs/producto/3-logica/` (every step, branch and criterion), screens and texts in `docs/producto/4-experiencia/`.
- The design: `docs/diseno/` (`sistema.md`, `tokens.json`, `referencia.html`), what the screens must look like.
- The technical layer: `docs/tecnico/contrato-api.md`, `datos.md`, `comandos.json` (how to install, run, seed and test).
- What changed: `git log --oneline` and `git diff --stat` since the last evaluation (find it in `docs/pruebas/informes/`).
- The failure ledger `docs/pruebas/registro-de-fallos.md` and its summary: `node "${CLAUDE_PLUGIN_ROOT}/skills/pruebas/scripts/registro.js" resumen .`

## Steps

1. **Environment.** Make sure the app can run for tests: dependencies installed (`instalar`), data prepared (`preparar_datos`), browsers available (`npx playwright install chromium` if needed). If the project has no `tests/e2e/playwright.config.ts`, write it (see `plantillas.md`): `webServer` starts the app with `arrancar` at `url`; screenshots and video on. If something only a builder can fix blocks testing (a missing dependency, a broken start command), stop and report it as blocking.
2. **Regression first.** Run `pruebas_regresion` (the whole `tests/regresion/`). Record results. A FALLO whose test fails again after being `verificado` becomes `reincidente` (highest priority).
3. **Coverage matrix.** Update `docs/pruebas/matriz-de-cobertura.md`: every criterion and every flow branch in scope → at least one test → which tester owns it. Criteria with no possible automated test get a manual check described step by step.
4. **Risk.** Order the work: money, personal data, access and data loss first; then what is new or changed; then fragile areas (features with several FALLOs or a reincidence); then the rest.
5. **Plan.** Write `docs/pruebas/planes/<modo>-<n>.md` (template in `plantillas.md`).
6. **Dispatch the testers in parallel**: one message with one `Agent` call per tester that has work. Each brief lists its features, cases (criterion or branch ids), environment notes and the report format. Testers:
   - `orquesta:tester-recorridos`: user journeys in a real browser, branch by branch; screenshots and video.
   - `orquesta:tester-servidor`: business rules, data, permissions and calculations through the API.
   - `orquesta:tester-limites`: odd and hostile inputs, double actions, concurrency, access without permission.
   - `orquesta:tester-experiencia`: phone and desktop sizes, accessibility, exact texts and messages, states.
7. **Consolidate.** Merge results, remove duplicates, confirm each failure reproduces (run its test yourself), and classify severity:

   | Severity | Meaning | Blocks the phase |
   | --- | --- | --- |
   | `bloqueante` | A version-1 feature cannot be used, or data is lost or exposed | yes |
   | `mayor` | A criterion is not met, or a flow branch does something other than agreed | yes |
   | `menor` | Works, with a defect that does not change the outcome | no (observation) |
   | `cosmetico` | Visual or wording detail | no |

8. **Ledger.** Each new failure gets the next id (`registro.js siguiente`), a regression test in `tests/regresion/FALLO-xxx-<slug>.spec.ts` that fails now, and an entry in `docs/pruebas/registro-de-fallos.md` (format in `plantillas.md`). Never edit a past entry's text; append to its *Historial* and change its state in the heading.
9. **Verdict.**
   - `NO PASA` if any `bloqueante` or `mayor` is open, or regression failed.
   - `PASA CON OBSERVACIONES` if only `menor`/`cosmetico` remain.
   - `PASA` otherwise.
10. **Reports.** `docs/pruebas/informes/<modo>-<n>-para-ti.md` (plain language, per feature, with evidence links and how to try it) and `docs/pruebas/informes/<modo>-<n>-tecnico.md` (commands, results, failures with paths). Validate the ledger: `registro.js validar .`.

## Re-test

For each FALLO in the brief: run its regression test and the feature's acceptance tests. Passing → state `verificado` (append to *Historial*). Failing → stays `en-correccion` and the verdict is `NO PASA`. Always run the full regression suite too.

## Audit

1. Map the app: routes, screens, server operations (use Glob/Grep/Read; run the app and look at it).
2. Write a plain-language catalog proposal in `docs/pruebas/auditoria/catalogo-propuesto.md`: features (as the person would name them), the main steps of each, what happens on errors as observed. Mark what you could not determine.
3. Return verdict `PASA CON OBSERVACIONES` with the catalog path and a note that the person must confirm it; the orchestrator turns the confirmed catalog into the product layer and asks for the `app` evaluation.

## Integrity rules (enforced by hooks)

- Builders cannot modify `tests/aceptacion`, `tests/e2e` or `tests/regresion`; testers cannot modify app code.
- Testers add regression tests but never change existing ones; only the test lead may change or retire a test, when the spec changed, recording why in the ledger (`retirado`).
- Never skip or focus tests. A flaky test (passes and fails without changes) is a failure: register it.
- A verdict without regression results is rejected by the stop hook.
