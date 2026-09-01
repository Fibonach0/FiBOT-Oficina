# Oficina FiBOT

Panel personal de Nacho: un escritorio por línea de trabajo (agente), en una
oficina 2D. Click en un escritorio para ver el detalle y el link al repo.

Sitio estático, sin build ni dependencias — se edita `index.html` /
`agents.json` y se pushea; GitHub Pages publica en **oficina.fibot.ar**.

## Actualizar el estado de un agente

Editar `agents.json` — cada agente tiene `nombre`, `rol`, `color`, `estado`
(`activo` / `pausa` / `bloqueado`, cambia el punto de color del escritorio),
`nota` (lo que se lee en el escritorio y en el panel) y `link`.

No hay datos en vivo todavía — ver `CLAUDE.md` para qué haría falta para
que se actualice solo.

## Local

```bash
python3 -m http.server 8000
```

## Deploy

GitHub Pages, rama `main`, raíz. `CNAME` viaja en el repo — del lado DNS
(Cloudflare, zona `fibot.ar`) hace falta `CNAME oficina → fibonach0.github.io`
**sin proxy**, mismo patrón que el resto de los subdominios de FiBOT.
