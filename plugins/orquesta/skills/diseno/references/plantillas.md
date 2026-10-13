# Design-layer templates

The designer writes `docs/diseno/`. It turns the approved screens (`docs/producto/4-experiencia/`) into how the app looks and feels; it never changes what the app does or says. Content shown to the person is in their language.

```text
docs/diseno/
  direcciones.html   stage 4: three visual directions side by side (self-contained)
  tokens.json        the chosen system as data; a hook validates it and generates tokens.css
  tokens.css         generated: CSS variables + a Tailwind v4 @theme block. Never edit it
  sistema.md         the chosen system in words: principles, type, color, components, states, motion, signature
  referencia.html    the chosen system applied: component gallery + every screen, navigable
```

The frontend builder implements from `tokens.css`, `sistema.md` and `referencia.html`; the reviewer and the experience tester verify against them. They are the **visual contract**, the counterpart of `docs/tecnico/contrato-api.md`.

---

## `direcciones.html`

One self-contained file the person opens with a double click.

- **Top:** the app name, one sentence ("Tres maneras de vestir tu app; elige una o mezcla"), and a jump link per direction.
- **Per direction**, a full-width band styled in that direction:
  - Name (two or three evocative words) and its letter: «A · Papel y tinta».
  - One line on how it feels, in plain words.
  - Palette: swatches with the role in plain words («fondo», «botón principal», «avisos»), not hex alone.
  - Type: the heading face and the text face, shown with a real heading and a real paragraph from the app.
  - The signature, shown in use, with one line explaining it.
  - **Two key screens** of the main journey, built with the approved texts and realistic sample data, in a phone frame (or a desktop frame if the app is desktop-first). Add a second size only if the app is used on both and it fits.
  - A row of core components: primary and secondary button, a field with its error, a list item or card, a notice.
- **End:** the experience options that fit this app (house guide, section 7), each with its consequence and the recommendation, and a short legend: "Puedes elegir una o mezclar: «la letra de A con los colores de C»".

Rules: one HTML file, CSS in a `<style>` block, typefaces only through a Google Fonts `<link>`, no frameworks or external scripts, no external images (shapes, SVG drawn inline or neutral placeholders captioned «foto del local»). It must read well on a phone (each direction stacks) and on a computer (frames side by side). A few lines of plain JavaScript are allowed only for navigation.

## `tokens.json`

The chosen system as data. A hook validates it on save (roles, AA contrast in every mode, typefaces) and writes `tokens.css`. Keys are Spanish, like the rest of the project's sources.

```json
{
  "nombre": "Barbería Navaja · B «Navaja y papel»",
  "version": 1,
  "color": {
    "claro": {
      "fondo": "#FAF9F5",
      "superficie": "#FFFFFF",
      "superficie_alt": "#F0EEE6",
      "borde": "#E3DFD3",
      "texto": "#1F1E1C",
      "texto_suave": "#5E5B53",
      "acento": "#B5532F",
      "acento_texto": "#FFFFFF",
      "acento_suave": "#F5E5DC",
      "exito": "#3F6B3B",
      "aviso": "#8A5A0B",
      "error": "#A8372B",
      "foco": "#2F6BAE"
    },
    "oscuro": {
      "fondo": "#21201E",
      "superficie": "#2B2A27",
      "superficie_alt": "#26251F",
      "borde": "#3D3B36",
      "texto": "#F2EFE6",
      "texto_suave": "#B8B3A6",
      "acento": "#E08A66",
      "acento_texto": "#21201E",
      "acento_suave": "#3A2A22",
      "exito": "#8DBB86",
      "aviso": "#E0B05C",
      "error": "#F08B7E",
      "foco": "#7FB0EA"
    }
  },
  "tipografia": {
    "titulos": { "familia": "Source Serif 4", "respaldo": "Georgia, serif", "pesos": [500, 600] },
    "texto": { "familia": "Hanken Grotesk", "respaldo": "system-ui, sans-serif", "pesos": [400, 500, 600] },
    "escala": { "xs": 12, "sm": 14, "base": 16, "lg": 18, "xl": 20, "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48 },
    "interlineado": { "titulos": 1.2, "texto": 1.6 }
  },
  "espacio": [0, 4, 8, 12, 16, 24, 32, 48, 64, 96],
  "radio": { "sm": 6, "md": 10, "lg": 16, "pastilla": 999 },
  "sombra": { "flotante": "0 1px 2px rgb(31 30 28 / 0.06), 0 8px 24px rgb(31 30 28 / 0.08)" },
  "movimiento": { "rapido": 120, "normal": 200, "lento": 320, "curva": "cubic-bezier(0.2, 0, 0, 1)" },
  "ancho": { "lectura": "68ch", "contenido": 1120 },
  "firma": "Raya diagonal fina (poste de barbero) como separador y barra de carga; la confirmación es un ticket con borde troquelado."
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `nombre`, `version` | yes | Project and chosen direction; raise `version` on every adjustment |
| `color.claro` | yes | The 13 roles of the house guide (section 2). Extra roles are allowed (for the signature) |
| `color.oscuro` | when dark mode was chosen | Same roles |
| `tipografia.titulos`, `.texto` | yes | `familia` (Google Fonts name), `respaldo`, `pesos`; `mono` optional |
| `tipografia.escala` | yes | Sizes in px, including `base` |
| `espacio`, `radio`, `movimiento` | yes | Px, px and ms; `curva` as CSS |
| `sombra`, `ancho`, `interlineado` | optional | As CSS values |
| `firma` | recommended | The signature in one sentence |

What the validator rejects: missing roles, invalid colors, any text/background pair under AA (text 4.5:1, controls and focus 3:1), Anthropic's commercial typefaces. It warns about pure white backgrounds, pure black text, generic typefaces as identity, a base size under 16 px and slow motion.

`tokens.css` (generated) defines `--fondo`, `--texto-suave`, `--fuente-titulos`, `--tam-base`, `--espacio-4`, `--radio-md`, `--sombra-flotante`, `--duracion-normal`, `--curva`…, a dark-mode block (automatic, or forced with `data-tema="oscuro"` / `"claro"` on `<html>`) and a Tailwind v4 `@theme inline` block that maps them to utilities (`bg-fondo`, `text-texto-suave`, `font-titulos`, `text-2xl`, `rounded-md`, `shadow-flotante`, `ease-curva`). Browsers ignore that block when the file is used as plain CSS.

## `sistema.md`

```markdown
# Sistema de diseño · <app>

- Dirección: <B «Navaja y papel»>, con <mezclas, si las hubo>
- Versión: 1 · Tokens: tokens.json (vista: tokens.css) · Referencia: referencia.html
- Opciones de experiencia: <modo oscuro automático · movimiento sobrio · fotos del local>

## Idea
<Tres o cuatro frases: cómo se siente, de dónde sale, qué la hace propia.>

## Firma
<Qué es, dónde aparece (2–3 lugares) y dónde no.>

## Tipografía
| Uso | Familia | Tamaño | Peso | Interlineado |
| --- | --- | --- | --- | --- |
| Título de pantalla | Source Serif 4 | 3xl (30) | 600 | 1.2 |
| Texto | Hanken Grotesk | base (16) | 400 | 1.6 |

## Color
<Qué rol cumple cada color y cuándo NO se usa. El acento: solo acción principal y selección.>

## Espacio y forma
<Márgenes de pantalla (móvil / escritorio), separación entre bloques, radios por componente, cuándo hay sombra.>

## Componentes
Por componente: anatomía, variantes, tamaños y **todos sus estados** (normal, hover, foco, pulsado, deshabilitado, cargando, error).
- Botón · Campo de texto · Selector · Tarjeta / fila de lista · Aviso · Estado vacío · Esqueleto de carga · Barra superior · Navegación · Hoja / diálogo · <los propios de la app: selector de hora, ticket…>

## Movimiento
<Qué se anima, cuánto dura, con qué curva; qué pasa con «reducir movimiento».>

## Imágenes e iconos
<Estilo de fotos o ilustraciones; set de iconos y grosor.>

## Voz en pantalla
<Tono, mayúsculas solo al inicio, verbos en botones, cómo se escriben los errores. Ejemplos de la app.>

## Así sí / así no
| Así sí | Así no |
| --- | --- |
| Un solo botón principal por pantalla | Dos botones con acento compitiendo |

## Historial
| Versión | Fecha | Cambio | Pantallas afectadas |
| --- | --- | --- | --- |
| 1 | 2026-10-13 | Primera versión. | — |
```

## `referencia.html`

The chosen system applied, the page the builder copies from.

- Links `tokens.css` (relative path) and the Google Fonts it needs; its own styles use only the token variables.
- **Gallery:** every component of `sistema.md` with every state, labeled.
- **Screens:** every screen of `pantallas.md` (ids `P01`…), phone first, plus desktop for the key ones when the app is used on both, with the approved texts and their empty, loading and error states.
- **Navigable:** buttons and links jump between screens following the wireframes' navigation (anchors or a few lines of plain JavaScript), so the person can "use" the app before it exists.
- When dark mode was chosen, a switch that sets `data-tema` on `<html>`.

## Adjustments (`ajuste`)

A visual change after the system exists: change `tokens.json` (raise `version`), `sistema.md` (add a row to *Historial* with the affected screens and components) and `referencia.html`. Report exactly which screens and components change, so the architect can create frontend-only work packages; the backend and the contract are never touched by a visual change.

## How the frontend consumes it (house stack)

- WP-002 copies `docs/diseno/tokens.css` to `src/app/tokens.css` and imports it after Tailwind in `src/app/globals.css`; the copy must stay identical (the reviewer checks it). An adjustment produces a frontend WP that copies it again.
- Typefaces load with `next/font/google`, with `variable: "--fuente-titulos"` / `"--fuente-texto"` on `<body>`, which replaces the family names of `tokens.css` with the self-hosted files.
- Components use only token utilities (`bg-fondo`, `text-texto`, `border-borde`, `font-titulos`, `rounded-md`…), never hex values, font names or the default Tailwind palette.
