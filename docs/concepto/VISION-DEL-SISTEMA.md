# Visión del sistema de agentes · v1

> **Estado:** implementado en [`plugins/orquesta`](../../plugins/orquesta/) (v1.1: diseñador y estilo de la casa; ver sección 18). Este documento explica el diseño; el [README del plugin](../../plugins/orquesta/README.md) explica la instalación y el uso. Las decisiones de la sección 16 se tomaron con las recomendaciones, salvo el empaquetado: es un **sistema único** (un solo plugin) que reemplaza a los plugins anteriores.

Este documento es el mapa general. Dos temas tienen su propio documento:

- **[Conversación por etapas](ETAPAS-DE-CONVERSACION.md):** cómo te habla el orquestador, qué ves y qué decides en cada etapa, y los modos de construcción.
- **[Sistema de pruebas](SISTEMA-DE-PRUEBAS.md):** los cuatro niveles de prueba, el jefe de pruebas con sus testers y el registro de fallos.

Diagramas (ábrelos en [excalidraw.com](https://excalidraw.com) con *Open*, o con la extensión de Excalidraw de VS Code; cada uno tiene su vista previa `.png` al lado):

| Diagrama | Qué explica |
| --- | --- |
| [`01-arquitectura`](diagramas/01-arquitectura.png) | Quién habla con quién, quién escribe qué y qué reglas se cumplen solas |
| [`02-ciclo-de-vida`](diagramas/02-ciclo-de-vida.png) | De tu idea a la app probada: etapas, preparación técnica, construcción y pruebas por fases |
| [`03-memoria-y-contexto`](diagramas/03-memoria-y-contexto.png) | Cómo tu `project-memory` llega a cada agente y cómo se actualiza |
| [`04-anatomia-de-una-funcionalidad`](diagramas/04-anatomia-de-una-funcionalidad.png) | Lo que lees tú (lenguaje natural) frente a lo que leen los agentes (técnico) |
| [`05-etapas-de-conversacion`](diagramas/05-etapas-de-conversacion.png) | Las cinco etapas de la conversación y los modos de construcción |
| [`06-sistema-de-pruebas`](diagramas/06-sistema-de-pruebas.png) | Niveles de prueba, evaluación orquestada y registro de fallos |

---

## 1. En una frase

Tú le cuentas al **orquestador**, en tus palabras, qué app quieres. Él te acompaña por **cinco etapas** para que veas la visión, las funcionalidades, la lógica, las pantallas (y elijas su aspecto entre tres estilos que te propone un **diseñador**) y el plan antes de construir nada. Después, un **equipo técnico** traduce todo eso a documentación técnica, **builders especializados** (frontend y backend) lo construyen por fases, y un **equipo de pruebas** evalúa cada fase contra lo que tú pediste. Todos trabajan con la **memoria del proyecto**, y tú recibes los resultados en lenguaje simple.

![Arquitectura](diagramas/01-arquitectura.png)

---

## 2. Qué cambió respecto a la v0

| Pediste | Cómo queda en la v1 |
| --- | --- |
| El orquestador debe conversar con alguien que no programa | Habla sin jerga, pregunta por consecuencias y no por tecnologías, y te muestra resultados en tus términos. Las decisiones técnicas las toma el equipo técnico ([reglas de conversación](ETAPAS-DE-CONVERSACION.md#2-cómo-te-habla-el-orquestador)) |
| Specs en lenguaje natural ("crea un sistema de login") | **Dos capas de documentación:** la tuya (`docs/producto/`) solo en lenguaje natural, y la técnica (`docs/tecnico/`) en segundo plano para los agentes. Cada pieza técnica apunta a tu funcionalidad (sección 5) |
| Conversación por etapas para ver visión, lógica, implementación y funcionalidades antes de delegar | **Cinco etapas** (visión, funcionalidades, lógica, experiencia e implementación), cada una con algo que ves y algo que decides. Nada se delega hasta tu luz verde |
| Elegir si se construye por fases o de un tiro | **Tres modos:** por fases, de un tiro o hasta la fase N. Puedes cambiar de modo en cualquier momento |
| Dividir al programador en especialistas | **Builder frontend** y **builder backend**, coordinados por un **contrato** que define el arquitecto técnico. Más especialistas opcionales (móvil, integraciones, despliegue) |
| Un sistema de pruebas robusto y orientado a specs | **Cuatro niveles de prueba**, un **jefe de pruebas** que orquesta a **cuatro testers** especializados, y un **registro de fallos** donde cada fallo queda como prueba permanente ([sistema de pruebas](SISTEMA-DE-PRUEBAS.md)) |
| Poder probar una app ya hecha | **Modo auditoría:** el equipo de pruebas describe lo que hace la app, tú lo confirmas y se evalúa entera |
| (v1.1) Un frontend con una estética predefinida, tipo Anthropic, pero original y con opciones | **Diseñador** y **estilo de la casa:** tres direcciones con tus pantallas reales (fiel a la casa, con el mundo de tu producto, un salto) y un **sistema de diseño** que el builder frontend implementa y el reviewer verifica (sección 4) |

---

## 3. Principios de diseño

1. **Una sola voz.** Hablas con un único agente. Los demás nunca te piden nada directamente.
2. **Tú decides qué; el equipo decide cómo.** Tú defines qué hace la app y cómo se siente. Las tecnologías y la estructura del código las decide el equipo técnico. Solo te consulta cuando una decisión técnica te afecta: costo, plataformas, privacidad o tiempos.
3. **Ver antes de construir.** Nada se construye hasta que viste y aprobaste la funcionalidad, su lógica, sus pantallas y su aspecto.
4. **Dos capas, una verdad.** Tu documentación y la técnica describen lo mismo con distinto lenguaje. Cada pieza técnica apunta a una funcionalidad tuya por su id.
5. **Nadie se califica a sí mismo.** Los builders construyen, el reviewer revisa cada paquete y el equipo de pruebas evalúa cada fase.
6. **Nada se olvida.** Cada fallo encontrado se convierte en una prueba que se ejecuta para siempre.
7. **Tareas pequeñas y verificables.** El trabajo se parte en paquetes pequeños, uno por especialidad.
8. **La memoria es evidencia.** Se escribe solo con lo verificado y al cerrar cada fase, siempre a través del `archivista`.
9. **Lo crítico se garantiza con código.** Las reglas importantes las hacen cumplir hooks, no un "por favor" en el prompt.

---

## 4. El equipo

| Rol | Qué hace | Escribe en | Modelo propuesto |
| --- | --- | --- | --- |
| **Orquestador** (hilo principal) | Conversa contigo por etapas, escribe tu capa de producto, traduce, delega, hace cumplir los gates y te reporta en lenguaje simple | `docs/producto/**` y el estado del tablero. Lee con propósito: archivos concretos sí; exploraciones amplias, archivos enormes y registros, al scout | `opus` |
| **Scout** | Lee el código existente y responde preguntas concretas | Nada | `haiku` |
| **Diseñador** | En la etapa 4 propone tres direcciones visuales con tus pantallas; con tu elección escribe el sistema de diseño (tokens, componentes, referencia navegable) y lo ajusta en cambios solo visuales | `docs/diseno/**` | `opus` |
| **Arquitecto técnico** | Traduce tu capa de producto a la capa técnica: tecnologías, datos, **contrato frontend↔backend**, spec técnica por funcionalidad y paquetes de trabajo por especialidad | `docs/tecnico/**` | `opus` |
| **Builder frontend** | Pantallas, navegación, formularios, estilos: lo que ves y tocas. Habla con el backend solo a través del contrato y viste las pantallas solo con el sistema de diseño | Código de frontend + sus pruebas rápidas | `sonnet` |
| **Builder backend** | Servidor, datos, reglas de negocio, permisos, pagos, correos | Código de backend + sus pruebas rápidas | `sonnet` |
| **Reviewer** | Revisa cada paquete: ejecuta todas las pruebas, contrasta con la spec técnica y con tu funcionalidad, vigila el alcance. PASS o FAIL | Nada | `opus` |
| **Jefe de pruebas** | Orquesta la evaluación de cada fase: arma el plan desde tus specs, lo reparte entre los testers, consolida y decide. Lleva el registro de fallos | `docs/pruebas/**` | `opus` |
| **Testers ×4** | Recorridos de usuario en navegador real · servidor y reglas · casos límite y seguridad · experiencia (móvil, accesibilidad, textos) | Pruebas automáticas (`tests/aceptacion`, `tests/e2e`, `tests/regresion`) | `sonnet` |
| **Archivista** (tu `project-archiver`, integrado) | `init`, `sync` y `archive` de la memoria | `docs/project-memory/**` | `sonnet` |

**Especialistas opcionales**, que el arquitecto técnico propone solo si el proyecto los necesita: **móvil** (app nativa), **integraciones** (pagos, mensajería, servicios externos complejos) y **despliegue** (publicar la app en internet).

### Por qué frontend y backend separados, y cómo se coordinan

- **Contexto más limpio:** cada builder recibe solo las convenciones, archivos y reglas de su lado. Esto reduce errores.
- **Paralelismo natural:** el frontend y el backend de una misma funcionalidad tocan archivos distintos, así que pueden construirse a la vez.
- **El contrato es el punto de encuentro:** antes de construir, el arquitecto técnico escribe en `docs/tecnico/contrato-api.md` qué datos se piden y se devuelven en cada operación. El frontend construye contra ese contrato y el backend lo cumple. Si uno de los dos necesita cambiarlo, se detiene y lo reporta (`CONTRACT GAP`); el arquitecto ajusta el contrato y los dos siguen. Ninguno lo cambia por su cuenta.
- **Cada uno guarda solo lo suyo:** como comparten la carpeta, cuando un paquete pasa la revisión y el otro sigue abierto, el orquestador guarda (commit) solo los archivos de ese paquete, que el reviewer lista.

### Por qué un diseñador aparte, y cómo se coordina con el frontend

Crear un estilo y construir pantallas son trabajos distintos, con criterios distintos. Si el builder frontend también inventara el aspecto, cada paquete (hecho por una invocación nueva) lo reinventaría a su manera y la app acabaría pareciendo de varias manos, o con el aspecto genérico de las apps generadas.

- **Estilo de la casa:** una estética por defecto cálida, editorial y serena, inspirada en el lenguaje visual de Anthropic (papel, letras de libro, un acento terroso, aire, movimiento sobrio), con una lista de lo que nunca se hace. Inspirada, no copiada: nunca su marca ni sus tipografías comerciales. Si traes tu marca, tu marca manda.
- **Original en cada proyecto:** el diseñador propone tres **direcciones** con tus pantallas y textos reales: A · fiel a la casa, B · la casa con el mundo de tu producto, C · un salto más atrevido. Cada una con una **firma** propia (en la barbería: la raya del poste y la confirmación como ticket) y, aparte, **opciones de experiencia** (modo oscuro, instalable en el móvil, fotos, movimiento) con su consecuencia.
- **El sistema de diseño es el segundo contrato del frontend:** con tu elección, el diseñador escribe `docs/diseno/` (tokens validados por un hook, componentes con todos sus estados y una referencia navegable de todas las pantallas). El builder frontend lo implementa con tokens y componentes base, sin valores sueltos; si algo visible no está cubierto, se detiene (`DESIGN GAP`). El reviewer y el tester de experiencia lo verifican.
- **A veces, el frontend va por separado:** un cambio solo visual pasa por el diseñador y se convierte en paquetes solo de frontend; el backend y el contrato no se tocan.

### Por qué el orquestador es el hilo principal

Solo el agente principal de la sesión conversa contigo. Claude Code permite que ese agente principal sea uno personalizado, con `claude --agent` o con un `settings.json` dentro del plugin que lo activa por defecto. Lo verifiqué en la documentación actual.

### La única excepción a la jerarquía plana: el jefe de pruebas

Por defecto, ningún subagente puede delegar (así se evita el teléfono descompuesto). La excepción es el jefe de pruebas, que lanza a sus testers. Claude Code permite que un subagente lance otros subagentes (hasta tres niveles por debajo de la conversación principal; también lo verifiqué). Un hook garantiza que el jefe de pruebas **solo** pueda lanzar testers y que los testers no puedan lanzar a nadie.

---

## 5. Dos capas de documentación

![Anatomía de una funcionalidad](diagramas/04-anatomia-de-una-funcionalidad.png)

| | Capa de producto (la tuya) | Capa técnica (la de los agentes) |
| --- | --- | --- |
| Lenguaje | Natural, sin jerga | Técnico |
| La escribe | El orquestador, contigo | El arquitecto técnico |
| Ejemplo | "Tus clientes entran con su correo y su contraseña. Si se equivocan 5 veces seguidas, la cuenta se pausa 15 minutos." | "Comparación con la contraseña cifrada, contador de intentos, pausa de 15 min, sesión segura de 7 días." |
| ¿La necesitas leer? | Sí, es tuya | No. Si quieres, el orquestador te la explica |

```text
docs/
  producto/                     TU CAPA · la escribe el orquestador
    1-idea.md                     problema, para quién, cómo sabremos que funciona
    2-funcionalidades.md          catálogo FUN-01, FUN-02… con prioridad
    3-logica/                     una ficha por funcionalidad + sus flujos
      FUN-03-iniciar-sesion.md
      F01-iniciar-sesion.flow.json   fuente del flujo
      F01-iniciar-sesion.md          generado: diagrama Mermaid + pasos
      F01-iniciar-sesion.excalidraw  generado: mapa visual
    4-experiencia/                pantallas y bocetos
    5-plan-de-fases.md            qué tendrás al final de cada fase
    glosario.md                   los pocos términos técnicos inevitables, explicados
  diseno/                       DISEÑO · lo escribe el diseñador, con tu elección
    direcciones.html              tres estilos con tus pantallas, para elegir
    tokens.json → tokens.css      colores, letras, espacios y movimiento (validados)
    sistema.md · referencia.html  componentes, estados y tu app navegable
  tecnico/                      CAPA TÉCNICA · la escribe el arquitecto técnico
    arquitectura.md · datos.md · contrato-api.md
    specs/FUN-03-iniciar-sesion.md
    trabajo/PLAN.md · trabajo/WP-007.md …
  pruebas/                      CAPA DE PRUEBAS · la escribe el jefe de pruebas
    matriz-de-cobertura.md · planes/ · registro-de-fallos.md · informes/
  project-memory/               MEMORIA (tu formato) · la escribe el archivista
tests/
  unit/ (builders) · aceptacion/ · e2e/ · regresion/ (equipo de pruebas)
```

**Trazabilidad.** Todo se conecta por ids, de tu frase a tu informe. `FUN-03` es tu funcionalidad; `F01:crear_sesion` es un paso de su flujo; `WP-007` es un paquete que lo implementa; la prueba de aceptación cita el criterio que verifica. Por eso el informe final puede decirte "Iniciar sesión ✅ 7/7" y no "auth.test.ts passed".

### Los flujos: lógica visible

En la etapa 3, el orquestador dibuja cada funcionalidad como un **diagrama de flujo con tus palabras**: "¿La contraseña coincide?", no "bcrypt.compare()". Mantiene lo que la v0 ya proponía:

- **La fuente es un archivo de datos** (`.flow.json`) y un generador produce las vistas: un `.md` con Mermaid para leer y un `.excalidraw` para ver. El orquestador no dibuja coordenadas (ahí los modelos fallan); describe pasos y ramas.
- **Un validador** revisa cada flujo al guardarlo: todo paso alcanzable, todo camino con final, toda decisión con sus ramas etiquetadas y todo fallo posible con su salida.
- **Estados y versiones:** borrador, en revisión, aprobado. Cambiar uno aprobado sube su versión y marca el trabajo afectado.

Cada paso del flujo tiene su ficha en lenguaje natural: qué pasa, qué ve la persona, qué reglas aplican y qué pasa si algo sale mal. Los detalles técnicos de cada paso viven en la capa técnica, enlazados por el id del paso.

---

## 6. Cómo trabajas tú

Tu trabajo es **contar, ver, decidir y probar**. El detalle está en **[Conversación por etapas](ETAPAS-DE-CONVERSACION.md)**.

![Etapas de conversación](diagramas/05-etapas-de-conversacion.png)

| Etapa | Ves | Decides |
| --- | --- | --- |
| 1 · Visión | La ficha de la idea y un mapa de personas | Si la idea quedó bien contada |
| 2 · Funcionalidades | El catálogo, con prioridades | Qué entra en la primera versión |
| 3 · Lógica | Un diagrama de flujo por funcionalidad | Aprobar cada flujo |
| 4 · Experiencia | Bocetos de las pantallas, tres estilos y tu app navegable en el elegido | Qué estilo y si se siente como la imaginas |
| 5 · Implementación | Las fases: "Fase 1: ya podrás…" | Luz verde y el modo |

**Modos de construcción:**

| Modo | Qué pasa |
| --- | --- |
| **Por fases** | Al terminar cada fase se detiene, te muestra la demo y el informe de pruebas, y espera tu luz verde |
| **De un tiro** | Construye todas las fases seguidas, con sus pruebas. Solo te interrumpe si hay una pregunta que solo tú puedes responder |
| **Hasta la fase N** | De un tiro hasta donde digas, y ahí te muestra |

En cualquier momento puedes decir "para aquí", "sigue de un tiro" o "¿cómo vamos?".

---

## 7. Ciclo de vida

![Ciclo de vida](diagramas/02-ciclo-de-vida.png)

| Bloque | Quién | Resultado | Gate |
| --- | --- | --- | --- |
| Etapas 1–5 | Orquestador ↔ tú (diseñador en la etapa 4) | Tu capa de producto y tu diseño completos y aprobados. Sync de memoria (una spec aprobada es un hito para tu skill) | Tú: luz verde y modo |
| Preparación técnica | Arquitecto técnico → orquestador | Capa técnica + paquetes. El orquestador comprueba que cada funcionalidad y cada criterio tienen paquete y prueba prevista, y te da un resumen de 5 líneas | Cobertura completa |
| Construcción (por paquete) | Builder frontend o backend → reviewer | Código + pruebas rápidas (nivel 1) + revisión (nivel 2) | Reviewer: PASS |
| Evaluación de fase | Jefe de pruebas + testers | Informe por funcionalidad + registro de fallos al día (nivel 3) | Jefe de pruebas: la fase pasa |
| Cierre de fase | Orquestador → archiver | Memoria sincronizada, informe y demo para ti, fase integrada en la rama base | Tú (en modo por fases) |
| Final | Jefe de pruebas + testers | Evaluación de la app completa (nivel 4) | Entrega |

**Bucles:** un FAIL del reviewer vuelve al mismo builder (máximo 2 ciclos; después se escala). Cada fallo de la evaluación de fase se convierte en un paquete de corrección y en una prueba de regresión, y se vuelve a evaluar. Un cambio de idea te devuelve a la etapa que corresponda, y el orquestador te explica antes el impacto en simple. Un cambio solo visual va al diseñador y se construye con paquetes solo de frontend.

---

## 8. Disciplina de cargas de trabajo

### 8.1 Fases

Una **fase** es un conjunto de paquetes que termina en algo que **puedes probar**. La fase 1 siempre incluye el esqueleto (la app arranca, las pruebas corren) y al menos una funcionalidad completa de punta a punta. Cada fase añade funcionalidades completas, con su frontend y su backend; no se construyen capas sueltas como "todo el backend primero".

### 8.2 El paquete de trabajo (WP)

Lo escribe el arquitecto técnico. Cada paquete es de **una sola especialidad**:

```markdown
# WP-008: Inicio de sesión · backend
- Especialidad: backend
- Fase: 1
- Funcionalidad: FUN-03 Iniciar sesión
- Cubre: F01:password_ok, F01:limite, F01:crear_sesion (incluye ramas de error)
- Contrato: docs/tecnico/contrato-api.md#sesiones
- Depende de: WP-002 (datos de usuarios)
- En paralelo con: WP-007 (frontend de la misma funcionalidad)
- Tamaño: M
- Archivos en alcance: …
## Objetivo
## Criterios técnicos de aceptación (cada uno ligado a un criterio de FUN-03 o a un paso)
## Verificación (comando)
## Fuera de alcance
```

### 8.3 Límites

| Regla | Valor propuesto |
| --- | --- |
| Tamaño de paquete | **S:** ≤3 archivos, ~150 líneas · **M:** ≤8 archivos, ~400 líneas · **L: prohibido**, se divide |
| Builders a la vez | **2** (un frontend y un backend, en archivos distintos). Más, con espacios de trabajo aislados en una versión posterior |
| Ciclos de corrección por paquete | Máx. **2**; después se escala al orquestador |
| Preguntas por ronda en la conversación | 2–4, con opciones y recomendación |

### 8.4 Definición de terminado (paquete)

1. Las pruebas rápidas del builder pasan (nivel 1, garantizado por hook).
2. El reviewer ejecutó **todas** las pruebas del proyecto y pasan (nivel 2).
3. Cada criterio técnico tiene evidencia, incluidas las ramas de error.
4. No hay cambios fuera del alcance sin justificar, y no se tocaron pruebas de aceptación ni de regresión.
5. Sin pruebas desactivadas, sin `TODO` que oculten funcionalidad pendiente y sin secretos en el código.
6. Commit hecho y tablero actualizado.

Una **fase** está terminada cuando además pasa la evaluación de fase (nivel 3) del jefe de pruebas.

### 8.5 Protocolos de parada: nadie improvisa

| Señal | Cuándo | Qué pasa |
| --- | --- | --- |
| `PRODUCT GAP` | La spec no responde algo que afecta a lo que ves o vives como usuario | El orquestador te lo pregunta en simple, actualiza tu capa y el trabajo sigue |
| `CONTRACT GAP` | El frontend o el backend necesita cambiar el contrato | El arquitecto ajusta el contrato; los dos builders siguen |
| `DESIGN GAP` | El frontend necesita algo visible e importante que el sistema de diseño no cubre | El diseñador lo diseña (ajuste); si cambia lo que aprobaste, te lo enseña antes |
| `SCOPE GAP` | Hay que tocar archivos fuera del alcance de forma importante | El arquitecto replanifica el paquete |
| `BLOCKED` | Falla algo ajeno al paquete | Se resuelve en otro paquete o se escala |

Las dudas técnicas menores las resuelve el builder con la opción conservadora y las declara como supuesto en su reporte. Las dudas de producto nunca: esas siempre llegan a ti. Los textos con significado (títulos, botones, mensajes, errores) son siempre los que aprobaste; los textos menores sin significado de producto (ejemplos en campos, descripciones para lectores de pantalla) los escribe el builder en el tono de tu app y los lista para que los veas en el informe.

### 8.6 Higiene de contexto

- El orquestador **lee con propósito**: documentos, reportes y archivos concretos para comprobar algo o responderte; las exploraciones amplias, los archivos enormes, los registros y los cambios extensos se los pide al scout. Un hook bloquea las lecturas voluminosas y le indica que delegue.
- Cada encargo es un brief autocontenido. El resto del contexto lo inyecta un hook.
- Los subagentes devuelven reportes estructurados y cortos, nunca transcripciones.

### 8.7 Git

Una rama por fase y un commit por paquete aprobado, con solo los archivos de ese paquete cuando hay otro abierto. Al pasar la evaluación, la fase se integra en la rama base (`merge --no-ff`) y la siguiente sale de ahí. Los builders nunca hacen commit. `push` y publicación solo cuando tú lo pidas.

---

## 9. Sistema de pruebas (resumen)

![Sistema de pruebas](diagramas/06-sistema-de-pruebas.png)

| Nivel | Cuándo | Quién | Garantía |
| --- | --- | --- | --- |
| 1 · Mini-pruebas | Mientras se construye | Builder | Un hook no deja terminar al builder con pruebas en rojo |
| 2 · Verificación del paquete | Al terminar cada paquete | Reviewer | Ejecuta todas las pruebas y revisa contra las specs |
| 3 · Evaluación de fase | Al cerrar cada fase | Jefe de pruebas + 4 testers | Pruebas desde tus specs + recorridos reales + toda la regresión |
| 4 · Evaluación de app completa | Al final, a pedido o sobre una app ya hecha | Igual, a escala de toda la app | Informe completo por funcionalidad |

Cada fallo se reproduce con una **prueba automática antes de arreglarlo**, se registra en lenguaje simple y técnico (`FALLO-012`) y la prueba queda **para siempre** en la batería de regresión, que se ejecuta primero en cada evaluación. Si un fallo vuelve, se marca como **reincidente** y se escala. Todo el detalle está en **[Sistema de pruebas](SISTEMA-DE-PRUEBAS.md)**.

---

## 10. Memoria integrada (tu `project-memory`)

![Memoria y contexto](diagramas/03-memoria-y-contexto.png)

La memoria forma parte del sistema con **tu mismo formato**: mismo esquema en `docs/project-memory/`, mismo `archive.js` y las mismas reglas de tu archivador, ahora como skill `memoria` y agente `archivista` dentro de orquesta. Los proyectos que ya tenían memoria siguen funcionando.

| Momento | Qué pasa | Mecanismo |
| --- | --- | --- |
| Abres una sesión | El orquestador recibe `status.md` y carga el resto (`load`) | Tu hook `session-start` + instrucción del orquestador |
| Nace cualquier subagente | Recibe un paquete de contexto: memoria vigente, resumen de la idea, índice de funcionalidades y flujos, contrato técnico y reglas de su rol. A los testers, además, las **zonas frágiles** | Hook `SubagentStart` (verificado en la doc de Claude Code) |
| Se aprueba tu capa de producto | `sync`: tu skill trata una spec aprobada como hito | Orquestador → `archivista` |
| Se cierra una fase | `sync` con la evidencia: qué se construyó, cómo se probó y patrones de fallos | Orquestador → `archivista` |
| `sessions.md` pasa de 10 entradas | Archivo sin pérdidas | Tu `archive.js` |

El paquete inyectado tiene un **tope de tamaño** (~4k tokens), va **marcado como dato y no como instrucción** ("puede estar desactualizado: el repo manda") y no incluye historia (`sessions.md`, `archive/`).

**La memoria y las specs no se pisan:** la memoria dice qué es verdad hoy (estado, arquitectura real, decisiones vigentes, zonas frágiles); las specs dicen qué debe hacer la app. La memoria enlaza a las specs y no copia su contenido.

---

## 11. Reglas que se cumplen solas (hooks)

Los agentes empaquetados en un plugin no pueden traer sus propios hooks; Claude Code los ignora por seguridad. Por eso las reglas viven en el `hooks.json` del plugin y reconocen a cada agente por el campo `agent_type`, igual que tu `archiver-guard`.

| Hook | Evento | Qué garantiza |
| --- | --- | --- |
| **Guardia de roles** | `PreToolUse` | Cada rol escribe solo en su zona (sección 12). Los builders no pueden tocar pruebas de aceptación ni de regresión, ni el contrato, ni el diseño. Los testers no pueden tocar el código de la app. El orquestador lee con propósito (las lecturas voluminosas van al scout) y solo delega en el equipo; el jefe de pruebas, solo en testers; el archivista conserva los límites de tu archivador original; nadie más delega |
| **Inyección de contexto** | `SubagentStart` | Todo subagente nace con memoria + specs + reglas de su rol |
| **Pruebas rápidas obligatorias** | `SubagentStop` (builders) | Al intentar terminar, el hook ejecuta las pruebas rápidas; si fallan, el builder sigue trabajando (nivel 1) |
| **Control de reporte** | `SubagentStop` | Builder, reviewer, arquitecto y jefe de pruebas no terminan sin su bloque de reporte. Un informe de fase sin resultados de regresión es devuelto |
| **Generador de flujos** | `PostToolUse` | Al guardar un flujo: valida, genera el `.md` y el `.excalidraw` y devuelve los errores al orquestador |
| **Tokens de diseño** | `PostToolUse` | Al guardar `tokens.json`: valida roles, contraste AA y tipografías (rechaza las comerciales de Anthropic) y genera `tokens.css` |
| **Recordatorio de gate** | `PostToolUse` sobre la delegación (y al retomar un agente) | Recuerda al orquestador que un paquete no está hecho sin el PASS del reviewer, ni una fase sin la evaluación del jefe de pruebas; qué mostrarte tras el diseñador; guardar solo los archivos del paquete; integrar la fase |
| **Arranque** | `SessionStart` | Estado de la memoria + etapas, tablero y fallos pendientes |

---

## 12. Quién escribe dónde

| Ruta | Escribe | Lee |
| --- | --- | --- |
| `docs/producto/**` | Solo el orquestador (los diagramas los genera el hook) | Todos |
| `docs/diseno/**` | Solo el diseñador (`tokens.css` lo genera el hook) | Todos; es el contrato visual del frontend |
| `docs/tecnico/**` | Solo el arquitecto técnico (el orquestador solo cambia el estado del tablero) | Todos |
| `docs/pruebas/**`, `tests/aceptacion`, `tests/e2e`, `tests/regresion` | Solo el jefe de pruebas y los testers | Todos |
| Código de frontend + sus pruebas rápidas | Builder frontend, dentro del alcance de su paquete | Reviewer, testers, scout |
| Código de backend + sus pruebas rápidas | Builder backend, dentro del alcance de su paquete | Reviewer, testers, scout |
| `docs/project-memory/**` | Solo el `archivista` | Todos (inyectada) |

---

## 13. Cómo está empaquetado

Un **sistema único**: un solo plugin de Claude Code, `orquesta`, publicado en el marketplace de este repo. Reemplaza a los plugins anteriores; la memoria y las pruebas viven dentro.

```text
System-agents/
  .claude-plugin/marketplace.json
  plugins/orquesta/
    .claude-plugin/plugin.json
    settings.json                    { "agent": "orquestador" }: el orquestador es el agente principal
    agents/                          orquestador, scout, diseñador, arquitecto, builder-frontend, builder-backend,
                                     reviewer, jefe-de-pruebas, 4 testers y archivista
    skills/producto/                 etapas, plantillas, formatos y el generador de diagramas
    skills/diseno/                   estilo de la casa, plantillas del sistema de diseño y validador de tokens
    skills/tecnico/                  stack de la casa y plantillas técnicas
    skills/pruebas/                  evaluación y registro de fallos
    skills/memoria/                  tu sistema de memoria, integrado
    hooks/                           guardia, contexto, cierre, diagramas, diseño, recordatorio, inicio
    tests/                           pruebas automáticas del propio plugin
```

- El `settings.json` convierte al orquestador en el agente principal de la sesión, así que se instala **por proyecto**.
- Para revisar una app ya hecha no hace falta otro plugin: se le pide al orquestador («audita mi app») o se usa `/orquesta:pruebas auditoria`.

---

## 14. Cómo verás los resultados

Una persona que no programa no debería tener que ejecutar comandos para ver su app. Propongo tres formas, combinables (decisión 9):

| Forma | Qué es | Requisito |
| --- | --- | --- |
| **Capturas y video** | El tester de recorridos usa la app en un navegador real; las capturas y un video corto de cada recorrido van en tu informe | Ninguno |
| **Enlace de prueba** | La app publicada en una dirección privada para que la uses desde tu móvil u ordenador | Configurar el alojamiento: lo haría el especialista de despliegue, con tu aprobación del costo |
| **Guía para probar** | "Entra, pulsa Reservar, elige mañana a las 10…": qué hacer para comprobar cada funcionalidad nueva | Viene con cualquiera de las anteriores |

---

## 15. Límites honestos y riesgos

| Límite | Mitigación |
| --- | --- |
| La guardia depende de que Claude Code envíe `agent_type` a los hooks (lo hace en subagentes y con `--agent`) | Las instrucciones repiten los límites; el reviewer revisa qué archivos cambiaron |
| Por la terminal (`Bash`), un agente podría escribir donde no debe; no se puede blindar cada comando | La guardia bloquea los casos obvios y el reviewer y el jefe de pruebas detectan el resto |
| Las pruebas de seguridad son básicas (accesos indebidos, datos maliciosos), no una auditoría profesional | Se dice así en el informe; si la app maneja pagos o datos sensibles, se recomienda una revisión externa |
| Estimar tiempos con IA es poco fiable | Las fases se describen por lo que entregan y su tamaño relativo, no en horas |
| Más agentes y modelos `opus` cuestan más | Modo económico (decisión 4) y evaluaciones de fase centradas en lo que cambió y lo crítico |
| El paralelismo puede generar conflictos | Solo frontend y backend a la vez, en archivos distintos, contra un contrato fijo |
| Una spec aprobada puede estar equivocada | La demo de cada fase y los cambios de idea existen para eso |
| Los hooks necesitan `node` | Si falta, fallan abiertos (no bloquean) y no se inyecta contexto |

---

## 16. Decisiones

**Decididas:** todas con la recomendación, salvo la 10, donde manda tu pedido de un sistema único.

| # | Decisión | Opciones | Recomiendo |
| --- | --- | --- | --- |
| 1 | ¿Quién hace los commits? | (a) el orquestador, uno por paquete aprobado · (b) tú | **(a)**, y publicar solo cuando lo pidas |
| 2 | Paralelismo | (a) frontend + backend a la vez · (b) uno a la vez | **(a)** |
| 3 | Especialistas | (a) frontend y backend fijos, más opcionales (móvil, integraciones, despliegue) cuando haga falta · (b) solo frontend y backend | **(a)** |
| 4 | Modelos | (a) calidad: los que piensan y juzgan en `opus`, los que construyen y prueban en `sonnet` · (b) económico: solo el orquestador en `opus` | **(a)**; (b) para proyectos pequeños |
| 5 | Tecnologías | (a) un "stack de la casa" que el equipo usa siempre salvo que algo lo impida · (b) el arquitecto elige en cada proyecto | **(a)**: más predecible y mejor probado; tú no tienes que elegirlo |
| 6 | Etapa 4 (bocetos de pantallas) | (a) siempre · (b) opcional en apps pequeñas | **(a)**, en versión ligera para apps pequeñas |
| 7 | Evaluación de fase en modo "de un tiro" | (a) se corrige sola y solo te interrumpe si un fallo requiere una decisión tuya · (b) se detiene ante cualquier fallo | **(a)** |
| 8 | Granularidad de aprobación en la etapa 3 | (a) apruebas cada flujo · (b) todos juntos | **(a)** al principio |
| 9 | Cómo ver los resultados | (a) capturas y video · (b) enlace de prueba · (c) ambas | **(c)**: capturas y video desde la fase 1, enlace cuando se configure el alojamiento |
| 10 | Empaquetado | (a) tres plugins · (b) uno solo | **(b) sistema único**, por tu decisión: un solo plugin `orquesta` que reemplaza a los anteriores |
| 11 | Idioma | (a) instrucciones internas de los agentes en inglés; todo lo que tú ves, en español · (b) todo en español | **(a)** |
| 12 | Activación | (a) por proyecto · (b) en todas tus sesiones | **(a)** |
| 13 | (v1.1) Dónde vive la parte creativa del frontend | (a) un agente diseñador con su capa `docs/diseno/` · (b) solo afinar el builder frontend | **(a)**, por tu decisión: crear y construir son trabajos distintos, y así ves el aspecto antes de construir |

---

## 17. Estado de la implementación

Implementado en `plugins/orquesta` (v1.0):

- Los 13 agentes, las 5 skills y los 7 hooks descritos en este documento.
- El generador de diagramas: flujos (Mermaid + Excalidraw con carriles por actor y flechas que no atraviesan cajas), mapas, bocetos y línea de fases. Hay un ejemplo en [`ejemplos/barberia`](../../ejemplos/barberia/).
- 45 pruebas automáticas del propio plugin (`node --test tests/*.test.js`).
- Verificado en una sesión real de Claude Code: el orquestador arranca como agente principal, delega en el scout y en el jefe de pruebas, cada subagente recibe la memoria sin pedirla, la guardia bloquea al orquestador si intenta escribir código, al guardar un flujo se generan sus vistas, y el jefe de pruebas lanza a sus testers.

Pendiente para próximas versiones:

- Actualizar los diagramas 01, 02 y 05 con el diseñador y la capa `docs/diseno/` (hoy los describe este documento).
- **Modo económico** (decisión 4b): hoy los modelos están fijos en cada agente.
- **Abrir la app en tu ordenador** sin comandos (una demo local que lance el orquestador); hoy la ves en capturas, video y `referencia.html`.

- **Especialistas opcionales** (móvil nativo, integraciones complejas, despliegue): hoy las integraciones las hace el builder backend y la publicación se prepara como un paquete más, con tu cuenta y tu OK sobre el costo.
- **Espacios de trabajo aislados** para más de dos builders a la vez.
- Una primera app real construida de punta a punta con el sistema, para afinar los prompts con la experiencia.

---

## 18. Cambios de la v1.1

| Qué | Por qué |
| --- | --- |
| **Diseñador** (`disenador`), skill `diseno` y estilo de la casa | La estética que te gusta como punto de partida, original en cada proyecto y con opciones que eliges viendo tus pantallas |
| Sistema de diseño como contrato visual (`tokens.json` validado → `tokens.css`, `sistema.md`, `referencia.html`) | Que cada paquete de frontend, hecho por un builder distinto, parezca la misma app; el reviewer y el tester de experiencia lo verifican |
| `DESIGN GAP` y textos menores en el builder frontend | Que no improvise un aspecto nuevo, y que no te interrumpa por un texto de ayuda sin importancia |
| Commit solo de los archivos del paquete cuando hay otro abierto; revisiones en paralelo sin mezclar | Antes, `git add -A` guardaba en el commit de un paquete los cambios sin revisar del paquete paralelo |
| Pruebas rápidas por proyecto de Vitest (`frontend` / `backend`) | Antes, las del frontend incluían `src/app/api` y el backend en paralelo bloqueaba al frontend; y faltaba el entorno de pruebas de componentes |
| Zonas con exclusiones (`"!src/app/api/**"`) | El frontend no podía escribir pruebas ni componentes dentro de `src/app` |
| Integración de cada fase en la rama base (`merge --no-ff`) | Antes las ramas de fase se apilaban y la rama principal nunca recibía la app |
| Recordatorio también al retomar un agente (`SendMessage`) y aviso si se lanzó en segundo plano | Los gates no se saltan al corregir, y no hay falsas alarmas |
