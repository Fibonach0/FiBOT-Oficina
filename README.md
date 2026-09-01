# Oficina FiBOT

Panel personal de Nacho: un escritorio por línea de trabajo (agente), en una
oficina 2D. Click en un escritorio para ver **en qué tarea está, si está
esperando algo tuyo** y contestarle. **FiBOT es el gerente**: el botón
"Pedirle a FiBOT" le manda un pedido y él decide qué asistente lo agarra.

Sitio estático, sin build ni dependencias — se edita y se pushea; GitHub
Pages publica en **oficina.fibot.ar**.

Se entra con la **misma cuenta de hub.fibot.ar** (Supabase Auth, mismo
proyecto), y sólo pasa la cuenta de Nacho. Es una cortina, no una pared —
los JSON del sitio siguen siendo públicos por URL; ver "La puerta" en
`CLAUDE.md` antes de guardar acá algo sensible.

Tiene **Modo diseño**: elegís muebles de una paleta y armás el layout
arrastrando, como el área de construcción de un juego de simulación —
incluye muros que se pintan arrastrando, puertas, islas con 4 asientos y
una goma. Ver
"Modo diseño" en `CLAUDE.md` para cómo persiste (spoiler: en el navegador de
quien diseña, hasta que se exporta y se commitea `layout.json`).

Los avatares son **Open Peeps** (Pablo Stanley, CC0), pre-generados y
embebidos en `avatares.json` — cero dependencia externa en tiempo de
ejecución. Ver "Avatares" en `CLAUDE.md`.

La oficina puede tener **varias salas** (pestañas arriba del piso), cada
una con su grilla y sus muebles. Se crean, renombran y eliminan desde
Modo diseño.

## Carteles y apariencia

Los **carteles** son pizarras que abren un sitio al hacerles click (Railway,
la flota de Cantarini, el hub, GitHub…); se agregan y editan desde Modo
diseño (título, link, emoji opcional). Desde el panel de cualquier agente,
**Editar apariencia** abre un editor de Open Peeps (peinado, cara, anteojos,
piel, ropa) que se guarda en tu navegador; "Descargar avatares.json" lo
vuelve oficial, igual que el layout.

## La oficina tiene vida

Los agentes tienen cuerpo y caminan: cuando no tienen tarea van a la
cocina (cafetera, heladera, dispenser), riegan las plantas o pasan a mirar
el **cuadro del agente del mes** (quien más tareas terminó el mes pasado —
los demás compiten por el lugar). Cuando les cae una tarea grande van a
buscar dos cafés. Las tazas en cada escritorio son las tareas que le
pediste ese mes. Todo sale de datos reales del bot; ver "Vida en la
oficina" en `CLAUDE.md`.

## El estado vivo

Lo que cada escritorio muestra (tarea, "te pregunta algo", cuándo reportó)
sale de Personal-FiBOT (`OFICINA_API` en `index.html`): `GET /oficina/estado`
cada minuto, y los pedidos van a `POST /oficina/pedir`. Si la API no
responde, se ve el estado estático de `agents.json`; `estado.json` es una
muestra del contrato para probar sin backend. Contrato y detalle en
"FiBOT gerente + estado vivo" de `CLAUDE.md`. FiBOT espeja cada pedido y
cada respuesta por Telegram.

## Actualizar el roster

Editar `agents.json` — cada agente tiene `nombre`, `rol`, `color`, `estado`
y `nota` (fallback estático cuando no hay estado vivo), `link`, `gerente`
(sólo FiBOT) y, sólo si el repo es realmente público, `repo`
(`"owner/nombre"`) para el commit más reciente en vivo.

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
