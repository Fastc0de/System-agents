# Orquesta

Sistema único de vibe coding para Claude Code, pensado para personas que no programan. Conversas con un solo agente, el **orquestador**, en lenguaje natural. Él te guía por cinco etapas para que veas tu app antes de construirla. Después dirige a un equipo técnico que la construye por fases y a un equipo de pruebas que la evalúa contra lo que pediste. Todos trabajan con la memoria del proyecto.

## Instalación

```text
/plugin marketplace add fastc0de/system-agents
/plugin install orquesta@system-agents --scope project
```

Instálalo **por proyecto** (`--scope project`). El plugin convierte al orquestador en el agente principal de la sesión, así que no conviene activarlo en todas tus carpetas. Después abre Claude Code en la carpeta de tu proyecto y empieza a hablar:

```text
Quiero una app para que mi barbería reciba reservas online.
```

Requisitos: Claude Code y `node` en el PATH (lo usan los hooks y los scripts).

## Cómo trabajas con él

| Etapa | Qué ves | Qué decides |
| --- | --- | --- |
| 1 · Visión | La ficha de la idea y un mapa de personas | Si la idea quedó bien contada |
| 2 · Funcionalidades | El catálogo con prioridades y su mapa | Qué entra en la primera versión |
| 3 · Lógica | Un diagrama de flujo por funcionalidad (Mermaid y Excalidraw) | Aprobar cada flujo |
| 4 · Experiencia | Bocetos de las pantallas | Si se siente como la imaginas |
| 5 · Implementación | La línea de fases: «Fase 1: ya podrás…» | Luz verde y el modo |

Modos de construcción: **por fases** (se detiene al final de cada fase), **de un tiro** (todo seguido; solo te interrumpe por decisiones tuyas) o **hasta la fase N**. Puedes cambiar cuando quieras: «para aquí», «sigue de un tiro», «¿cómo vamos?».

Para revisar una app que ya existe, pídeselo: «audita mi app».

## El equipo

| Agente | Modelo | Qué hace | Escribe en |
| --- | --- | --- | --- |
| `orquestador` (principal) | opus | Conversa contigo, escribe tu capa de producto y los flujos, delega, hace cumplir los gates, te reporta en simple | `docs/producto/**`, estado del tablero |
| `scout` | haiku | Explora el código y responde preguntas concretas | — |
| `arquitecto` | opus | Traduce tu capa a la técnica: stack, datos, contrato frontend↔backend, zonas, comandos, paquetes de trabajo | `docs/tecnico/**` |
| `builder-frontend` | sonnet | Construye un paquete de pantallas | Zona frontend |
| `builder-backend` | sonnet | Construye un paquete de servidor, datos y reglas | Zona backend |
| `reviewer` | opus | Revisa cada paquete y ejecuta todas las pruebas | — |
| `jefe-de-pruebas` | opus | Evalúa cada fase desde tus specs y dirige a los testers | `docs/pruebas/**`, `tests/aceptacion`, `tests/e2e`, `tests/regresion` |
| `tester-recorridos` · `tester-servidor` · `tester-limites` · `tester-experiencia` | sonnet | Recorridos en navegador real · reglas y permisos · casos límite y seguridad básica · móvil, accesibilidad y textos | `tests/…`, evidencias |
| `archivista` | sonnet | Escribe la memoria del proyecto | `docs/project-memory/**` |

## Lo que crea en tu proyecto

```text
docs/
  producto/        tu capa, en lenguaje natural (la escribe el orquestador)
  tecnico/         la capa técnica (la escribe el arquitecto)
  pruebas/         planes, matriz de cobertura, registro de fallos, informes
  project-memory/  la memoria del proyecto (la escribe el archivista)
tests/
  aceptacion/ · e2e/ · regresion/   pruebas del equipo de pruebas
```

## Reglas que se cumplen solas (hooks)

| Hook | Evento | Qué garantiza |
| --- | --- | --- |
| `guardia.js` | PreToolUse | Cada rol escribe solo en su zona y ejecuta solo lo que su trabajo necesita. El orquestador lee con propósito (lo voluminoso lo delega al scout) y solo delega en su equipo; el jefe de pruebas solo lanza testers; los builders no tocan las pruebas de aceptación ni de regresión; nadie salta pruebas; el archivista conserva los límites de tu plugin original |
| `contexto.js` | SubagentStart | Cada subagente nace con la memoria, tu capa de producto, lo técnico esencial, los fallos pendientes y las reglas de su rol |
| `cierre.js` | SubagentStop | Ningún agente termina sin su reporte; un builder que dice «done» no termina con las pruebas rápidas en rojo (nivel 1) |
| `diagramas.js` | PostToolUse | Al guardar un flujo o un visual: valida, genera el `.md` y el `.excalidraw` y devuelve los errores |
| `recordatorio.js` | PostToolUse (Agent) | Recuerda al orquestador el siguiente gate y cuenta los FAIL por paquete (máx. 2 ciclos) |
| `inicio.js` | SessionStart | Retoma donde quedaste: memoria, etapa, tablero y fallos pendientes |

## Skills

| Skill | Para qué |
| --- | --- |
| `orquesta:producto` | Etapas, plantillas, formatos de flujos y visuales, reglas de lenguaje. `validar`, `generar`, `todo` |
| `orquesta:tecnico` | Stack de la casa, plantillas de la capa técnica, reglas de paquetes |
| `orquesta:pruebas` | Evaluaciones (fase, re-prueba, app, auditoría) y registro de fallos |
| `orquesta:memoria` | La memoria del proyecto: `init`, `load`, `sync`, `archive`, `status` |

## Scripts

```text
node skills/producto/scripts/diagramas.js validar|generar <ruta>... | todo [raíz]
node skills/pruebas/scripts/registro.js resumen|siguiente|validar [raíz]
node skills/memoria/scripts/archive.js <raíz> [--dry-run]
```

## Pruebas del plugin

```text
node --test tests/*.test.js
```

## Límites conocidos

- La guardia reconoce a cada agente por el `agent_type` que Claude Code pasa a los hooks. Si un entorno no lo enviara, las reglas quedan solo como instrucciones.
- Por la terminal, un agente podría escribir donde no debe con comandos poco comunes; la guardia bloquea los casos habituales y el reviewer revisa qué archivos cambiaron.
- Las pruebas de seguridad son básicas, no una auditoría profesional.
- Publicar la app en internet requiere tu cuenta de alojamiento y tu OK sobre el costo.
- Los hooks necesitan `node`; si falta, fallan abiertos (no bloquean) y no se inyecta contexto.
