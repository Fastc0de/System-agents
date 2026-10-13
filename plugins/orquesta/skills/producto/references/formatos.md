# Flow and visual formats

You write these JSON files; a hook validates them on save and generates the views. Never edit the generated `.md` or `.excalidraw`. Keys are Spanish because the content is the person's.

To check or regenerate by hand:

```text
node "${CLAUDE_PLUGIN_ROOT}/skills/producto/scripts/diagramas.js" validar docs/producto
node "${CLAUDE_PLUGIN_ROOT}/skills/producto/scripts/diagramas.js" todo .
```

---

## Flow · `docs/producto/3-logica/F<nn>-<slug>.flow.json`

Generates `F<nn>-<slug>.md` (Mermaid diagram + step-by-step cards + criteria) and `F<nn>-<slug>.excalidraw` (visual map with one lane per actor), plus `INDEX.md` for the folder.

```json
{
  "id": "F01",
  "titulo": "Iniciar sesión",
  "funcionalidad": "FUN-03",
  "version": 1,
  "estado": "borrador",
  "resumen": "Un cliente que ya tiene cuenta entra con su correo y su contraseña para ver sus citas.",
  "disparador": "El cliente abre la app y no tiene una sesión activa.",
  "actores": [
    { "id": "cliente", "nombre": "Cliente" },
    { "id": "sistema", "nombre": "La app" }
  ],
  "precondiciones": ["El cliente ya se registró (FUN-01)."],
  "postcondiciones": ["El cliente ve «Mis citas»."],
  "pasos": [
    { "id": "inicio", "tipo": "inicio", "texto": "Abres la app", "actor": "cliente" },
    { "id": "pantalla_login", "tipo": "pantalla", "texto": "Pantalla «Entrar»", "actor": "cliente",
      "detalle": "Escribe su correo y su contraseña y pulsa «Entrar».",
      "ve": "Dos campos, el botón «Entrar» y «¿Olvidaste tu contraseña?»." },
    { "id": "password_ok", "tipo": "decision", "texto": "¿La contraseña coincide?", "actor": "sistema",
      "detalle": "Se compara con la guardada.", "reglas": ["Nunca se dice cuál de los dos datos falló"] },
    { "id": "crear_sesion", "tipo": "accion", "texto": "Entras a tu cuenta", "actor": "sistema",
      "detalle": "Se crea una sesión de 7 días.", "datos": ["Sesión (crear)"],
      "si_falla": ["Si no se puede guardar, se muestra «Inténtalo de nuevo»"] },
    { "id": "fin_ok", "tipo": "fin", "texto": "Ves «Mis citas»", "actor": "cliente", "resultado": "exito" },
    { "id": "fin_error", "tipo": "fin", "texto": "Sigues fuera, con un aviso", "actor": "cliente", "resultado": "error" }
  ],
  "transiciones": [
    { "de": "inicio", "a": "pantalla_login" },
    { "de": "pantalla_login", "a": "password_ok" },
    { "de": "password_ok", "a": "crear_sesion", "condicion": "sí" },
    { "de": "password_ok", "a": "fin_error", "condicion": "no", "tipo": "error" },
    { "de": "crear_sesion", "a": "fin_ok" }
  ],
  "criterios": ["Con datos correctos entro y veo «Mis citas»."],
  "preguntas_abiertas": [],
  "cambios": [{ "version": 1, "fecha": "2026-10-13", "cambio": "Primera versión." }]
}
```

### Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | `F01`, `F02`… unique in the project, permanent |
| `titulo` | yes | Short name, in the person's words |
| `funcionalidad` | recommended | `FUN-xx` or a list of them |
| `version` | yes | Integer from 1. Raise it on every change to an approved flow and add a `cambios` entry |
| `estado` | yes | `borrador` → `revision` → `aprobado`; `obsoleto` when replaced |
| `resumen`, `disparador` | recommended | What it is and what starts it |
| `actores` | when 2+ parties act | Each becomes a lane in the visual map; every step then needs `actor` |
| `precondiciones`, `postcondiciones` | optional | Lists of sentences |
| `pasos` | yes | See step types below |
| `transiciones` | yes | `de`, `a`, optional `condicion`, `tipo`: `normal` (default), `error` (red dashed), `espera` (dotted) |
| `criterios` | yes to approve | Acceptance criteria the person can check; each becomes at least one test |
| `preguntas_abiertas` | must be empty to approve | Questions to ask the person |
| `cambios` | recommended | Change history |

### Step fields

| Field | Meaning |
| --- | --- |
| `id` | Letters, digits, `_` or `-`; unique in the flow; permanent (tests and work packages cite `F01:<id>`) |
| `tipo` | `inicio`, `fin`, `pantalla`, `accion`, `decision`, `datos`, `externo`, `espera`, `subflujo` |
| `texto` | What the diagram shows (max 80 characters). For a `decision`, a question |
| `actor` | Actor id, when `actores` is declared |
| `detalle` | Exactly what happens (required except for `inicio`/`fin`) |
| `ve` | For `pantalla`: what the person sees |
| `reglas` | Rules that apply (`R-02` or the rule written out) |
| `datos` | Information read or saved, in plain words |
| `si_falla` | What happens when this step fails |
| `flujo` | For `subflujo`: the flow it continues in (`F02`) |
| `resultado` | For `fin`: `exito`, `error` or `cancelado` |

### What the validator checks

- At least one `inicio` and one `fin`; nothing arrives at an `inicio`; nothing leaves a `fin`.
- Every step is reachable from the start, and every step can reach an end (no dead ends).
- Every `decision` has two or more branches, each with a distinct `condicion`.
- Every `externo` models its failure (`tipo: "error"` transition or `si_falla`).
- Every step but `inicio`/`fin` has `detalle` (an error once approved).
- Approved flows have criteria and no open questions.
- Across flows: unique ids; `subflujo` references exist.
- Warnings: missing `ve` on screens, missing `datos` on data steps, only a happy path, long texts.

---

## Visuals · `*.visual.json`

Generate one `.excalidraw` next to the source.

### `mapa` (stage 1 people map, stage 2 feature map)

```json
{
  "tipo": "mapa",
  "titulo": "Mapa de funcionalidades",
  "subtitulo": "Verde: primera versión. Amarillo: después.",
  "grupos": [
    { "nombre": "Clientes", "descripcion": "Reservan y gestionan sus citas.",
      "items": [ { "id": "FUN-01", "texto": "Registrarse", "etiqueta": "imprescindible" }, "Ver sus citas" ] }
  ]
}
```

`etiqueta` colors: `imprescindible` green, `después` yellow, `quizás` gray; anything else blue.

### `boceto` (stage 4 wireframes)

```json
{
  "tipo": "boceto",
  "titulo": "Bocetos · Reservar una cita",
  "dispositivo": "movil",
  "pantallas": [
    { "id": "P01", "nombre": "Elegir servicio", "elementos": [
      { "tipo": "menu", "texto": "Barbería Navaja" },
      { "tipo": "encabezado", "texto": "¿Qué te hacemos hoy?" },
      { "tipo": "lista", "items": ["Corte · 30 min · 15 €", "Barba · 20 min · 10 €"] },
      { "tipo": "campo", "etiqueta": "Barbero", "texto": "Cualquiera" },
      { "tipo": "boton", "texto": "Continuar" }
    ], "notas": "Si no hay servicios, se muestra «Pronto abriremos reservas»." },
    { "id": "P02", "nombre": "Elegir día y hora", "elementos": [
      { "tipo": "encabezado", "texto": "Elige cuándo" },
      { "tipo": "aviso", "texto": "Si alguien toma la hora antes que tú, te lo avisamos." },
      { "tipo": "boton", "texto": "Confirmar reserva" }
    ] }
  ],
  "navegacion": [ { "de": "P01", "a": "P02", "accion": "pulsa Continuar" } ]
}
```

Element types: `menu`, `encabezado`, `texto`, `campo` (with optional `etiqueta`), `boton`, `lista` (with `items`), `tarjeta`, `imagen`, `aviso`, `separador`. `dispositivo`: `movil` or `escritorio`.

### `fases` (stage 5 plan)

```json
{
  "tipo": "fases",
  "titulo": "Plan de fases",
  "fases": [
    { "nombre": "Fase 1 · Ya se puede reservar", "entrega": "Al terminar podrás registrarte, entrar y reservar.",
      "funcionalidades": ["FUN-01", "FUN-02", "FUN-03"], "estado": "pendiente" }
  ]
}
```

`estado`: `pendiente` (blue), `en-curso` (yellow), `terminada` (green). Update it as phases close.
