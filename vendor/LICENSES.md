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
