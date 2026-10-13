# Conversación por etapas · v1

> Parte de la [visión del sistema](VISION-DEL-SISTEMA.md). Describe cómo conversas con el orquestador desde la idea hasta la app terminada, pensado para una persona que no programa.

![Etapas de conversación](diagramas/05-etapas-de-conversacion.png)

---

## 1. La idea

Tú hablas de **qué** quieres: lo que la app permite hacer, a quién, cómo se siente y qué pasa cuando algo sale mal. El orquestador es tu **traductor**: convierte eso en una documentación que tú entiendes (la capa de producto) y se asegura de que el equipo técnico la convierta en la suya. Cuando hay resultados, hace el camino inverso: te los cuenta en tu idioma.

Nunca tienes que:

- elegir tecnologías, bases de datos o lenguajes de programación;
- leer código, logs o documentos técnicos (aunque puedes pedirlos);
- escribir instrucciones para los agentes;
- ejecutar comandos para ver tu app.

---

## 2. Cómo te habla el orquestador

| Regla | En la práctica |
| --- | --- |
| **Sin jerga** | Si un término técnico es inevitable, lo explica una vez con un ejemplo cotidiano y lo añade a `docs/producto/glosario.md` |
| **Habla de lo que podrás hacer y ver** | "Tus clientes reciben un correo un día antes", no "un cron job envía notificaciones" |
| **Pregunta por consecuencias, no por tecnologías** | "¿Tiene que funcionar sin internet?", no "¿usamos service workers?" |
| **Pocas preguntas por ronda** | 2–4 por ronda, con opciones sugeridas y cuál recomienda |
| **Resume antes de avanzar** | "Entonces, si entendí bien…", y espera tu confirmación |
| **Muestra en vez de contar** | Diagramas, bocetos, capturas, videos |
| **Cada informe responde tres cosas** | Qué cambió para ti, cómo lo pruebas y qué sigue |
| **Detalle técnico solo si lo pides** | "¿Cómo está hecho el login?" → te lo explica al nivel que pidas |

**Así no / así sí:**

| Así no | Así sí |
| --- | --- |
| "Implementaremos autenticación con tokens y refresco de sesión." | "Tus clientes entran con su correo y su contraseña. En su teléfono la sesión dura 7 días; después se les vuelve a pedir." |
| "¿Prefieres PostgreSQL o MongoDB?" | No se pregunta: lo decide el equipo técnico. |
| "Necesitamos un webhook de la pasarela de pagos." | "Cuando el cliente paga, el banco nos avisa y la cita queda confirmada sola." |
| "El servidor devuelve un error 409." | "Si alguien ya tomó esa hora, el cliente ve: «Esa hora acaba de ocuparse, elige otra»." |
| "¿Quieres una PWA?" | "¿Te gustaría que tus clientes puedan instalarla en el móvil como una app, sin pasar por la tienda de aplicaciones?" |
| "Hay que decidir el hosting." | "Para que tus clientes la usen desde internet hay que alojarla. Con pocos usuarios cuesta alrededor de X al mes. ¿Te parece bien?" |

Cuando una decisión técnica **sí te afecta**, se te presenta como opciones con consecuencias, nunca como tecnologías:

```text
Para los pagos hay dos caminos:
  A) Cobrar al reservar: menos citas perdidas, pero el cliente necesita tarjeta.
     Cada pago tiene una comisión de ~3 %.
  B) Cobrar en el local: más simple y sin comisiones, pero alguien puede
     reservar y no venir.
Recomiendo A con opción de cancelar gratis hasta 24 h antes. ¿Qué prefieres?
```

---

## 3. Las cinco etapas

Cada etapa termina con un **resumen que apruebas**. Mientras conversan, el orquestador te muestra en qué punto están ("Etapa 3 de 5 · Lógica · 4 de 7 funcionalidades descritas"). Puedes volver a cualquier etapa en cualquier momento.

### Etapa 1 · Visión

- **Objetivo:** que la idea quede clara para cualquiera.
- **Hablamos de:** qué problema resuelve, para quién, qué cambia en el día de esas personas, qué no es la app y cómo sabremos que funciona.
- **Preguntas típicas:** "¿Quién la usará primero?", "¿Qué hacen hoy sin la app?", "Si en tres meses funciona bien, ¿qué habrá cambiado?".
- **Ves:** `docs/producto/1-idea.md` (una página) y un **mapa de personas** en Excalidraw: quién usa la app y qué busca cada uno.
- **Decides:** si la idea quedó bien contada.

### Etapa 2 · Funcionalidades

- **Objetivo:** la lista completa de lo que la app permite hacer, en frases simples.
- **Hablamos de:** qué podrá hacer cada persona, qué es imprescindible para la primera versión y qué puede esperar.
- **Ves:** `docs/producto/2-funcionalidades.md` y un **mapa de funcionalidades** (personas → lo que pueden hacer):

  ```markdown
  ## Para tus clientes
  | #      | Funcionalidad     | En una frase                                 | Prioridad      |
  | FUN-01 | Registrarse       | crear su cuenta con correo y contraseña      | Imprescindible |
  | FUN-02 | Reservar una cita | elegir servicio, barbero, día y hora         | Imprescindible |
  | FUN-03 | Iniciar sesión    | entrar a su cuenta para ver sus citas        | Imprescindible |
  | FUN-06 | Pagar al reservar | pagar con tarjeta al confirmar la cita       | Después        |
  ## Para ti (el negocio)
  | FUN-04 | Ver la agenda     | ver las citas del día de cada barbero        | Imprescindible |
  ```

- **Decides:** qué entra en la primera versión.

### Etapa 3 · Lógica

- **Objetivo:** que cada funcionalidad imprescindible quede descrita paso a paso, incluido qué pasa cuando algo sale mal.
- **Hablamos de:** cómo funciona cada funcionalidad. El orquestador hace las preguntas "¿y si…?" que un programador haría, pero en simple:
  - ¿Y si se equivoca de contraseña? ¿Y si se equivoca muchas veces?
  - ¿Y si dos personas eligen la misma hora a la vez?
  - ¿Y si cancela? ¿Hasta cuándo puede cancelar?
  - ¿Y si se queda sin internet a mitad?
  - ¿Quién puede ver esto y quién no?
- **Ves**, por cada funcionalidad:
  - Su **ficha** (`docs/producto/3-logica/FUN-03-iniciar-sesion.md`): para qué sirve, quién la usa, cómo funciona, qué pasa si algo sale mal, cuándo se da por buena (criterios) y qué queda fuera por ahora.
  - Su **diagrama de flujo** (`.excalidraw` y Mermaid), con tus palabras. El diagrama 04 muestra un ejemplo completo.
- **Decides:** aprobar cada flujo o pedir cambios. Un flujo aprobado no tiene preguntas abiertas.

Los **criterios de aceptación** se escriben aquí, en tu lenguaje ("con una contraseña incorrecta veo «correo o contraseña incorrectos»"). Son la base del [sistema de pruebas](SISTEMA-DE-PRUEBAS.md): cada criterio se convertirá en al menos una prueba automática.

### Etapa 4 · Experiencia

- **Objetivo:** que veas cómo se verá y se sentirá la app antes de construirla, y que elijas su aspecto entre opciones reales.
- **Hablamos de:** qué pantallas habrá, qué hay en cada una y qué mensajes ve la persona (también cuando no hay datos, mientras carga o cuando hay un error). Y de cómo quieres que se sienta: tres palabras («cálida, seria, de barrio»), apps o webs que te gusten o no, y tu marca si ya la tienes.
- **Ves:**
  - `docs/producto/4-experiencia/` con la lista de pantallas y **bocetos simples** en Excalidraw: cajas con "botón Reservar", "lista de horas libres", etc.
  - `docs/diseno/direcciones.html`: **tres estilos** con tus pantallas y tus textos reales, que abres con doble clic. Parten del estilo de la casa (cálido, editorial, tipo papel, con letras de libro y un solo color de acento): A es el más fiel a la casa, B la mezcla con el mundo de tu negocio y C un salto más atrevido. Cada uno trae una **firma**, un detalle propio. Aparte, **opciones extra** con su consecuencia: versión oscura, instalable en el móvil, fotos, movimiento.
  - Después de elegir, `docs/diseno/referencia.html`: tu app en el estilo elegido, **navegable**, para tocar los botones y pasar de pantalla antes de que exista.
- **Decides:** qué estilo (o qué mezcla: «la letra de A con los colores de C»), qué opciones extra, y si la app se siente como la imaginas. Si el aspecto no te importa, dices «usa el estilo de la casa» y se salta la elección.

### Etapa 5 · Implementación

- **Objetivo:** que sepas qué tendrás y cuándo, en orden.
- **Hablamos de:** el orden de construcción, qué podrás hacer al final de cada fase y las decisiones que te afectan (costo de alojamiento, plataformas, qué datos se guardan), siempre explicadas como consecuencias.
- **Ves:** `docs/producto/5-plan-de-fases.md` y una línea de fases en Excalidraw:

  ```text
  Fase 1 · «Ya se puede reservar»
    Al terminar podrás: registrarte, entrar, reservar una cita y verla en tu agenda.
  Fase 2 · «Gestión»
    Cancelar y reprogramar citas; panel para cada barbero.
  Fase 3 · «Avisos»
    Recordatorio por correo un día antes de la cita.
  ```

- **Decides:** luz verde y el modo de construcción.

---

## 4. Detrás de escena: después de tu luz verde

1. El **arquitecto técnico** escribe la capa técnica (`docs/tecnico/`): tecnologías, datos, contrato frontend↔backend, spec técnica por funcionalidad y paquetes de trabajo por especialidad.
2. El **orquestador** comprueba que cada funcionalidad y cada criterio tienen paquete y prueba prevista. Si algo no cuadra, lo resuelve con el arquitecto. Si hace falta tu opinión, te pregunta.
3. Te da un **resumen de 5 líneas** en simple, por ejemplo:

   ```text
   Tu app será una página web que se usa igual en el móvil y en el ordenador.
   Los datos se guardan en un servicio en la nube con copia de seguridad diaria.
   Se construirá en 3 fases y 14 paquetes de trabajo.
   Con pocos usuarios, el alojamiento costaría alrededor de X al mes.
   En cada fase verás capturas y un video de la app funcionando.
   ```

4. Empieza la construcción en el modo que elegiste.

---

## 5. Modos de construcción

| Modo | Qué pasa | Cuándo conviene |
| --- | --- | --- |
| **Por fases** | Al terminar cada fase se detiene, te muestra la demo y el informe de pruebas, y espera tu luz verde | Al principio, o cuando la app es nueva para ti |
| **De un tiro** | Construye todas las fases seguidas, con sus pruebas. Solo te interrumpe por algo que solo tú puedes decidir: una duda de producto, un costo o un fallo que requiere elegir | Cuando confías en las specs y quieres el resultado final |
| **Hasta la fase N** | De un tiro hasta la fase que digas, y ahí te muestra | Para avanzar rápido sin perder el control |

Puedes cambiar de modo cuando quieras, en lenguaje natural: "para aquí", "sigue de un tiro", "haz hasta la fase 2 y me muestras", "¿cómo vamos?", "muéstrame lo que hay".

En **todos** los modos se hacen las pruebas de cada fase. "De un tiro" no se salta controles: solo no se detiene a preguntarte.

---

## 6. Cómo te reporta mientras construye

**Tablero en lenguaje simple** (cuando preguntas "¿cómo vamos?" o al final de cada paquete importante):

```text
Fase 1 · «Ya se puede reservar» — 6 de 9 paquetes listos
✅ Registrarse — construido, revisado y probado
✅ Iniciar sesión — construido, revisado y probado
🔨 Reservar una cita — la pantalla está lista; falta guardar la reserva
⏳ Ver mi agenda — pendiente
Siguiente: terminar «Reservar una cita» y evaluar la fase.
```

**Informe de fase** (lo prepara el jefe de pruebas y te lo presenta el orquestador): qué puedes hacer ahora, resultado de las pruebas por funcionalidad, qué falló y cómo se arregló, capturas y video, y cómo probarlo tú. Hay un ejemplo completo en [Sistema de pruebas](SISTEMA-DE-PRUEBAS.md#8-el-informe-para-ti).

---

## 7. Cambios de idea a mitad de camino

1. Lo dices como te salga: "quiero que también puedan reservar para otra persona".
2. El orquestador identifica qué etapa y qué funcionalidades toca.
3. Te explica el **impacto en simple**: qué cambia, qué de lo ya construido se modifica y cuánto trabajo extra supone más o menos (en paquetes, no en horas).
4. Si confirmas, actualiza tu capa de producto (la funcionalidad y su flujo suben de versión), el arquitecto replanifica y el equipo sigue.

Los cambios **siempre** entran por el orquestador. Ningún builder recibe cambios directos, así tu capa de producto nunca queda desactualizada respecto a lo que se construye.

Los **cambios solo visuales** («otros colores», «la letra más grande», «más aire en la agenda») van por un camino más corto: el diseñador ajusta el estilo, te enseña la referencia actualizada y, con tu OK, se construyen paquetes solo de la parte que ves. La parte que guarda los datos no se toca.

---

## 8. Cuando quieres ver lo técnico

Nada está oculto. Puedes pedir "explícame cómo está hecho el inicio de sesión" o "enséñame la ficha técnica de reservar". El orquestador lo explica al nivel que pidas, empezando por lo más simple. La capa técnica está en `docs/tecnico/` por si alguna vez trabajas con un programador humano.
