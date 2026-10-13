# FUN-03 · Iniciar sesión

- Prioridad: imprescindible
- Quién: clientes que ya se registraron
- Flujos: [F01 · Iniciar sesión](F01-iniciar-sesion.md)
- Pantallas: P02 «Entrar»
- Versión: 2 · Estado: aprobada

## Para qué
Que el cliente entre a su cuenta y vea sus citas.

## Cómo funciona
1. Escribe su correo y su contraseña y pulsa «Entrar».
2. Si son correctos, entra a «Mis citas».

## Si algo sale mal
- Correo mal escrito → se le pide corregirlo.
- Contraseña incorrecta (o correo que no existe) → «Correo o contraseña incorrectos», sin decir cuál falló.
- Cinco intentos fallidos seguidos → la cuenta se pausa 15 minutos por seguridad.

## Reglas
- R-02: la sesión dura 7 días. R-05: varias sesiones por cliente.

## Se da por buena cuando
- [ ] CA1. Con datos correctos entro y veo «Mis citas».
- [ ] CA2. Con una contraseña incorrecta veo «Correo o contraseña incorrectos», sin que diga cuál de los dos falló.
- [ ] CA3. Al 5.º intento fallido seguido no puedo entrar durante 15 minutos, aunque escriba bien la contraseña.

## Fuera por ahora
- Entrar con Google.

## Historial
| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1 | 2026-10-13 | Primera versión. |
| 2 | 2026-10-13 | Pausa de 15 minutos tras 5 intentos fallidos. |
