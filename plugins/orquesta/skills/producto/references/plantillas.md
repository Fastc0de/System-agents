# Product-layer templates

Everything in `docs/producto/` is written for the person, in their language and without jargon. Keep the headings; fill the content. Write `—` when something does not apply and `por definir` only while the stage is open.

---

## `docs/producto/estado.json`

Machine-readable progress, kept current by the orchestrator. The session-start hook reads it to resume.

```json
{
  "proyecto": "Barbería Navaja",
  "etapa": 3,
  "etapas": { "1": "aprobada", "2": "aprobada", "3": "en-curso", "4": "pendiente", "5": "pendiente" },
  "modo": null,
  "hasta_fase": null,
  "fase_actual": null,
  "memoria": true,
  "actualizado": "2026-10-13"
}
```

- `etapas.N`: `pendiente` | `en-curso` | `aprobada`.
- `modo`: `null` until stage 5, then `por-fases` | `de-un-tiro` | `hasta-fase-N`.
- `fase_actual`: phase being built, or `null` before construction.

---

## `docs/producto/1-idea.md`

```markdown
# <Nombre de la app>

## En una frase
<Qué es y para quién, en una frase.>

## El problema
<Qué pasa hoy sin la app; a quién le duele y por qué.>

## Para quién
- **<Tipo de persona>:** <quién es y qué busca>.

## Qué cambia con la app
- <Cambio concreto en el día de esas personas.>

## Cómo sabremos que funciona
- <Señal observable: «la mitad de las citas llegan por la app en 3 meses».>

## Qué no es (por ahora)
- <Límite explícito.>

## Dónde y cómo se usa
- Dispositivos: <móvil / ordenador / ambos>
- Idiomas: <…>

## Referencias
- <Apps o webs que le gustan o no, y por qué.>
```

---

## `docs/producto/2-funcionalidades.md`

```markdown
# Funcionalidades

Prioridad: **imprescindible** (primera versión) · **después** · **quizás** · **descartada**.

## Para <tipo de persona>

| # | Funcionalidad | En una frase | Prioridad | Ficha |
| --- | --- | --- | --- | --- |
| FUN-01 | Registrarse | crear su cuenta con correo y contraseña | imprescindible | [ficha](3-logica/FUN-01-registrarse.md) |

## Reglas de negocio

| # | Regla |
| --- | --- |
| R-01 | Una cita dura lo que dura el servicio elegido. |
```

Ids are permanent: never renumber; a dropped feature stays with priority «descartada».

---

## Ficha de funcionalidad · `docs/producto/3-logica/FUN-xx-<slug>.md`

```markdown
# FUN-03 · Iniciar sesión

- Prioridad: imprescindible
- Quién: clientes que ya se registraron
- Flujos: [F01 · Iniciar sesión](F01-iniciar-sesion.md)
- Pantallas: P02 «Entrar»
- Versión: 2 · Estado: aprobada

## Para qué
<Qué consigue la persona.>

## Cómo funciona
1. <Paso en palabras de la persona.>

## Si algo sale mal
- <Situación> → <qué pasa y qué ve la persona>.

## Reglas
- R-02: la sesión dura 7 días.

## Se da por buena cuando
- [ ] CA1. Con datos correctos entro y veo «Mis citas».
- [ ] CA2. Con una contraseña incorrecta veo «Correo o contraseña incorrectos», sin que diga cuál de los dos falló.

## Fuera por ahora
- Entrar con Google.

## Historial
| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1 | 2026-10-13 | Primera versión. |
```

The criteria here and in the flow's `criterios` must say the same thing; the flow is the source the tests trace to.

---

## `docs/producto/4-experiencia/pantallas.md`

```markdown
# Pantallas

Estilo: <colores, tono, referencias>. Prioridad de dispositivo: <móvil primero / ordenador primero>.

## P02 · Entrar
- Para qué: <…>
- Sirve a: F01:pantalla_login
- Contenido: <campos, botones, enlaces>
- Acción principal: <botón>
- Sin datos: <qué se ve>
- Cargando: <qué se ve>
- Error: <mensajes exactos>
- Textos: «Entrar», «¿Olvidaste tu contraseña?», «Correo o contraseña incorrectos»
- Boceto: [reservar.excalidraw](reservar.excalidraw)
```

---

## `docs/producto/5-plan-de-fases.md`

```markdown
# Plan de fases

Modo de construcción: <por fases | de un tiro | hasta la fase N>

## Fase 1 · «<nombre que diga lo que entrega>»
- Al terminar podrás: <lo que la persona puede hacer>
- Incluye: FUN-01, FUN-02, FUN-03
- Tamaño: <pequeña | mediana | grande>
- Estado: <pendiente | en curso | terminada>

## Decisiones tomadas
- Dónde vive la app: <…>
- Costo mensual aproximado: <…> (confirmado por la persona el <fecha>)
- Datos personales que se guardan: <…>
- Cómo verás los resultados: <capturas y video; enlace cuando haya alojamiento>
```

---

## `docs/producto/glosario.md`

```markdown
# Glosario

| Término | Qué significa aquí |
| --- | --- |
| Sesión | El tiempo que la app te recuerda sin pedirte la contraseña otra vez. |
```
