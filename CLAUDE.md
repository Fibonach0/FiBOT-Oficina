# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

**Oficina FiBOT** — panel personal de Nacho para ver de un vistazo en qué anda
cada línea de trabajo del ecosistema (prospección, Consultorio, Farmacia,
Personal-FiBOT…), con la estética de una oficina 2D: un escritorio por
"agente", click para el detalle. Sitio estático, GitHub Pages, en
**oficina.fibot.ar**.

Nace de que a Nacho le gustó la idea visual de
[Munder Difflin](https://munderdiffl.in/) (harness multi-agente open source,
oficina 2D con Pixi.js) y quiso algo parecido para ver sus propios frentes de
trabajo — con la mira puesta en, más adelante, ofrecerle una versión real
(con avatares por empleado y mensajería real) a Transportes Cantarini.

## Ojo con la licencia si en algún momento se busca "el look exacto" de Munder Difflin

El **código** de Munder Difflin es MIT. El **tileset pixel-art** que usa
("Modern Interiors" de LimeZu) es un asset de terceros bajo licencia paga
(itch.io) — Munder Difflin lo *licenció para su propio uso*, eso no lo hace
libre para que lo copiemos a este repo. Por eso esta v1 usa avatares propios
(SVG simple, generados en `index.html`, geometría original) en vez de esos
assets. Si en algún momento se quiere ese estilo pixel-art puntual, hay dos
caminos: comprar la licencia de LimeZu (barata, uso personal/comercial con
atribución) o buscar un tileset CC0 equivalente (ej. Kenney.nl) — decisión de
Nacho, no algo para resolver copiando archivos.

Tampoco vale la pena acercarse a la estética "Dunder Mifflin" (la empresa
ficticia de *The Office*, NBC/Universal) más allá de lo que ya hizo el propio
Munder Difflin como chiste — si esto se comercializa a Cantarini algún día,
va con marca FiBOT (crema/verde/naranja), no con nada que remita a la serie.

## Qué NO es (todavía) — la distinción importante

Los "agentes" de este panel **no son procesos corriendo 24/7 esperando
mensajes**. Son líneas de trabajo reales (algunas automatizadas de verdad,
como la prospección vía GitHub Actions; otras son sesiones de Claude Code que
existen mientras dura una conversación). Lo que este panel puede mostrar
honestamente es **estado observable** — último commit, último PR, última
corrida de una rutina — no un chat en vivo con alguien sentado esperando.

Eso importa para la idea más grande de Cantarini (avatares de empleados
reales, mandarles un mensaje acá adentro y que les llegue por WhatsApp/mail
de verdad): ese puente de mensajería es un proyecto aparte, con su propio
backend con estado y credenciales — no una extensión de este sitio estático.
Ver conversación de origen para el detalle de por qué se separó en dos fases.

## Arquitectura

```
index.html   la oficina entera: HTML + CSS + JS vanilla, sin build ni framework
agents.json  el roster — nombre, rol, color, estado, nota, link, repo (opcional)
layout.json  el diseño "oficial" — grilla + qué mueble va en qué celda
CNAME        oficina.fibot.ar
```

Cada escritorio y cada mueble es un SVG dibujado a mano (`avatarSVG()` /
`DECO_SVG` en `index.html`) — nada de assets externos, cero riesgo de
licencia. El estado (`activo` / `pausa` / `bloqueado`) es el punto de color
en el monitor; la nota corta es lo primero que se lee, el panel de detalle
(click) trae la descripción larga, el link al repo y —si el agente tiene
`repo` público— el último commit en vivo.

**`agents.json` (el roster) y `layout.json` (dónde va cada cosa) están
separados a propósito**: un escritorio en el layout sólo guarda `agenteId`,
nunca los datos del agente. Así mover muebles no toca el roster, y cambiar
la nota de un agente no rompe el layout.

### Modo diseño — construcción estilo Sims

Botón "Modo diseño" en el header. Con la paleta abierta: elegís un mueble,
click en una celda libre del piso para colocarlo; arrastrás (pointer events,
mouse y touch) lo ya puesto para moverlo; `Delete`/`Backspace` borra la
selección; un escritorio seleccionado tiene un `<select>` para asignarle (o
sacarle) un agente. Todo en una sola grilla de celdas de 1×1 — nada de
rotación ni de muebles de más de una celda en esta v1, a propósito, para que
la lógica de colisión/arrastre sea trivial y no tenga bugs de bordes.

**Persistencia, y por qué es así:** cada cambio se guarda solo en
`localStorage` del navegador de quien está diseñando (`guardarLocal()`) — no
hay backend que reciba el diseño en vivo, es un sitio estático. Un diseño en
`localStorage` es un *boceto personal*, no lo ve nadie más. Para que un
diseño sea "lo que ve cualquiera que entra", hay que **exportarlo**
(`Descargar layout.json` en modo diseño) y commitear ese archivo acá —
Nacho lo puede hacer él mismo (tiene push) o pasármelo para que lo suba.
"Restablecer al oficial" borra el boceto local y vuelve a leer el
`layout.json` commiteado.

Si `layout.json` no existiera (o el fetch fallara), `layoutPorDefecto()`
genera un layout mínimo con un escritorio por agente en fila — la página
nunca queda en blanco por falta de ese archivo.

## Datos en vivo — sólo para lo que es de verdad público

`agente.repo` ("owner/nombre") habilita el commit más reciente en vivo en el
panel de detalle, vía `https://api.github.com/repos/{repo}/commits` sin
auth, client-side. **Nunca poner `repo` en un agente cuyo repo sea
privado** — el fetch sin token le pegaría un 404 a cualquiera que entre, y
la solución NUNCA es meter un token en este archivo (lo sirve un sitio
público). Verificado a mano cuáles son realmente públicos antes de
cargarlos (`curl api.github.com/repos/... | jq .private`) — varios repos
del ecosistema con nombre "genérico" resultaron privados pese a las
apariencias, así que no asumir, comprobar.

Para lo que no es un repo público (Personal-FiBOT, jarvis, o algo que ni
vive en GitHub como el tracker de la rutina de prospección), sigue siendo
`nota` a mano — ver la sección de abajo para el camino a futuro si se
quiere automatizar eso también.

## Estado de los datos que siguen siendo a mano

Fuera de los repos públicos, `agents.json` se edita a mano. Caminos reales
para cuando se quiera automatizar el resto: una GitHub Action programada
que escriba un `agents.json`/`layout.json` actualizado (puede leer repos
privados con un token que vive como secret de Action, nunca en el cliente),
o un endpoint chico. Nada de esto lo puede hacer el sitio estático solo.

## Convenciones

- **Nunca commitear directo a `main`**: rama + PR.
- Sitio estático: sin build, sin dependencias, se edita y se pushea.
- Cero credenciales acá — este repo es público y sirve una página pública.
