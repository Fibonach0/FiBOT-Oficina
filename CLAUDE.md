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
index.html     la oficina entera: HTML + CSS + JS vanilla, sin build ni framework
agents.json    el roster — nombre, rol, color, estado, nota, link, repo (opcional)
layout.json    el diseño "oficial" — grilla + qué mueble va en qué celda
avatares.json  los 3 sets de avatares CC0 pre-generados (ver más abajo)
CNAME          oficina.fibot.ar
```

Cada mueble de decoración es un SVG dibujado a mano (`DECO_SVG` en
`index.html`) — nada de assets externos, cero riesgo de licencia. El estado
(`activo` / `pausa` / `bloqueado`) es el punto de color en el monitor; la
nota corta es lo primero que se lee, el panel de detalle (click) trae la
descripción larga, el link al repo y —si el agente tiene `repo` público— el
último commit en vivo.

**`agents.json` (el roster) y `layout.json` (dónde va cada cosa) están
separados a propósito**: un escritorio en el layout sólo guarda `agenteId`,
nunca los datos del agente. Así mover muebles no toca el roster, y cambiar
la nota de un agente no rompe el layout.

### Modo diseño — construcción estilo Sims

Botón "Modo diseño" en el header. Con la paleta abierta: elegís un mueble,
click en una celda libre del piso para colocarlo; arrastrás (pointer events,
mouse y touch) lo ya puesto para moverlo; `Delete`/`Backspace` borra la
selección; un escritorio seleccionado tiene un `<select>` para asignarle (o
sacarle) un agente. **Rotar (R)** gira el mueble seleccionado de a 90°
(`rot` en el objeto, opcional, default 0) — rota sólo el cuerpo, la
etiqueta con el nombre queda derecha para que se lea. Botones **+/− col** y
**+/− fila** agrandan o achican el piso (3 a 30 celdas por lado); achicar
sólo se permite si la última columna/fila está vacía, nunca se pierde un
mueble por un click de más. Todo en una grilla de celdas de 1×1 — nada de
muebles de más de una celda, a propósito, para que la lógica de
colisión/arrastre sea trivial y no tenga bugs de bordes. Las teclas
(Delete, R, Escape) se ignoran si el foco está en un input o select — que un
Backspace en el desplegable de agente no borre el escritorio.

Muebles disponibles (todos SVG propio, `DECO_SVG`): escritorio, planta,
estantería, sofá, cafetera, pizarrón, alfombra, divisor, ventana, reloj,
archivero, dispenser, impresora. Sumar uno es agregar una entrada en
`PALETA` y otra en `DECO_SVG`, nada más.

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

## Avatares — 4 estilos, elegibles, cero dependencia en tiempo de ejecución

Selector "Avatares" en el header (persiste en `localStorage`, es preferencia
de quien mira, no del layout). Cuatro opciones:

- **Clásico** — el circulito con cara dibujado a mano (`avatarSVG()`), el
  original de la v1. Cero dependencias, siempre disponible.
- **Open Peeps** (Pablo Stanley), **Lorelei** (Lisa Wischofsky) y **Pixel
  Art** (DiceBear) — los tres **CC0 1.0** (dominio público, sin atribución
  obligatoria), elegidos a propósito entre los estilos de
  [DiceBear](https://www.dicebear.com/) que **son** CC0 — DiceBear tiene 61
  estilos y varios (ej. Adventurer) son CC-BY-4.0 (piden crédito visible) o
  de licencia más restrictiva; no vale asumir, hay que mirar cada uno.

**Por qué están embebidos en `avatares.json` y no vienen de la API/librería
de DiceBear en vivo**: es la misma lógica que ya rige el resto del sitio —
cero dependencia externa en tiempo de ejecución. Se generaron **una sola
vez**, localmente, con `@dicebear/core` + `@dicebear/collection` (Node) y
quedaron commiteados como SVG crudo. Si en algún momento se suman más
agentes hace falta regenerar `avatares.json` corriendo ese mismo script de
nuevo (no está en el repo — es un array de 10 líneas, rehacerlo es más
rápido que mantenerlo).

**Bug real que ya pasó acá, para no repetirlo**: DiceBear devuelve el mismo
`id="viewboxMask"` en TODOS los avatares que genera. Con un solo avatar en
pantalla no se nota; con varios a la vez (como acá, un escritorio al lado
del otro) el navegador resuelve `url(#viewboxMask)` contra el PRIMER
elemento con ese id en el documento — todos los avatares terminan
enmascarados por la máscara del primero. `index.html` renombra esos id (y
sus referencias `url(#...)`) a algo único cada vez que inserta un avatar en
el DOM (`idsUnicos()`) — no tocar esa función sin entender por qué existe.

Segundo bug, más tonto, de la misma tanda: al limpiar el SVG generado (sacar
el `width`/`height` fijo del `<svg>` raíz para que lo maneje la clase CSS
`.avatar`) un regex sin acotar le pegó por error al `width`/`height` de un
`<rect>` interno de la máscara en vez de al de la etiqueta `<svg>` — la
máscara quedó en 0×0 y el avatar entero se volvió invisible, sin ningún
error en consola. La lección: al tocar un SVG generado por otra librería,
acotar cualquier reemplazo a la etiqueta de apertura exacta, nunca un regex
que corra sobre el documento entero.

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

## La puerta — login con la cuenta de hub.fibot.ar, y entra una sola persona

Pedido de Nacho: que para entrar haga falta **su misma clave de
hub.fibot.ar**, y que **sólo la suya** funcione. Se resolvió contra el mismo
proyecto de Supabase que usa `cantapp` (URL + publishable key, ambos
públicos por diseño — viajan en el build de hub.fibot.ar), **sin librería**:
el login por clave de Supabase Auth es una llamada REST
(`POST /auth/v1/token?grant_type=password`), la sesión se valida con
`GET /auth/v1/user`, se renueva con `grant_type=refresh_token` y se cierra
con `POST /auth/v1/logout`. Todo en `index.html`, bloque "puerta". Cero
dependencia nueva (la librería oficial pesa 212KB y acá se usa un 2%).

**Sólo el dueño**: después de un login exitoso se compara el `sha256` del
mail (en minúsculas — los mails de ese proyecto están normalizados así) con
`AUTH.duenoSha256`. Cualquier otra cuenta válida de hub ve "Esta oficina es
solo de Nacho", se le cierra la sesión en Supabase y no se guarda nada.
El hash en vez del mail en texto plano es para no dejar el mail escrito en
un repo público; **no es un secreto ni protege nada** — es pudor.

**Lo que esto NO es — la misma advertencia que en cantapp, agravada**: es
una **cortina, no una pared**. El sitio es estático en GitHub Pages:
`agents.json`, `layout.json` y `avatares.json` se bajan directo por URL
aunque nunca se pase por la puerta, y el repo es público. La puerta sirve
para que la oficina no quede abierta a cualquiera que tenga el link, y para
que la experiencia sea "mi panel con mi clave". **No sirve para poner ahí
nada sensible** — si algún día hace falta eso, el camino real es
**Cloudflare Access** delante del hostname (Nacho ya lo usa para el túnel
del mini-server; policy "mail = el suyo"), que sí bloquea las URLs de los
archivos, no sólo la UI. Requiere pasar el DNS a proxy naranja, con lo que
GitHub deja de renovar su certificado — se resuelve con SSL "Full" en
Cloudflare, pero hay que hacerlo a conciencia, no de pasada.

La sesión vive en `localStorage` (`fibot-oficina-sesion`) y es propia de
`oficina.fibot.ar` — no se comparte con hub.fibot.ar aunque sea la misma
cuenta (distinto origen). Se pide la clave una vez por navegador.

Testeado con Playwright interceptando `supabase.co` (`page.route`), sin
tocar producción ni necesitar la clave de nadie: puerta cerrada por
defecto y sin fetch de datos hasta entrar, clave incorrecta, otra cuenta
de hub rechazada + logout remoto, dueño entra, sesión persiste al recargar,
refresh automático al vencer, token inválido vuelve a la puerta, Salir.

## Convenciones

- **Nunca commitear directo a `main`**: rama + PR.
- Sitio estático: sin build, sin dependencias, se edita y se pushea.
- Cero credenciales acá — este repo es público y sirve una página pública.
