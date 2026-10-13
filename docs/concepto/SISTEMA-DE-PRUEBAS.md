# Sistema de pruebas · v1

> Parte de la [visión del sistema](VISION-DEL-SISTEMA.md). Describe cómo se prueba lo construido contra lo que pediste, quién lo hace y cómo se garantiza que un fallo no vuelva.

![Sistema de pruebas](diagramas/06-sistema-de-pruebas.png)

---

## 1. Qué resuelve

Que la app no solo "funcione en la máquina del que la hizo", sino que haga **lo que tú pediste**, en todos los casos que acordamos, también cuando algo sale mal, y que lo que ya funcionaba **siga funcionando** cuando se añade algo nuevo.

## 2. Principios

1. **Orientado a tus specs.** Se prueba contra tus funcionalidades y criterios en lenguaje natural, no contra lo que el código "parece" hacer.
2. **Independiente.** Quien construye no es quien evalúa. Los testers no pueden tocar el código de la app y los builders no pueden tocar las pruebas de aceptación ni de regresión.
3. **Nada se olvida.** Cada fallo se convierte en una prueba automática permanente.
4. **Por riesgo.** Se prueba con más profundidad lo que más daño haría si fallara: dinero, datos personales, accesos y pérdida de información.
5. **Con evidencia.** Cada resultado se apoya en una prueba ejecutada, una captura o un video, nunca en un "debería funcionar".
6. **En tu idioma.** El informe se organiza por funcionalidad y en lenguaje simple. El detalle técnico va aparte, para el equipo.

---

## 3. Los cuatro niveles

| Nivel | Cuándo | Quién | Qué se prueba | Qué lo garantiza |
| --- | --- | --- | --- | --- |
| **1 · Mini-pruebas** | Mientras se construye un paquete | Builder (frontend o backend) | Las piezas del paquete, por separado: que cada cálculo, regla o componente haga lo que debe | Un hook ejecuta las pruebas rápidas cuando el builder intenta terminar; si fallan, no puede terminar |
| **2 · Verificación del paquete** | Al terminar cada paquete | Reviewer | **Todas** las pruebas existentes (para detectar si algo se rompió) + los criterios técnicos del paquete + alcance | El paquete no se acepta sin su veredicto PASS |
| **3 · Evaluación de fase** | Al cerrar cada fase | Jefe de pruebas + 4 testers | Cada funcionalidad de la fase contra tus criterios, los recorridos completos en un navegador real, los casos límite, la experiencia y **toda** la batería de regresión | La fase no se cierra sin el veredicto del jefe de pruebas |
| **4 · Evaluación de app completa** | Al final, cuando lo pidas, o sobre una app que ya existe | Jefe de pruebas + 4 testers | Lo mismo que el nivel 3, para todas las funcionalidades y con recorridos de punta a punta | Informe completo antes de la entrega |

Los niveles 1 y 2 son rápidos y frecuentes: atrapan errores pequeños pronto. Los niveles 3 y 4 son amplios: comprueban que la app, en conjunto, cumple lo que pediste.

---

## 4. El equipo de pruebas

| Agente | Qué hace | Cómo lo hace |
| --- | --- | --- |
| **Jefe de pruebas** (orquestador de la evaluación) | Diseña la evaluación desde tus specs, la reparte, consolida los resultados, decide si la fase pasa y lleva el registro de fallos | Lee tu capa de producto, la técnica, lo que cambió desde la última evaluación y el registro de fallos. Lanza a los testers en paralelo |
| **Tester de recorridos de usuario** | Usa la app como una persona: recorre cada flujo y cada rama ("¿y si la contraseña es incorrecta?") | Navegador real automatizado; deja capturas y un video de cada recorrido |
| **Tester de servidor y reglas** | Comprueba las reglas de negocio, los datos, los permisos y los cálculos, sin pasar por las pantallas | Llamadas directas al servidor con datos preparados |
| **Tester de casos límite y seguridad** | Intenta romperla: datos vacíos o enormes, caracteres raros, doble clic, dos personas a la vez, entrar donde no debe | Pruebas dirigidas a los bordes y a los accesos indebidos |
| **Tester de experiencia** | Revisa que se vea bien en el móvil y en el ordenador, que se parezca al estilo que elegiste, que se pueda usar con teclado y lector de pantalla, y que los textos y errores se entiendan | Navegador real en varios tamaños, comprobaciones de accesibilidad, colores y letras frente al sistema de diseño, capturas lado a lado con `referencia.html` y revisión de textos frente a tus specs |

**Por qué un jefe de pruebas con su propio equipo:** una evaluación completa genera mucha información (planes, resultados, capturas). Si la coordinara el orquestador, su contexto se llenaría y perdería claridad en la conversación contigo. El jefe de pruebas absorbe todo eso y devuelve solo el veredicto y los informes. Es la única excepción a la regla de que los subagentes no delegan: Claude Code lo permite, y un hook garantiza que solo pueda lanzar testers.

**Las pruebas que escriben los testers se quedan.** Cada evaluación no es una revisión de una sola vez: los testers escriben pruebas automáticas (`tests/aceptacion`, `tests/e2e`) que se suman a la batería. Así, cada fase evaluada deja la app mejor protegida para las siguientes.

---

## 5. Cómo se arma una evaluación de fase

1. **Entradas:**
   - Tus specs: funcionalidades, criterios y flujos (`docs/producto/`).
   - La spec técnica y el contrato (`docs/tecnico/`).
   - Lo que cambió desde la última evaluación (el historial del repositorio).
   - El registro de fallos.
2. **Matriz de cobertura** (`docs/pruebas/matriz-de-cobertura.md`): cada criterio y cada rama de cada flujo se conectan con al menos una prueba.

   | Funcionalidad | Criterio o rama | Prueba | Tester |
   | --- | --- | --- | --- |
   | FUN-03 Iniciar sesión | Con datos correctos entro y veo mis citas | `e2e/iniciar-sesion.spec` › entra con datos correctos | Recorridos |
   | FUN-03 Iniciar sesión | `F01:limite → sí`: al 5.º fallo, pausa de 15 min | `aceptacion/sesion-bloqueo.spec` | Servidor y reglas |
   | FUN-03 Iniciar sesión | Correo con espacios o mayúsculas | `aceptacion/sesion-limites.spec` | Casos límite |
   | FUN-03 Iniciar sesión | El mensaje de error se entiende y no dice cuál dato falló | `e2e/iniciar-sesion.spec` › mensaje de error | Experiencia |

3. **Prioridad por riesgo:** primero lo crítico (dinero, datos personales, accesos, pérdida de información), luego lo nuevo o modificado, luego las **zonas frágiles** (donde hubo fallos antes) y luego el resto.
4. **Reparto:** cada tester recibe un brief con sus funcionalidades, casos, entorno y datos de prueba, y el formato de lo que debe devolver.
5. **Ejecución:** primero la **batería de regresión completa**; después las pruebas nuevas de la fase.
6. **Consolidación:** el jefe de pruebas une los resultados, elimina duplicados y clasifica cada hallazgo:

   | Severidad | Significa | ¿Bloquea la fase? |
   | --- | --- | --- |
   | Bloqueante | Una funcionalidad imprescindible no se puede usar, o se pierden o exponen datos | Sí |
   | Mayor | Un criterio no se cumple o una rama del flujo hace algo distinto a lo acordado | Sí |
   | Menor | Funciona, pero con un defecto que no cambia el resultado | No: va como observación |
   | Cosmético | Detalle visual o de texto | No |

7. **Veredicto:** **PASA**, **PASA CON OBSERVACIONES** o **NO PASA**. Si no pasa, cada fallo bloqueante o mayor se convierte en un paquete de corrección y la fase se vuelve a evaluar.
8. **Informes:** uno para ti y otro técnico para el equipo (`docs/pruebas/informes/`).

---

## 6. El registro de fallos

Cada fallo sigue este ciclo:

1. **Detectado:** un tester lo encuentra y lo reproduce.
2. **Demostrado:** antes de arreglar nada, se escribe una prueba automática que lo reproduce, y esa prueba **falla**.
3. **Registrado** en `docs/pruebas/registro-de-fallos.md`, en simple y en técnico.
4. **Corregido:** el orquestador crea un paquete de corrección; el builder arregla el código **sin poder tocar la prueba**.
5. **Verificado:** la prueba pasa y el jefe de pruebas lo confirma.
6. **Permanente:** la prueba queda en `tests/regresion/` para siempre y se ejecuta **primero** en cada evaluación futura.

Si un fallo verificado vuelve a aparecer, se marca **REINCIDENTE**: pasa a prioridad máxima, se escala al orquestador y se registra como zona frágil en la memoria del proyecto. Así, los futuros builders y testers saben dónde tener más cuidado.

**Ejemplo de entrada:**

```markdown
## FALLO-012 · Reservar una cita · mayor · verificado

Qué esperabas: si dos personas eligen la misma hora, solo la primera la consigue.
Qué pasó: las dos recibieron confirmación.
Cómo reproducirlo: abrir la app en dos navegadores, elegir la misma hora y confirmar casi a la vez.

- Detectado: 2026-10-20 · evaluación de la fase 1 · tester de casos límite
- Prueba que lo demuestra: tests/regresion/FALLO-012-doble-reserva.spec
- Corrección: WP-019 (backend) · verificado el 2026-10-20
- Historial: abierto → en corrección → corregido → verificado

### Detalle técnico
La reserva no comprobaba la disponibilidad dentro de la misma operación que la guarda; …
```

Estados posibles: `abierto` → `en corrección` → `corregido` → `verificado`, más `reincidente` cuando un fallo verificado vuelve.

---

## 7. Reglas de integridad

Todas se hacen cumplir con hooks, no solo con instrucciones:

- Los builders **no pueden modificar** `tests/aceptacion`, `tests/e2e` ni `tests/regresion`. Solo pueden tocar sus pruebas rápidas.
- Los testers **no pueden modificar** el código de la app. Si una prueba falla, lo reportan; no lo arreglan.
- Una prueba **nunca se borra ni se desactiva** para "ponerse en verde". Solo el jefe de pruebas puede retirarla, cuando tu spec cambió, y queda anotado por qué y con qué versión de la spec.
- Una prueba **inestable** (a veces pasa, a veces no) se trata como un fallo y se registra; no se ignora ni se reintenta hasta que pase.
- Un informe de fase **sin resultados de la batería de regresión** no se acepta.

---

## 8. El informe para ti

```text
Fase 1 · «Ya se puede reservar» — PASA CON 1 OBSERVACIÓN

Lo que ya puedes hacer:
  Registrarte, entrar, reservar una cita y verla en «Mis citas».

Resultado por funcionalidad:
  ✅ Registrarse ................ 6 de 6 pruebas
  ✅ Iniciar sesión ............. 7 de 7 pruebas
  ✅ Reservar una cita .......... 12 de 12 pruebas
     Se encontró y corrigió 1 fallo: dos personas podían reservar la misma
     hora. Ahora la segunda ve «Esa hora acaba de ocuparse, elige otra».
  ⚠️ Ver mi agenda .............. 8 de 9 pruebas
     En móviles pequeños, el nombre del servicio se corta. (Menor; se
     corrige en la fase 2.)

Protección acumulada: 33 pruebas automáticas, incluida 1 de un fallo anterior.
Todas en verde.

Cómo probarlo tú: [video de 2 minutos] [capturas] [enlace de prueba, si está configurado]
  1. Entra y pulsa «Reservar».
  2. Elige «Corte», el barbero que quieras y mañana a las 10:00.
  3. Confirma y revisa que aparezca en «Mis citas».
```

El **informe técnico** (para el orquestador y los builders) tiene el detalle de cada prueba, los registros y las rutas de los archivos. No necesitas leerlo.

---

## 9. Modo auditoría: probar una app que ya existe

Sirve para apps hechas con este sistema o fuera de él. Basta con pedírselo al orquestador («audita mi app») o usar `/orquesta:pruebas auditoria`.

1. **Reconocimiento:** el jefe de pruebas, con ayuda de un scout, recorre la app y su código.
2. **"Esto es lo que creo que hace tu app":** te presenta en lenguaje natural un catálogo de funcionalidades con sus flujos principales.
3. **Confirmas o corriges:** "esto sí", "esto no debería pasar así". Lo confirmado pasa a ser tu spec (`docs/producto/`), aunque antes no existiera.
4. **Evaluación de app completa** (nivel 4) contra esa spec.
5. **Informe y registro de fallos.** Si quieres, el orquestador planifica las correcciones como una fase más.

---

## 10. Límites honestos

- Las pruebas de **seguridad** son básicas: accesos indebidos, datos maliciosos y permisos. No reemplazan una auditoría profesional. Si la app maneja pagos o datos sensibles, el informe lo recomendará.
- Las pruebas de **rendimiento** (muchos usuarios a la vez) no están incluidas por defecto. Se puede añadir un tester de rendimiento si el proyecto lo pide.
- Los **servicios externos reales** (bancos, correo) se prueban con sus entornos de prueba o con simulaciones. Antes de publicar se recomienda una prueba real controlada.
- Probar en un navegador real requiere que la app pueda arrancar en el entorno de pruebas. Eso es parte del esqueleto de la fase 1.
