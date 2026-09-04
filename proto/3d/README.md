# Prototipo 3D de la oficina

Maqueta de cómo se vería `oficina.fibot.ar` con la sala renderizada en 3D real
(Three.js sobre WebGL) en lugar del isométrico en SVG que hoy está en
producción. **No es la oficina**: es una pieza aparte para decidir si vale la
pena cambiar el motor de dibujo.

Nació de que Nacho pasó [Bot Crossing](https://github.com/jarrenrocks/bot-crossing),
que muestra sesiones de agentes como astronautas en una colonia 3D.

## Qué prueba

Que se puede reemplazar **sólo la vista** y no tocar nada más. Lee el mismo
`layout.json`, el mismo `agents.json` y las mismas caras de `avatares.json` que
la oficina de verdad. Si esto se adopta, reemplaza `isoRender()` y sobreviven el
Modo diseño en 2D, el BFS de los muñecos, las salas, Payroll, el modo TV y la
puerta.

## Cómo correrlo

No hay que compilar nada: es una página estática más del sitio y **se publica
con GitHub Pages en `oficina.fibot.ar/proto/3d/`**. Lee en vivo los mismos
`layout.json`, `agents.json` y `avatares.json` de la raíz del repo, y el estado
de cada agente sale del bot si en ese navegador hay sesión de la puerta (mismo
origen que la oficina, mismo `localStorage`); si no, de la muestra
`estado.json`. three.js está en `vendor/three/` (ver `vendor/LICENSES.md`).

Localmente: cualquier servidor estático en la raíz del repo
(`python3 -m http.server 8768`) y abrir `http://localhost:8768/proto/3d/`.

Parámetros en la URL:

| Parámetro | Qué hace |
|---|---|
| `?tv=1` | Para la tele: sin controles ni textos, cámara que gira sola, medidor grande |
| `?calidad=alta\|media\|baja` | `alta`: sombras suaves y pixelRatio hasta 2 (default en escritorio). `media`: sombras simples y pixelRatio 1 (default con `?tv`). `baja`: sin sombras ni antialias |
| `?sala=cantarini` | Qué sala dibujar (default: la primera que no sea automática) |
| `?dbg` | Expone `escena`, `camara`, `control`, `gente` y `render` en `window` |

## La prueba que decide (pendiente de Nacho)

Abrir en el navegador de la tele **`https://oficina.fibot.ar/proto/3d/?tv=1`** y
leer el medidor de abajo a la derecha: cuadros por segundo, resolución,
pixelRatio, calidad y la GPU que reporta el navegador. El número se pinta en
rojo abajo de 30, que es donde el movimiento empieza a verse a tirones.

- **≥ 45 fps con `calidad=media`**: el 3D es viable en la tele y se puede
  encarar la integración (reemplazar `isoRender()`).
- **30–45**: probar `&calidad=baja`. Si ahí sube a más de 45, viable con
  recortes (sin sombras).
- **< 30 incluso en `baja`**, o la pantalla de "este navegador no tiene
  WebGL": el isométrico SVG se queda, y el 3D queda como pieza aparte para
  escritorio o para un Chromecast/mini-PC, no para el navegador de la tele.

Sacarle una foto al medidor con el celular alcanza como registro.

## Decisiones que costaron y conviene no re-descubrir

- **La cara no puede ser un plano adelante de la cabeza.** Se ve como una
  careta puesta: se nota el borde y el aire entre medio. Va sobre un **casquete
  de la misma esfera del cráneo**, con el mismo radio, así queda pintada encima
  y se curva con ella.
- **El cráneo va del color del pelo**, no de la piel: lo que queda a la vista
  por los costados y atrás es la cabellera, y de espaldas se sigue reconociendo
  quién es.
- **La cara va corrida por encima del ecuador** de la esfera y la cabeza lleva
  13° de mentón arriba. Centrada al medio se ve cabizbaja, porque la cámara
  mira desde arriba.
- **El recorte del avatar se midió, no se estimó.** La cabeza en el dibujo de
  Open Peeps va de y≈90 a y≈560 sobre 704; recortando a 420 quedaban la boca y
  el mentón afuera. Un recorte mal puesto se lee como "está mirando al piso".
- **Extruir el SVG entero no sirve** (se probó): el dibujo incluye el cuerpo, el
  `<mask>` del viewBox entra como una placa blanca gigante, y el pelo hecho
  sólido le tapa la cara.
- **Los escritorios están dados vuelta** respecto del isométrico: la persona
  queda del lado de la cámara y el monitor entre medio, con la pantalla
  mirándola a ella. Sentada mirando el monitor contra el fondo no se le ve la
  cara nunca, y el sprite plano lo disimulaba porque siempre giraba.
- **Las texturas se dibujan en un canvas, no se bajan.** Para un mundo de
  juguete una foto de roble 4K queda peor que una veta dibujada: rompe la
  escala. Y de paso la escena no depende de nada externo.
- **La luz de entorno (IBL) es lo que más levanta los materiales**, pero sumada
  a la hemisférica lava el contraste hasta borrar las sombras. La clave tiene
  que pesar bastante más que el relleno.
- **La sombra de contacto es aparte del mapa de sombras.** El mapa resuelve la
  sombra larga; sin la manchita difusa debajo, todo parece flotando un
  milímetro sobre el piso.
- **El damero del piso venía de cuando era color plano.** Con la veta encima las
  dos tramas se pelean; el entablonado solo se lee mejor.
- Escalar y rotar el mismo objeto con una escala **no uniforme** lo deforma en
  diagonal: por eso la cabeza son dos grupos anidados, uno para el achatado y
  otro para la inclinación.

## Lo que falta

- Probarlo en el navegador de una tele: **WebGL en un smart TV es el riesgo que
  decide si esto reemplaza al isométrico o no.**
- Las animaciones de la vida (caminatas, café, actividades) están simuladas con
  un recorrido fijo; la lógica real ya existe en `index.html` y habría que
  engancharla.
- Los muebles son primitivas. Con modelos CC0 de verdad suben bastante — ver
  [`docs/assets-3d.md`](../../docs/assets-3d.md).
