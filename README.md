# Oficina FiBOT

Panel personal de Nacho: un escritorio por línea de trabajo (agente), en una
oficina 2D. Click en un escritorio para ver el detalle y el link al repo.

Sitio estático, sin build ni dependencias — se edita y se pushea; GitHub
Pages publica en **oficina.fibot.ar**.

Se entra con la **misma cuenta de hub.fibot.ar** (Supabase Auth, mismo
proyecto), y sólo pasa la cuenta de Nacho. Es una cortina, no una pared —
los JSON del sitio siguen siendo públicos por URL; ver "La puerta" en
`CLAUDE.md` antes de guardar acá algo sensible.

Tiene **Modo diseño**: elegís muebles de una paleta y armás el layout
arrastrando, como el área de construcción de un juego de simulación. Ver
"Modo diseño" en `CLAUDE.md` para cómo persiste (spoiler: en el navegador de
quien diseña, hasta que se exporta y se commitea `layout.json`).

Los avatares son **Open Peeps** (Pablo Stanley, CC0), pre-generados y
embebidos en `avatares.json` — cero dependencia externa en tiempo de
ejecución. Ver "Avatares" en `CLAUDE.md`.

La oficina puede tener **varias salas** (pestañas arriba del piso), cada
una con su grilla y sus muebles. Se crean, renombran y eliminan desde
Modo diseño.

## Actualizar el estado de un agente

Editar `agents.json` — cada agente tiene `nombre`, `rol`, `color`, `estado`
(`activo` / `pausa` / `bloqueado`, cambia el punto de color del escritorio),
`nota` (lo que se lee en el escritorio y en el panel), `link` y, sólo si el
repo es realmente público, `repo` (`"owner/nombre"`) para el commit más
reciente en vivo.

## Cambiar el layout "oficial"

1. Abrir el sitio, tocar **Modo diseño**, armar como quieras.
2. **Descargar layout.json** y reemplazar el archivo del repo con ese
   contenido (push directo o pedírselo a Claude).
3. "Restablecer al oficial" en el sitio descarta cualquier boceto local y
   vuelve a leer el `layout.json` commiteado.

## Local

```bash
python3 -m http.server 8000
```

## Deploy

GitHub Pages, rama `main`, raíz. `CNAME` viaja en el repo — del lado DNS
(Cloudflare, zona `fibot.ar`) hace falta `CNAME oficina → fibonach0.github.io`
**sin proxy**, mismo patrón que el resto de los subdominios de FiBOT.
