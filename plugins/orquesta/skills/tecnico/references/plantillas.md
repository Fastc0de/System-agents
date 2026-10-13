# Technical-layer templates

The architect writes `docs/tecnico/`. It translates the approved product layer; it never changes what the person decided. Write it in the same language as the product layer. Every technical piece cites the product ids it serves (`FUN-03`, `F01:crear_sesion`, `CA2`).

```text
docs/tecnico/
  arquitectura.md        stack, components, how a request flows, deviations from the house stack
  datos.md               entities, fields, relations, rules enforced by the data
  contrato-api.md        every operation between frontend and backend
  zonas.json             which files each builder may write
  comandos.json          install, run, quick tests, verification, acceptance, regression
  specs/FUN-xx-<slug>.md technical spec per feature
  trabajo/PLAN.md        phases and the work board
  trabajo/WP-xxx.md      one file per work package
```

---

## `arquitectura.md`

```markdown
# Arquitectura

## Resumen
<Qué tipo de app es y cómo está organizada, en 5 líneas.>

## Stack
<House stack, or the deviation and its reason.>

## Componentes
- Frontend: <rutas y componentes principales>. Zona: zonas.json#frontend
- Backend: <módulos de src/server, rutas de API>. Zona: zonas.json#backend
- Datos: <base de datos, ORM>
- Servicios externos: <correo, pagos…> y cómo se simulan en pruebas

## Cómo viaja una petición
Pantalla → llamada definida en contrato-api.md → ruta de API → módulo de src/server → base de datos.

## Seguridad y privacidad
- Quién puede qué (roles y permisos), dónde se comprueba.
- Datos personales guardados y por qué.
- Secretos: solo en variables de entorno, listadas en .env.example.

## Decisiones técnicas
- <Decisión> — <por qué> (candidata a PM-ADR en memoria).
```

## `datos.md`

```markdown
# Datos

## <Entidad>
| Campo | Tipo | Reglas | Para qué (FUN / paso) |
| --- | --- | --- | --- |
| email | texto | único, minúsculas, sin espacios | FUN-01, F01:buscar_cuenta |

Relaciones: <…>
Reglas que garantiza la base de datos: <únicos, restricciones que evitan dobles reservas…>
```

## `contrato-api.md`

The only meeting point between frontend and backend. Each operation:

```markdown
## Sesiones

### POST /api/sesiones · Iniciar sesión
- Sirve a: FUN-03 · F01:password_ok, F01:limite, F01:crear_sesion
- Quién puede llamarla: cualquiera
- Entrada (JSON): `{ "email": string, "password": string }` (validación: …)
- Respuestas:
  - 200 `{ "usuario": { "id": string, "nombre": string } }` + cookie de sesión (7 días)
  - 401 `{ "error": "credenciales" }` → la pantalla muestra «Correo o contraseña incorrectos»
  - 423 `{ "error": "pausada", "hasta": string }` → «Tu cuenta está en pausa 15 minutos por seguridad»
  - 400 `{ "error": "formato" }`
- Notas: el mensaje nunca dice cuál dato falló (R-…).
```

Every error the frontend must show maps to the exact text in the product layer.

## `zonas.json` and `comandos.json`

See `stack-de-la-casa.md` for the default content. Both are read by hooks: keep them valid JSON.

## `specs/FUN-xx-<slug>.md`

```markdown
# FUN-03 · Iniciar sesión · spec técnica

- Producto: docs/producto/3-logica/FUN-03-iniciar-sesion.md · flujo F01 v2
- Contrato: contrato-api.md#sesiones
- Paquetes: WP-007 (frontend), WP-008 (backend)

## Paso a paso
| Paso del flujo | Frontend | Backend | Datos |
| --- | --- | --- | --- |
| F01:pantalla_login | formulario en src/app/entrar/page.tsx | — | — |
| F01:password_ok | — | src/server/sesiones/verificar.ts | User.passwordHash |

## Criterios técnicos
- CT1 (CA2): respuesta 401 idéntica para correo inexistente y contraseña incorrecta.

## Pruebas previstas
| Criterio | Nivel | Prueba |
| --- | --- | --- |
| CA1 | aceptación | tests/aceptacion/FUN-03-iniciar-sesion.spec.ts (equipo de pruebas) |
| CT1 | unitaria | src/server/sesiones/verificar.test.ts (builder) |
```

## `trabajo/PLAN.md`

The board the orchestrator follows and updates. Keep exactly these columns; hooks read them.

```markdown
# Plan de trabajo

## Fases
| Fase | Nombre | Funcionalidades | Estado |
| --- | --- | --- | --- |
| 1 | Ya se puede reservar | FUN-01, FUN-02, FUN-03 | en-curso |

## Tablero
| WP | Título | Especialidad | Fase | Funcionalidad | Depende de | Paralelo con | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WP-001 | Esqueleto y herramientas de prueba | backend | 1 | — | — | — | pendiente |
| WP-007 | Inicio de sesión · pantalla | frontend | 1 | FUN-03 | WP-001 | WP-008 | pendiente |
| WP-008 | Inicio de sesión · servidor | backend | 1 | FUN-03 | WP-002 | WP-007 | pendiente |

Estados: pendiente · en-curso · revision · hecho · bloqueado

## Cobertura
| Funcionalidad | Criterio / paso | WP | Prueba prevista |
| --- | --- | --- | --- |
| FUN-03 | CA1 | WP-007, WP-008 | aceptación |
```

## `trabajo/WP-xxx.md`

```markdown
# WP-008 · Inicio de sesión · servidor

- Especialidad: backend
- Fase: 1
- Funcionalidad: FUN-03 · spec: specs/FUN-03-iniciar-sesion.md
- Cubre: F01:password_ok (sí/no), F01:limite (sí/no), F01:crear_sesion (incluye si_falla)
- Contrato: contrato-api.md#post-apisesiones
- Depende de: WP-002
- Paralelo con: WP-007
- Tamaño: M
- Archivos en alcance: src/app/api/sesiones/route.ts, src/server/sesiones/**, prisma/schema.prisma (campos de intentos)
- Solo referencia: src/server/usuarios/**

## Objetivo
<Qué queda funcionando al terminar, en una o dos frases.>

## Criterios técnicos de aceptación
- [ ] CT1 (CA2): …
- [ ] CT2 (F01:limite → sí): …

## Notas (restricciones, no código)
- …

## Verificación
- `npx vitest run src/server/sesiones`

## Fuera de alcance
- …
```

### Sizing and splitting rules

- One specialty per WP. A feature normally becomes one backend WP and one frontend WP that run in parallel against the contract.
- **S**: ≤3 files, ~150 lines. **M**: ≤8 files, ~400 lines. Anything larger is split.
- Every WP leaves the app running and the quick tests green.
- Order: WP-001 walking skeleton → data model → features in the order of the phase plan.
- Mark `Paralelo con` only for WPs with no dependency between them and no shared file.
- Correction WPs (after a failed evaluation) cite the `FALLO-xxx` they fix and the regression test that must pass: `Verificación: npx playwright test -c tests/e2e/playwright.config.ts tests/regresion/FALLO-012-…`.
