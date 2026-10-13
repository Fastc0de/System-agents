# The five stages, in detail

Each stage has a goal, the conversation, what you write, what the person approves, and how you know it is done. Templates are in `plantillas.md`; the flow and visual formats in `formatos.md`. Record progress in `docs/producto/estado.json` (`etapa`, `etapas.N`).

---

## Stage 1 · Visión

**Goal.** Anyone could read one page and understand what this app is, for whom, and why.

**Conversation.** Two or three rounds. Useful questions:

- ¿Qué problema resuelve? ¿Qué hacen hoy las personas sin la app?
- ¿Quién la va a usar? ¿Hay distintos tipos de personas (clientes, empleados, administración)?
- Si en tres meses funciona bien, ¿qué habrá cambiado?
- ¿Qué **no** debería ser? (límites, cosas que no quieres)
- ¿En qué se usará: móvil, ordenador, ambos? ¿En qué idioma(s)?
- ¿Hay alguna app parecida que te guste o que no te guste? (you may look it up with WebSearch to understand the reference)

**Write.**
- `docs/producto/1-idea.md` (template "1-idea").
- `docs/producto/1-personas.visual.json`: a `mapa` with one group per type of person and items = what each one wants to achieve.

**Approval.** "¿La idea quedó bien contada?" On yes: `etapas.1 = "aprobada"`, offer project memory (`orquesta:memoria init`) if it is off.

**Done when.** The person approved; problem, people, success and non-goals are explicit.

---

## Stage 2 · Funcionalidades

**Goal.** The complete list of what the app lets each person do, in short phrases, with priorities.

**Conversation.**
- Walk through each type of person: "¿Qué tiene que poder hacer un cliente?" Offer the obvious ones as suggestions ("normalmente: registrarse, entrar, recuperar la contraseña…").
- Ask what is essential for the first version and what can wait. Push gently for a small first version: what is the least that would already be useful?
- Group related actions into one feature when they are one goal for the person ("Reservar una cita" includes choosing service, time and confirming).

**Write.**
- `docs/producto/2-funcionalidades.md` (template "2-funcionalidades"): ids `FUN-01`, `FUN-02`… stable forever (never renumber; retired features keep their id with priority "descartada").
- `docs/producto/2-funcionalidades.visual.json`: a `mapa` with groups = people, items = features with `id` and `etiqueta` (imprescindible, después, quizás).

**Approval.** "¿Esta es la primera versión?" On yes: `etapas.2 = "aprobada"`.

**Done when.** Every feature has an id, a one-line description, who uses it and a priority; version 1 is agreed.

---

## Stage 3 · Lógica

**Goal.** Every version-1 feature described step by step, including what happens when something goes wrong, with acceptance criteria the person can check.

**Conversation.** One feature at a time, starting with the most important. For each:

1. "Cuéntame cómo funciona, paso a paso, como si lo estuvieras usando."
2. Ask the "¿y si…?" questions a programmer would ask, in plain words:
   - ¿Y si escribe mal un dato? ¿Y si deja algo vacío?
   - ¿Y si no encuentra lo que busca? ¿Y si no hay resultados?
   - ¿Y si dos personas hacen lo mismo a la vez (la misma hora, el último producto)?
   - ¿Y si se arrepiente / cancela? ¿Hasta cuándo puede?
   - ¿Y si se queda sin internet a mitad?
   - ¿Y si un servicio externo falla (el pago, el correo)?
   - ¿Quién puede ver o hacer esto y quién no?
   - ¿Hay límites? (cantidades, horarios, intentos)
3. Agree the acceptance criteria: 3–8 sentences the person could check by using the app ("Con una contraseña incorrecta veo …").

**Write, per feature.**
- `docs/producto/3-logica/FUN-xx-<slug>.md` (template "ficha de funcionalidad").
- One or more flows `docs/producto/3-logica/F<nn>-<slug>.flow.json` (format in `formatos.md`). Use actors (lanes) when more than one party acts (the person, the app, a payment provider, staff). The hook generates `.md` and `.excalidraw`; show the person the `.excalidraw`.
- Business rules that apply to many features go in the feature cards with ids `R-01`, `R-02`… so flows can cite them.

**Approval.** One flow at a time at first: "¿Así funciona?" Resolve every open question; then set `"estado": "aprobado"` (the validator becomes strict: fix anything it reports). When the person trusts the process, they may approve several at once.

**Done when.** Every v1 feature has an approved flow, no open questions, and criteria.

---

## Stage 4 · Experiencia

**Goal.** The person sees how the app will look and feel before it is built.

**Conversation.**
- List the screens, derived from the flows' `pantalla` steps; confirm none is missing.
- For each screen: what is on it, the main action, what is shown when there is no data, while loading, and on error. The exact texts and messages people will read.
- Style: colors, tone (formal, friendly), any brand, apps or websites they like.
- Device priority: phone first, computer first, or both.

**Write.**
- `docs/producto/4-experiencia/pantallas.md` (template "pantallas"): each screen with id `P01`…, purpose, content, states, texts, and which flow steps it serves.
- Wireframes `docs/producto/4-experiencia/<slug>.visual.json` (`boceto`), one per feature or per group of screens, with navigation arrows.

**Approval.** "¿Se siente como la imaginas?" Light version for small apps: one wireframe file for the main journey.

**Done when.** Every `pantalla` step of an approved flow has a screen with content, states and texts.

---

## Stage 5 · Implementación

**Goal.** The person knows what they will get, in what order, and agrees how to build it.

**Conversation.**
- Propose phases. Phase 1 always ends with something they can use end to end (the smallest useful journey). Each phase delivers complete features, not technical layers.
- For each phase: "Al terminar podrás …". Relative size (pequeña, mediana, grande), never hours or dates.
- Decisions with impact, as consequences with options and a recommendation: where it lives (web that works on phone and computer, or a phone app), approximate monthly cost of hosting and paid services, what personal data is stored, emails or messages sent, languages.
- How they will see results: screenshots and video from the testing team always; a private link once hosting is configured (needs their OK on cost).
- The build mode: **por fases**, **de un tiro** or **hasta la fase N** (explain each in one line; recommend "por fases" for a first project).

**Write.**
- `docs/producto/5-plan-de-fases.md` (template "plan de fases").
- `docs/producto/5-plan-de-fases.visual.json` (`fases`), with `estado` per phase.
- `estado.json`: `etapas.5 = "aprobada"`, `modo`, `hasta_fase`, `fase_actual: 1`.

**Approval.** Explicit green light ("luz verde") and mode. Then go to technical preparation (orchestrator prompt, section 6).
