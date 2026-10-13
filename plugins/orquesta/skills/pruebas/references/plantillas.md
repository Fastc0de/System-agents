# Testing templates

Everything the person may read (`*-para-ti.md`, ledger plain fields) is in their language and without jargon.

---

## `tests/e2e/playwright.config.ts`

Written by the test lead the first time. Adapt `webServer.command` and `url` from `docs/tecnico/comandos.json`.

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "..",
  testMatch: ["aceptacion/**/*.spec.ts", "e2e/**/*.spec.ts", "regresion/**/*.spec.ts"],
  outputDir: "../../docs/pruebas/evidencias/ultima-ejecucion",
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "../../docs/pruebas/evidencias/ultima-ejecucion/resultados.json" }]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "on",
    video: "on",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "movil", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

`retries: 0` on purpose: a flaky test is a failure to register, not something to retry until green.

## Test naming

Every test name starts with what it verifies, so reports trace to the spec:

```ts
test("FUN-03 CA2 · contraseña incorrecta muestra el aviso genérico", async ({ page }) => { … });
test("FUN-03 F01:limite→sí · al 5.º intento la cuenta se pausa 15 min", async ({ request }) => { … });
test("FALLO-012 · dos reservas a la misma hora: solo una se confirma", async ({ browser }) => { … });
```

Files: `tests/aceptacion/FUN-03-iniciar-sesion.spec.ts`, `tests/e2e/recorrido-reserva.spec.ts`, `tests/regresion/FALLO-012-doble-reserva.spec.ts`.

---

## Plan · `docs/pruebas/planes/fase-1.md`

```markdown
# Plan de evaluación · fase 1

- Modo: fase 1 · Fecha: 2026-10-20
- Alcance: FUN-01, FUN-02, FUN-03 · cambios desde <commit>
- Regresión: tests/regresion/ (n pruebas)

## Prioridad por riesgo
1. FUN-02 Reservar una cita — dinero y concurrencia
2. FUN-03 Iniciar sesión — acceso
3. …

## Reparto
| Tester | Funcionalidades | Casos |
| --- | --- | --- |
| recorridos | FUN-01, FUN-02, FUN-03 | CA1–CA5 de cada una, ramas de error de F01–F03 |
| servidor | FUN-02, FUN-03 | reglas R-01–R-03, permisos, F01:limite |
| limites | FUN-02 | doble reserva, datos vacíos y enormes |
| experiencia | todas | móvil y escritorio, textos, accesibilidad |
```

## Coverage matrix · `docs/pruebas/matriz-de-cobertura.md`

```markdown
# Matriz de cobertura

| Funcionalidad | Criterio o rama | Prueba | Tester | Último resultado |
| --- | --- | --- | --- | --- |
| FUN-03 | CA1 | tests/e2e/iniciar-sesion.spec.ts › FUN-03 CA1 | recorridos | ✅ fase 1 |
| FUN-03 | F01:limite → sí | tests/aceptacion/FUN-03-iniciar-sesion.spec.ts › FUN-03 F01:limite→sí | servidor | ✅ fase 1 |
```

## Ledger · `docs/pruebas/registro-de-fallos.md`

```markdown
# Registro de fallos

## FALLO-012 · FUN-02 Reservar una cita · mayor · verificado

Qué se esperaba: si dos personas eligen la misma hora, solo la primera la consigue.
Qué pasó: las dos recibieron confirmación.
Cómo reproducirlo: abrir la app en dos navegadores, elegir la misma hora y confirmar casi a la vez.

- Detectado: 2026-10-20 · evaluación de la fase 1 · tester de casos límite
- Prueba: `tests/regresion/FALLO-012-doble-reserva.spec.ts`
- Corrección: WP-019 (backend)
- Historial: 2026-10-20 abierto · 2026-10-20 en-correccion · 2026-10-21 verificado

### Detalle técnico
<Causa, evidencia, rutas.>
```

- Heading: `## FALLO-<nnn> · <FUN-xx Nombre> · <bloqueante|mayor|menor|cosmetico> · <abierto|en-correccion|corregido|verificado|reincidente|retirado>`.
- Required fields: *Qué se esperaba*, *Qué pasó*, *Cómo reproducirlo*, *Detectado*, *Prueba* (under `tests/regresion/`, must exist).
- Never rewrite old text: change the state in the heading and append to *Historial*.
- Check with `node "${CLAUDE_PLUGIN_ROOT}/skills/pruebas/scripts/registro.js" validar .`

## Report for the person · `docs/pruebas/informes/fase-1-para-ti.md`

```markdown
# Fase 1 · «Ya se puede reservar» — PASA CON 1 OBSERVACIÓN

## Lo que ya puedes hacer
Registrarte, entrar, reservar una cita y verla en «Mis citas».

## Resultado por funcionalidad
- ✅ Registrarse — 6 de 6 comprobaciones
- ✅ Iniciar sesión — 7 de 7
- ✅ Reservar una cita — 12 de 12. Se encontró y corrigió 1 fallo: dos personas podían reservar la misma hora; ahora la segunda ve «Esa hora acaba de ocuparse, elige otra».
- ⚠️ Ver mi agenda — 8 de 9. En móviles pequeños el nombre del servicio se corta (menor; va en la fase 2).

## Protección acumulada
33 comprobaciones automáticas, incluida 1 de un fallo anterior. Todas en verde.

## Cómo probarlo tú
1. Entra y pulsa «Reservar». 2. Elige «Corte», un barbero y mañana a las 10:00. 3. Confirma y revisa «Mis citas».

## Evidencias
- Video del recorrido: evidencias/fase-1/reservar.webm
- Capturas: evidencias/fase-1/
```

## Technical report · `docs/pruebas/informes/fase-1-tecnico.md`

```markdown
# Fase 1 · informe técnico

## Comandos y resultados
- `<command>` → n passed, n failed

## Regresión
- n/n (FALLO-… ✅)

## Fallos nuevos
- FALLO-012 · mayor · tests/regresion/FALLO-012-doble-reserva.spec.ts · causa probable: …

## Observaciones menores
## Cobertura
- n criterios, n ramas; sin cubrir: …
```

## Tester brief (from the test lead)

```text
Modo: fase 1
Funcionalidades: FUN-02, FUN-03
Casos: FUN-02 CA1–CA5, F02 ramas error; FUN-03 CA1–CA3, F01:limite
Entorno: comandos en docs/tecnico/comandos.json; config tests/e2e/playwright.config.ts
Evidencias: docs/pruebas/evidencias/fase-1/<tester>/
Devuelve tu TESTER REPORT.
```
