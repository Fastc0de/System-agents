# Sistema de diseño · Barbería Navaja

- Dirección: B «Navaja y papel», sin mezclas
- Versión: 1 · Tokens: [tokens.json](tokens.json) (vista: [tokens.css](tokens.css)) · Direcciones: [direcciones.html](direcciones.html)
- Opciones de experiencia: sin modo oscuro por ahora · instalable en el móvil · sin fotos (solo letras y la firma) · movimiento sobrio

## Idea
Papel cálido y tinta, como la libreta de citas de una barbería de toda la vida, con el oficio presente en dos detalles: la raya del poste y el ticket. Calma para reservar rápido; carácter para que se sienta de Navaja y no de cualquier app.

## Firma
- **Raya de poste:** franja de 6 px en diagonal (rojo barbero, papel, azul marino) arriba de cada pantalla y como barra de carga cuando se guarda algo.
- **Ticket:** la confirmación de una cita es un ticket con muescas laterales y línea de corte punteada; también en «Mis citas» para la próxima cita.
- En ningún otro lugar: no en botones, no en fondos, no en listas.

## Tipografía
| Uso | Familia | Tamaño | Peso | Interlineado |
| --- | --- | --- | --- | --- |
| Título de pantalla | Fraunces | 3xl (32) | 600 | 1.1 |
| Dato destacado del ticket | Fraunces | 2xl (24) | 600 | 1.2 |
| Texto | Instrument Sans | base (16) | 400 | 1.55 |
| Etiquetas y botones | Instrument Sans | base (16) | 500 | 1 |
| Texto secundario | Instrument Sans | sm (14) | 400 | 1.45 |
| Rótulos pequeños («TU CITA») | Instrument Sans | xs (12), mayúsculas, espaciado 0.1em | 500 | 1.2 |

## Color
- `fondo` papel manila en toda la pantalla; `superficie` crema para tarjetas, campos y el ticket.
- `acento` azul marino: solo el botón principal, el día y la hora elegidos. Nunca para texto largo.
- `firma_rojo`: solo la raya de poste y el subrayado del día elegido.
- `error` se usa siempre con icono y texto; nunca solo el color.

## Espacio y forma
- Márgenes de pantalla: 18 px en móvil, contenido centrado a 960 px en ordenador.
- Separación entre bloques: 16–24 px; dentro de un bloque: 8–12 px.
- Radios rectos y discretos (4–6 px), como papel cortado; la pastilla solo para etiquetas.
- Sin sombras en la pantalla; solo en la hoja inferior y en los menús flotantes (`sombra.flotante`).

## Componentes
| Componente | Variantes | Estados |
| --- | --- | --- |
| Botón | principal (azul marino), secundario (crema con borde), discreto (solo texto) | normal, hover, foco (anillo terracota), pulsado, deshabilitado, «Reservando…» con giro pequeño |
| Campo | texto, correo, contraseña, selector («Cualquiera») | vacío, con valor, foco, error (borde y mensaje con icono), deshabilitado |
| Selector de día | pestañas con día de la semana y número | normal, elegido (subrayado rojo de 3 px), sin horas (gris) |
| Hora | casilla de 44 px | libre, elegida (azul marino), ocupada (tachada, borde punteado) |
| Fila de servicio | nombre, duración y precio | normal, elegida, sin servicios («Pronto abriremos reservas») |
| Aviso | informativo, error | con icono, una frase |
| Ticket | cita próxima, cita confirmada | normal |
| Esqueleto | lista de servicios, horas | animación de opacidad, sin movimiento si se reduce |
| Barra superior | con «Volver», solo marca | — |

## Movimiento
120 ms para el foco y el hover; 200 ms para cambiar de día y para que aparezca un aviso; curva `cubic-bezier(0.2, 0, 0, 1)`. La raya de poste se desplaza mientras se guarda. Con «reducir movimiento», todo aparece sin animar y la raya queda quieta.

## Imágenes e iconos
Sin fotos en la primera versión. Iconos de línea de 1.5 px (estilo Lucide), en el color del texto.

## Voz en pantalla
Cercana y breve, de tú. Mayúscula solo al inicio. Botones con verbo: «Confirmar reserva», «Ver mis citas». Errores que dicen qué hacer: «Esa hora acaba de ocuparse, elige otra».

## Así sí / así no
| Así sí | Así no |
| --- | --- |
| Un solo botón azul marino por pantalla | Dos botones con acento compitiendo |
| La raya arriba y en la carga | La raya como fondo o en cada tarjeta |
| Hora ocupada tachada y con borde punteado | Hora ocupada escondida (el cliente cree que no hay horario) |
| «Martes 14 · 10:00» en Fraunces | Fechas en formato 14/10/2026 |

## Historial
| Versión | Fecha | Cambio | Pantallas afectadas |
| --- | --- | --- | --- |
| 1 | 2026-10-13 | Primera versión: dirección B elegida. | — |
