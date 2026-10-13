<!-- Generado por orquesta desde F01-iniciar-sesion.flow.json. No lo edites a mano: edita el .flow.json y se regenera. -->
# F01 · Iniciar sesión

| Funcionalidad | Versión | Estado | Actores |
| --- | --- | --- | --- |
| FUN-03 | 2 | aprobado | Cliente, La app |

Un cliente que ya tiene cuenta entra con su correo y su contraseña para ver sus citas.

**Cuándo empieza:** El cliente abre la app y no tiene una sesión activa.

**Antes de empezar:**

- El cliente ya se registró (FUN-01).

**Al terminar:**

- El cliente ve «Mis citas» y su sesión dura 7 días en ese dispositivo.

## Diagrama

```mermaid
flowchart TD
  subgraph lane_0["Cliente"]
    direction TB
    n_inicio(["Abres la app"])
    n_pantalla_login[/"Pantalla «Entrar»: correo y contraseña"/]
    n_fin_ok(["Ves «Mis citas»"])
    n_fin_pausa(["Cuenta en pausa 15 min por seguridad"])
  end
  subgraph lane_1["La app"]
    direction TB
    n_formato_ok{"¿El correo está bien escrito?"}
    n_buscar_cuenta[("Buscamos tu cuenta")]
    n_password_ok{"¿La contraseña coincide?"}
    n_registrar_fallo("Te avisamos y cuenta como intento fallido")
    n_limite{"¿5 intentos fallidos seguidos?"}
    n_crear_sesion("Entras a tu cuenta")
  end
  n_inicio --> n_pantalla_login
  n_pantalla_login --> n_formato_ok
  n_formato_ok -->|"sí"| n_buscar_cuenta
  n_formato_ok -.->|"no: te pedimos corregirlo"| n_pantalla_login
  n_buscar_cuenta --> n_password_ok
  n_password_ok -->|"sí"| n_crear_sesion
  n_password_ok -->|"no"| n_registrar_fallo
  n_registrar_fallo --> n_limite
  n_limite -->|"sí"| n_fin_pausa
  n_limite -.->|"no: lo intentas otra vez"| n_pantalla_login
  n_crear_sesion --> n_fin_ok
  classDef inicio fill:#b2f2bb,stroke:#2f9e44,color:#1e1e1e
  class n_inicio inicio
  classDef pantalla fill:#a5d8ff,stroke:#1971c2,color:#1e1e1e
  class n_pantalla_login pantalla
  classDef decision fill:#ffd8a8,stroke:#e8590c,color:#1e1e1e
  class n_formato_ok,n_password_ok,n_limite decision
  classDef datos fill:#e5dbff,stroke:#7048e8,color:#1e1e1e
  class n_buscar_cuenta datos
  classDef accion fill:#fff3bf,stroke:#f08c00,color:#1e1e1e
  class n_registrar_fallo,n_crear_sesion accion
  classDef fin fill:#d3f9d8,stroke:#2f9e44,color:#1e1e1e
  class n_fin_ok fin
  classDef finError fill:#ffc9c9,stroke:#e03131,color:#1e1e1e
  class n_fin_pausa finError
  linkStyle 3,9 stroke:#e03131,color:#e03131
```

Mapa visual editable: [F01-iniciar-sesion.excalidraw](F01-iniciar-sesion.excalidraw)

## Paso a paso

### 1. Abres la app · `F01:inicio`

*Inicio* · Actor: Cliente

- **Siguiente:** `pantalla_login`

### 2. Pantalla «Entrar»: correo y contraseña · `F01:pantalla_login`

*Pantalla* · Actor: Cliente

La persona escribe su correo y su contraseña y pulsa «Entrar».

- **Lo que ve la persona:** Dos campos (correo y contraseña), el botón «Entrar» y el enlace «¿Olvidaste tu contraseña?».
- **Siguiente:** `formato_ok`

### 3. ¿El correo está bien escrito? · `F01:formato_ok`

*Decisión* · Actor: La app

Antes de buscar la cuenta se comprueba que el correo tenga forma de correo.

- **Reglas:** Se ignoran los espacios al principio y al final · No importan mayúsculas o minúsculas
- **Siguiente:** `buscar_cuenta` (sí) · `pantalla_login` (no: te pedimos corregirlo) ⚠

### 4. Buscamos tu cuenta · `F01:buscar_cuenta`

*Datos guardados* · Actor: La app

Se busca la cuenta que tenga ese correo.

- **Información que usa o guarda:** Cuenta del cliente (consulta)
- **Siguiente:** `password_ok`

### 5. ¿La contraseña coincide? · `F01:password_ok`

*Decisión* · Actor: La app

Se compara la contraseña escrita con la guardada. Si no existe una cuenta con ese correo, se responde igual que con una contraseña incorrecta.

- **Reglas:** Nunca se dice cuál de los dos datos falló
- **Siguiente:** `crear_sesion` (sí) · `registrar_fallo` (no)

### 6. Entras a tu cuenta · `F01:crear_sesion`

*Acción del sistema* · Actor: La app

Se crea una sesión que dura 7 días en ese dispositivo y se pone a cero el contador de intentos.

- **Reglas:** R-02: la sesión dura 7 días · R-05: se permiten varias sesiones por cliente
- **Información que usa o guarda:** Sesión (crear) · Último acceso del cliente (actualizar)
- **Si algo sale mal:** Si no se puede guardar la sesión, se muestra «Inténtalo de nuevo» y no se entra
- **Siguiente:** `fin_ok`

### 7. Te avisamos y cuenta como intento fallido · `F01:registrar_fallo`

*Acción del sistema* · Actor: La app

Se suma un intento fallido a la cuenta y se muestra el aviso.

- **Lo que ve la persona:** «Correo o contraseña incorrectos»
- **Información que usa o guarda:** Intentos fallidos de la cuenta (actualizar)
- **Siguiente:** `limite`

### 8. Ves «Mis citas» · `F01:fin_ok`

*fin con éxito* · Actor: Cliente

### 9. ¿5 intentos fallidos seguidos? · `F01:limite`

*Decisión* · Actor: La app

Se mira cuántos intentos fallidos seguidos lleva la cuenta.

- **Reglas:** El contador vuelve a cero al entrar con éxito
- **Siguiente:** `fin_pausa` (sí) · `pantalla_login` (no: lo intentas otra vez) ⚠

### 10. Cuenta en pausa 15 min por seguridad · `F01:fin_pausa`

*fin con error* · Actor: Cliente

## Transiciones

| De | A | Condición | Tipo |
| --- | --- | --- | --- |
| `inicio` | `pantalla_login` | — | normal |
| `pantalla_login` | `formato_ok` | — | normal |
| `formato_ok` | `buscar_cuenta` | sí | normal |
| `formato_ok` | `pantalla_login` | no: te pedimos corregirlo | error |
| `buscar_cuenta` | `password_ok` | — | normal |
| `password_ok` | `crear_sesion` | sí | normal |
| `password_ok` | `registrar_fallo` | no | normal |
| `registrar_fallo` | `limite` | — | normal |
| `limite` | `fin_pausa` | sí | normal |
| `limite` | `pantalla_login` | no: lo intentas otra vez | error |
| `crear_sesion` | `fin_ok` | — | normal |

## Criterios de aceptación

- [ ] **CA1.** Con datos correctos entro y veo «Mis citas».
- [ ] **CA2.** Con una contraseña incorrecta veo «Correo o contraseña incorrectos», sin que diga cuál de los dos falló.
- [ ] **CA3.** Al 5.º intento fallido seguido no puedo entrar durante 15 minutos, aunque escriba bien la contraseña.

## Historial de cambios

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1 | 2026-10-13 | Primera versión. |
| 2 | 2026-10-13 | Pausa de 15 minutos tras 5 intentos fallidos. |
