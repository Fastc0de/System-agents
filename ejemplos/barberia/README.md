# Ejemplo · Barbería Navaja

Así queda la capa de producto (`docs/producto/`) que el orquestador escribe contigo durante las cinco etapas, y la capa de diseño (`docs/diseno/`) que escribe el diseñador en la etapa 4. Los `.json` son las fuentes; el sistema genera los `.md` de los flujos, todos los `.excalidraw` y `tokens.css`.

| Etapa | Archivos | Vista previa |
| --- | --- | --- |
| 1 · Visión | [`1-idea.md`](docs/producto/1-idea.md) · [`1-personas.excalidraw`](docs/producto/1-personas.excalidraw) | [personas](vistas-previas/1-personas.png) |
| 2 · Funcionalidades | [`2-funcionalidades.md`](docs/producto/2-funcionalidades.md) · [`2-funcionalidades.excalidraw`](docs/producto/2-funcionalidades.excalidraw) | [mapa](vistas-previas/2-funcionalidades.png) |
| 3 · Lógica | [`FUN-03-iniciar-sesion.md`](docs/producto/3-logica/FUN-03-iniciar-sesion.md) · [`F01-iniciar-sesion.md`](docs/producto/3-logica/F01-iniciar-sesion.md) (Mermaid + paso a paso) · [`F01-iniciar-sesion.excalidraw`](docs/producto/3-logica/F01-iniciar-sesion.excalidraw) | [flujo](vistas-previas/F01-iniciar-sesion.png) |
| 4 · Experiencia | [`reservar.excalidraw`](docs/producto/4-experiencia/reservar.excalidraw) | [bocetos](vistas-previas/reservar.png) |
| 4 · Experiencia (diseño) | [`direcciones.html`](docs/diseno/direcciones.html) (ábrelo en tu navegador) · elegida B: [`sistema.md`](docs/diseno/sistema.md) · [`tokens.json`](docs/diseno/tokens.json) → [`tokens.css`](docs/diseno/tokens.css) | [tres direcciones](vistas-previas/diseno-direcciones.png) |
| 5 · Implementación | [`5-plan-de-fases.excalidraw`](docs/producto/5-plan-de-fases.excalidraw) | [fases](vistas-previas/5-plan-de-fases.png) |

Para regenerar las vistas:

```text
node plugins/orquesta/skills/producto/scripts/diagramas.js todo ejemplos/barberia
```

Para validar los tokens y regenerar `tokens.css`:

```text
node plugins/orquesta/skills/diseno/scripts/tokens.js generar ejemplos/barberia
```

El ejemplo no incluye `referencia.html` (la app navegable en el estilo elegido): el diseñador la escribe después de que eliges una dirección.

![Tres direcciones visuales](vistas-previas/diseno-direcciones.png)

![Flujo de inicio de sesión](vistas-previas/F01-iniciar-sesion.png)
