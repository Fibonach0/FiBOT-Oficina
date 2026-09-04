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
| `?tv=1` | Pantalla completa: sin controles ni textos, cámara que gira sola, medidor grande |
| `?calidad=alta\|media\|baja` | `alta`: sombras suaves y pixelRatio hasta 2 (default en escritorio). `media`: sombras simples y pixelRatio 1 (default con `?tv`). `baja`: sin sombras ni antialias |
| `?sala=cantarini` | Qué sala dibujar (default: la primera que no sea automática) |
| `?vida` | Acorta todos los tiempos de la vida (para las pruebas) |
| `?dbg` | Expone `escena`, `camara`, `control`, `gente`, `render`, `paso`, `camino` y `libre` en `window` |

## Qué lo decide

Decisión de Nacho (4/9): **la tele no es el criterio** — quizás nunca se use
ahí. El prototipo se evalúa en el navegador de escritorio, por cómo se ve y por
lo que muestra. `?tv=1` y el medidor de fps quedan porque no molestan, pero no
son la prueba de nada.

## Decisiones que costaron y conviene no re-descubrir

- **Los colores de piel y pelo se reconocen por paleta, no por orden.**
  DiceBear openPeeps usa listas cerradas (piel: 5 valores; pelo: 10), así que
  se busca el primer `fill` que esté en cada lista. Antes "pelo" era "el primer
  negro que aparezca", que es el trazo de ojos y boca de TODOS los avatares:
  cada cráneo salía negro, incluso el de la rubia. Sin color de pelo en el
  dibujo (pelo dibujado en negro, bandana o pelada) queda un negro azulado.
- **La cara lleva un casquete de piel debajo.** El SVG tiene fondo
  transparente y, sin eso, entre los trazos se veía el cráneo del color del
  pelo. Y el casquete de la cara es más amplio que al principio (2.35 rad):
  con 2.05 las orejas y el nacimiento del pelo quedaban cortados en un borde
  recto, que es lo que hacía "careta". Más de ~2.4 estira el dibujo.
- **La cara se pinta con `emissiveMap`** (intensidad .42): un dibujo plano se
  lee peor cuanto más lo modela la luz, y del lado de la sombra se volvía
  barro.
- **La gente camina por la grilla, con BFS, como en la oficina.** Cuatro
  vecinos, sólo `alfombra` y `puerta` son transitables entre los muebles, y las
  paredes son el borde de la grilla. Antes tres personas iban en línea recta a
  puntos fijos, atravesando escritorios y tabiques. Del escritorio **se sale y
  se entra por atrás o por los costados, nunca por adelante** (ahí está el
  monitor), y el tramo silla → primera celda va primero de lado y después al
  centro, así nunca es diagonal. La vuelta es el camino de ida al revés, para
  que valga la misma regla. `paso(dt)` es puro cálculo, separado del dibujo:
  la prueba corre 200 s de oficina en un segundo sin renderizar y verifica que
  nadie pisa una celda ocupada ni corta una esquina.
- **Quién se levanta**: el que no tiene tarea `en_curso` ni está
  `esperando_dueno`, igual que en la oficina. Va a un mueble de
  `ACTIVIDADES` (cafetera, heladera, dispenser, planta, sofá, pizarra, cuadro,
  ventana), la placa dice qué hace, y vuelve a sentarse. `?vida` acorta los
  tiempos para las pruebas.
- **Un mueble lo usa uno por vez, y el resto hace fila.** Cada parada tiene
  `ocupante` y `cola` (máximo 2). El que llega a un mueble ocupado va a la celda
  disponible más cercana que NO sea pegada al mueble (un paso atrás, como una
  cola de verdad), mira al mueble, cruza los brazos y la placa dice "espera
  turno"; cuando el ocupante se va, el primero de la fila pasa a una celda
  pegada. Si llega a la fila y el mueble ya se desocupó, pasa directo. Si
  espera demasiado, se cansa y vuelve. Las celdas de destino se **reservan**
  (`RESERVADAS`): dos personas nunca eligen la misma, ni para usar un mueble
  ni para esperar. Bug que tuvo esto media hora: pasarle el turno a alguien
  que **todavía venía caminando** hacia la fila lo dejaba con una ruta y una
  fase incoherentes; ahora el turno queda anotado y avanza cuando llega. Y la
  reserva se libera ANTES de pasar el turno, así el siguiente puede ocupar
  justo la celda que se desocupa.

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
