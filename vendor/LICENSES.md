# vendor/

`openpeeps.js` es un bundle (bun, minificado) de:

- **@dicebear/core** y **@dicebear/collection** (sólo `openPeeps`) — MIT,
  © DiceBear (Florian Körner). https://github.com/dicebear/dicebear
- **Open Peeps** — CC0 1.0, Pablo Stanley. https://www.openpeeps.com/

Se carga **sólo cuando se abre el editor de apariencia** (Modo diseño / panel de
un agente → "Editar apariencia"). La oficina en sí no lo necesita: los avatares
ya generados viven en `avatares.json`.

Para regenerarlo: `npm i @dicebear/core @dicebear/collection`, un `entry.js` con
`window.OpenPeeps = { createAvatar, openPeeps }` y
`bun build entry.js --outfile vendor/openpeeps.js --minify --format=iife --target=browser`.

## three/

`three.module.min.js` es el build oficial de **three.js 0.170.0** — MIT,
© 2010-2024 three.js authors. https://github.com/mrdoob/three.js — la licencia
completa está en `three/LICENSE`. `three/jsm/` son tres módulos de
`examples/jsm/` del mismo paquete y la misma versión (OrbitControls,
RoundedBoxGeometry, RoomEnvironment), copiados tal cual.

Lo usa **sólo el prototipo 3D** (`proto/3d/`). La oficina de producción no lo
carga. Para actualizarlo: `npm i three@<versión>` y copiar
`node_modules/three/build/three.module.min.js`, `LICENSE` y los tres módulos
de `examples/jsm/`.
