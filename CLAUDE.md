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

Ese backend ya tiene dueño: **es Personal-FiBOT**. La oficina no habla con
los agentes, habla con FiBOT, y FiBOT es el gerente — ver la sección "FiBOT
gerente + estado vivo".

## FiBOT gerente + estado vivo (Etapa 1 hecha; la 2 vive en Personal-FiBOT)

Lo que Nacho quiere ver de cada escritorio no es "abrir el repo" sino **en
qué tarea está, si está esperando algo de él, y poder contestarle o pedirle
algo**. Y un solo lugar donde pedir: **FiBOT es el gerente** (`gerente: true`
en `agents.json`, único) — recibe el pedido y decide qué asistente lo agarra
("necesito clientes" → Prospección; "TC dice que el 500 no reporta" →
FlotaBot). El botón **Pedirle a FiBOT** del header abre su panel directo.

### El contrato

```json
{ "generado": "ISO",
  "agentes": { "<id>": {
      "estado": "en_curso | esperando_dueno | pendiente | hecha | inactivo",
      "tarea": "una línea", "detalle": "opcional",
      "pregunta": "sólo con esperando_dueno",
      "actualizado": "ISO — cuándo reportó el agente",
      "link": "opcional: PR, corrida, lo que sea" } } }
```

`OFICINA_API` en `index.html` apunta al bot (`jarvis-bot-production-31a4.up.railway.app`,
servicio Personal-FiBOT en Railway); si se vacía, la oficina cae a
**`estado.json`**, una muestra estática que no cambia sola. Con la API, la oficina pide `GET {api}/oficina/estado` cada minuto y
manda pedidos a `POST {api}/oficina/pedir` `{para, texto}`, en ambos casos
con el `access_token` de Supabase de la puerta como `Bearer`. **La
autorización real va del lado de FiBOT**: verifica ese token contra
`/auth/v1/user` de Supabase y compara el mail con el del dueño — la puerta
de acá sigue siendo una cortina (ver "La puerta").

Lo que hace el front con eso:

- `estadoDe(obj)` prefiere el estado vivo y cae a `agente.estado` de
  `agents.json` si el agente no reportó nunca — por eso `estado`/`nota`
  siguen existiendo ahí como fallback.
- `esperando_dueno` pinta una **burbuja "te pregunta algo"** sobre el
  escritorio y en el panel muestra la pregunta en una caja con el textarea
  en modo "Contestale…".
- Con `OFICINA_API` vacío el botón Enviar queda deshabilitado con la nota
  "Etapa 2: por ahora, por Telegram", y el submit forzado devuelve el mismo
  mensaje en vez de un fetch a `""`.
- El link al repo quedó chiquito abajo del panel: dejó de ser lo principal.

`estado.json` es una muestra a propósito realista (pregunta real del
Consultorio sobre credenciales pendientes) para que el panel se pueda
probar sin backend. Cuando la Etapa 2 esté conectada, el archivo puede
quedar como fallback si la API no responde, o borrarse.

## Arquitectura

```
index.html     la oficina entera: HTML + CSS + JS vanilla, sin build ni framework
agents.json    el roster — nombre, rol, color, estado, nota, link, repo (opcional)
layout.json    el diseño "oficial" — salas, cada una con su grilla y sus muebles
avatares.json  los avatares Open Peeps (CC0) pre-generados, uno por agente
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

Botón "Modo diseño" en el header. **Se diseña en 2D desde arriba y se mira en
isométrico** (ver "Vista isométrica"): esta sección describe el render plano,
que es el que se usa para diseñar y quedó tal cual estaba.

Con la paleta abierta: elegís un mueble,
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

**Salas**: el diseño son varias salas con pestañas arriba del piso
(esquema v2 de `layout.json`: `{ salas: [ {id, nombre, grid, objetos} ] }`).
Cada sala tiene su propia grilla y sus muebles; la pestaña activa se recuerda
en `localStorage` (`fibot-oficina-sala`). En modo diseño: **+ Sala** (pide
nombre), **Renombrar** y **Eliminar sala** (sólo si hay más de una, con
confirmación que dice cuántos muebles se van). En el código, `DISENO` es el
diseño entero y `LAYOUT` es la sala activa — una referencia a un elemento de
`DISENO.salas`, así todo lo que ya operaba sobre `LAYOUT.grid`/`.objetos`
siguió andando sin tocarlo. `normalizarDiseno()` acepta el esquema v1 (grid
+ objetos al tope, lo que había en el `layout.json` y en el localStorage de
Nacho) y lo migra a una sala "Principal": actualizar no borra nada.

Muebles disponibles (todos SVG propio, `DECO_SVG`): escritorio, planta,
estantería, sofá, cafetera, pizarrón, alfombra, divisor, ventana, reloj,
archivero, dispenser, impresora. Sumar uno es agregar una entrada en
`PALETA` y otra en `DECO_SVG`, nada más.

**Muros, puertas, islas y goma** (pedido de Nacho: oficinas privadas e
islas con escritorios compartidos):

- **Muro (pincel)**: no se coloca por click, se *pinta* arrastrando. Los
  pinceles (`PINCELES`) se enganchan en fase de captura sobre el tablero
  (`tablero.addEventListener("pointerdown", …, true)`) para ganarle al
  `pointerdown` de los objetos, que arrancaría un arrastre. Cada muro se
  dibuja **conectado a sus vecinos** (`muroSVG()` mira N/S/E/O y tira un
  brazo hacia cada muro o puerta adyacente) — así una hilera se ve como
  pared continua. No rota: se orienta solo por los vecinos.
- **Puerta**: hueco con hoja abierta, se coloca por click y se rota con R
  para ponerla en un muro vertical. Cuenta como vecino para los muros.
- **Goma**: pincel que borra arrastrando todo lo que **no** sea un
  escritorio ni una isla (`BORRABLE_CON_GOMA`) — esos tienen agentes
  asignados y se borran con Delete a conciencia, nunca de un plumazo.
- **Isla**: mesa redonda con **4 asientos** (arriba/derecha/abajo/
  izquierda), cada uno asignable a un agente desde el panel de selección
  (`obj.asientos`, array de 4). En modo oficina, click en la isla lista a
  los sentados y click en uno abre su panel.

Sigue siendo una grilla de 1×1 — una isla ocupa una celda (140px) con la
mesa al medio y los avatares chicos alrededor; alcanza y evita toda la
lógica de muebles multi-celda.

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

## El roster y las salas (sep 2026)

Nacho definió los agentes por repo: **Principal** (FiBOT gerente, Prospección,
Consultorio, Farmacia, Personal-FiBOT, Casa, Página=fibot.ar, Eventos,
Captcha=FiBOT-Multas, Oficina), **Cantarini** (HUB Flotas=cantapp, **Cepi**=el
bot de WhatsApp de la flota en fleet-bot-pastor —antes figuraba como
"FlotaBot"—, Peajes, Encomiendas=fleet-encomiendas) y **LODTE** (el juego
LODTE-Game y El Tabernero). Los ids de `agents.json` son los mismos que usa
Personal-FiBOT para delegar (`OFICINA_AGENTES_DEFAULT`): si se renombra uno
acá hay que renombrarlo allá, o las tareas no matchean escritorio. `repo`
sólo va en los públicos (fibot.ar, LODTE-Game, FiBOT-Oficina, Consultorio).

## Payroll — el piso de los costos (sep 2026)

Cuarta sala, **Payroll**: un pizarrón por servicio que Nacho paga (hosting,
APIs, proxies, dominios) con lo estimado, lo medido y lo pagado del mes, más un
pizarrón de totales por moneda. Lee `GET {OFICINA_API}/oficina/costos` con el
mismo `Bearer` de la puerta, cada minuto junto con el estado.

**Es una sala *automática* y esa es la idea entera**: `auto: "costos"` en
`layout.json`, `objetos` vacío, y `objetosDeCostos()` los regenera en cada
`render()` desde los datos. Cuando el dueño da de alta un servicio por chat
("Railway me sale 20 dólares por mes y vence el 5"), el pizarrón aparece solo —
no hay que pasar por el modo diseño. Consecuencias que hay que respetar al
tocar esto:

- **No se proyecta en isométrico.** Un piso de pizarrones es un tablero de
  datos, no una oficina: no hay volumen que mostrar y los números tienen que
  leerse. `isoActivo()` excluye las salas automáticas.
- El modo diseño está **desactivado dentro de esta sala** (paleta oculta,
  arrastre y colocación bloqueados con `salaEsAuto(LAYOUT)`, sin "Renombrar").
  Colocar algo a mano no tendría sentido: el próximo render lo borra.
- `guardarLocal()` y **Descargar layout.json** pasan por `disenoSerializable()`,
  que vacía los `objetos` de las salas automáticas. Sin eso, el `localStorage`
  y el `layout.json` exportado quedarían con pizarrones **congelados con los
  montos del día que se exportó** — datos viejos que después nadie entiende de
  dónde salieron.
- La sala se inyecta en un boceto local ya diseñado (ver "Salas nuevas en un
  boceto viejo"). Payroll fue el primer caso; hoy el mecanismo es general.

Cada pizarrón muestra **`a_pagar`** (lo medido le gana al estimado, porque es
el número real del mes), el estado como badge (`pagado` verde,
`vence_pronto` naranja, `vencido` rojo, `por uso` para un servicio sin día
fijo), cuándo vence en DD/MM, y una barra de consumido sobre estimado que se
pone naranja al pasarse. El `title` dice **cuándo se midió** y con qué fuente:
los datos de facturación no son de tiempo real, así que se dice en vez de
fingirlo.

**El piso es de sólo lectura a propósito.** Dar de alta un servicio o marcar un
pago se hace hablándole a FiBOT (tools `alta_servicio` /
`registrar_pago_servicio`, owner-only) — la nota al lado de las pestañas lo
dice. Meter un POST de "marcar pagado" acá significaría un endpoint de
escritura financiera más, disponible desde el navegador; no vale la pena.

Sin `OFICINA_API` (Etapa 1) o si el fetch falla, la sala muestra un pizarrón
que lo explica; el resto de la oficina sigue igual.

## Salas nuevas en un boceto viejo (sep 2026)

**Un boceto local le gana al `layout.json`**, así que una sala agregada al
oficial *después* de que alguien guardó el suyo no aparece nunca — y el que la
guardó no tiene cómo enterarse. No es hipotético: Cantarini y LODTE se sumaron
en el PR #12 y en el navegador de Nacho no estaban; sólo Payroll aparecía,
porque se inyectaba a mano con un flag propio.

`asegurarSalasOficiales(diseno, oficial)` generaliza aquel parche: al cargar un
boceto local suma cualquier sala del oficial que falte, **una vez cada una**.

- El registro (`fibot-oficina-salas-inyectadas`) recuerda cuáles ya ofreció,
  así **borrar una a propósito no la revive**. Migra el flag viejo
  `fibot-oficina-payroll-v1` para que quien ya tenía Payroll no la reciba dos
  veces.
- **El registro y el boceto se escriben juntos.** Anotar "ya la ofrecí" sin
  guardar la sala la haría desaparecer en la carga siguiente, esta vez para
  siempre — el registro impediría volver a sumarla. Ese bug existió durante
  media hora y lo encontró el test, no la lectura del código.
- Se inyecta desde el `layout.json` **real**, no desde `layoutPorDefecto()`:
  por eso hay un `cargarLayoutOficialCrudo()` que devuelve `null` si el fetch
  falla. Si no, una caída de red le metería salas inventadas al boceto del
  dueño y quedarían registradas como ya ofrecidas.
- El pie dice qué se sumó, una sola vez.

Probado con Playwright (`scratchpad/test-salas.mjs` de la sesión, no está en el
repo): boceto viejo con sala propia, segunda carga, sala borrada a mano,
navegador limpio, `layout.json` caído y el navegador con el flag viejo.

## Vista isométrica — se diseña en 2D y se mira en 3D (sep 2026)

Nacho pidió que la oficina fuera "estilo los Sims": avatares con su
cubículo, que se muevan. Dos maquetas previas se fueron para el lado de
*herramienta* (consola de estado, más densa y más "pro") y las rechazó — el
pedido era ir para el lado del **juego**, no del panel.

Lo que hace la diferencia es la **proyección**. Desde arriba, un mueble es un
recorte de papel; en isométrico tiene volumen. La proyección es **dimétrica
2:1**: el rombo de una celda mide `cell` de ancho y `cell/2` de alto, la de los
isométricos clásicos.

**La decisión que hizo barato todo esto**: se **diseña en 2D desde arriba y se
mira en isométrico**. El Modo diseño quedó **intacto** sobre el render plano de
siempre — arrastrar, pinceles, rotar, colocar, achicar la grilla — y el módulo
isométrico **no tiene una sola línea de interacción, sólo dibujo**. Lo caro de
un isométrico es justamente lo otro: invertir la proyección para saber qué
celda tocaste, ordenar el hit-testing por altura, rehacer el arrastre. Nada de
eso hizo falta. `layout.json` tampoco cambia de forma: misma grilla, mismas
celdas, mismos objetos.

`isoActivo()` es el criterio, en un solo lugar: isométrico salvo en Modo diseño
y salvo en una sala automática.

### Cómo está armado

- `isoMedidas()` / `isoXY()` / `isoZ()` — la proyección y la profundidad.
- `isoCaja()` dibuja las tres caras que ve la cámara; `isoCajaC()` es la misma
  centrada en la celda, y es la que se usa para todo: razonar con "ancho 0.5 en
  el medio, corrido 0.3 hacia la cámara" tiene muchos menos errores que
  calcular la esquina a mano.
- `ISO_DIBUJO` es un mueble por clave. **Las claves son las de `PALETA`, que no
  son las que uno supondría**: el "Divisor" de la paleta es `pared`, el pizarrón
  es `pizarra` y la heladera es `heladera`. Sumar un mueble es agregar una
  entrada acá, igual que en `DECO_SVG` para el plano.
- Las alturas van como **fracción de `cell`** (`A(.24)`), así una sala con
  celdas de 140 y otra de 100 se ven proporcionadas igual.

### Lo que costó encontrar y no conviene re-descubrir

- **La profundidad tiene que cruzar SVG y HTML.** Los muebles son SVG y las
  personas son HTML (para reusar los avatares de Open Peeps y los manejadores de
  siempre). Con un solo `<svg>` de fondo, todas las personas quedan por encima
  de todos los tabiques. Por eso el SVG se parte en **bandas de profundidad**,
  una por `round(x+y)`, y los recuadros de HTML usan `isoZ()` en **la misma
  escala**. Que un tabique le tape el cuerpo a alguien es la mitad de la
  sensación de estar adentro de la oficina.
- **`.capa-vida` no puede tener `z-index` propio en isométrico**: crearía un
  contexto de apilado y los muñecos que caminan volverían a flotar arriba de
  todo. En `.tablero.iso` se le pone `z-index: auto`.
- **Las etiquetas van en su propia capa** (`.iso-nombres`, z-index 9000).
  Arreglar lo anterior tapa los nombres detrás de los tabiques, que es correcto
  para el cuerpo y absurdo para el cartelito.
- **El contenedor y la pieza de adentro no pueden compartir clase.** El
  contenedor era `iso-cartel` igual que el cartel que lleva adentro, así que el
  CSS del cartel le pintaba al contenedor un segundo tablero vacío detrás de
  cada uno. Por eso el contenedor lleva prefijo propio: `iso-obj-<tipo>`.
- **El contenedor mide 0×0**: es un punto del que cuelgan los hijos con
  posiciones absolutas. Lo que se toca son los hijos, no el contenedor.

### La placa del cubículo: qué está haciendo cada uno

La primera versión isométrica mostraba quién estaba sentado y quién daba
vueltas, pero **no en qué andaba** — eso salía sólo al hacer click. Ahora cada
puesto tiene su **placa**: punto de color con el estado, nombre, la tarea, y
hace cuánto reportó. Si te está esperando, la placa se pone naranja y muestra
**la pregunta en lugar de la tarea**, que es lo que importa en ese momento.

El estado va como color y no como palabra: en una pantalla de pared el texto no
se alcanza a leer y el color sí. Cuando el agente nunca reportó queda la `nota`
de `agents.json`, en itálica y apagada — describe al agente, no lo que está
haciendo, y no tiene que leerse como una tarea en curso.

**La placa está corrida a la derecha a propósito.** Los cubículos quedan
escalonados y, en esta proyección, el vecino que tapa siempre cae abajo a la
IZQUIERDA: sin ese corrimiento la placa le pisa la cara. El test lo comprueba
por geometría (ninguna placa se superpone con ninguna cabeza), así que un
layout nuevo que rompa eso se cae en el test y no en la pantalla de Nacho.

### Que el que se levanta no quede además sentado

Bug real de la primera versión: al salir a la cafetera, el avatar **seguía
sentado en su silla** y aparecía dos veces. `salirPeep`/`sentarPeep` buscaban
el avatar en `.objeto[data-id] .avatar-wrap`, que es el DOM del render **plano**
— en isométrico ese nodo no existe y el `querySelector` devolvía `null` sin
error. Ahora hay una sola `mostrarSentado(p, sentado)` que sabe de las dos
vistas, y el puesto isométrico **siempre se crea** y se esconde con `display`
en vez de no existir, para poder volver a mostrarlo sin rehacer el render.

La invariante que verifica el test: **cada agente se ve exactamente una vez** —
o sentado en su puesto, o caminando. Se mide muestreando el DOM 14 veces con
`?vida` (que acelera los tiempos) y llegando a tener los 10 caminando a la vez.

El que camina usa `cuerpoIsoSVG()`: el cuerpo de la vista plana está dibujado
en planta y de frente quedaba raro. Conserva las clases `.pierna-i`/`.pierna-d`
para que la animación de caminata siga siendo la misma, y la cabeza usa el
mismo círculo con fondo claro que el que está sentado, así son la misma persona.

Las **tazas** (una por tarea del mes) se dibujan apoyadas en la tapa del
escritorio, no en la placa: colgadas de la etiqueta quedaban flotando en el aire.

### Los cubículos y el pasillo

Los tabiques (`pared`) laterales entre escritorio y escritorio son lo que
convierte una fila de escritorios en cubículos. **Amurallar también los fondos
se probó y arma bolsones sin salida**: los muñecos buscan camino por BFS en la
grilla y quedan encerrados en su propio cubículo. Por eso los fondos quedan
abiertos y cada bloque cerrado lleva una `puerta`, que junto con `alfombra` son
los dos únicos tipos que el buscador considera transitables (`CAMINABLE`).

Al tocar el `layout.json` oficial conviene volver a correr la comprobación que
se usó acá: recorrer el piso libre con un BFS y confirmar que queda **una sola
región conectada** y que **ningún escritorio queda sin vecino transitable**. Los
tres primeros intentos de este layout partieron el piso en dos y el chequeo los
frenó antes de que llegaran al repo.

## Modo TV — la oficina en una pantalla de pared (sep 2026)

`?tv=1` deja la oficina mirable a tres metros: sin botones, sin pestañas, sin
pie, el piso escalado a la pantalla entera y las salas **rotando solas**.
Parámetros: `&cada=40` (segundos por sala, default 25) y
`&salas=principal,payroll` (cuáles y en qué orden).

**Es una vista aparte, no un rediseño**: sin el parámetro no cambia una coma.

Detalles que costaron encontrarse y conviene no re-descubrir:

- El piso tiene medidas fijas en píxeles (`cols × cell`), así que se escala
  entero con `transform: scale()`. Eso arrastra también a los muñecos de la
  capa de vida, que están posicionados **dentro** del tablero y no sobre la
  pantalla — por eso no hay que tocarlos aparte.
- Entre `.escena` y `.tablero-envoltorio` hay una `.columna-tablero` que no es
  flex, y `.escena` usa `align-items: flex-start`. Con eso el marco queda del
  alto de su contenido: la sala de Payroll, que es una sola fila, se dibujaba
  en una fajita de 170 px arriba de una tele de 1080 y la escala calculaba
  contra ese hueco. En modo TV las dos cosas se estiran.
- La escala tiene tope de 3: una sala con dos pizarrones tiene lugar para
  agrandarse seis veces y a esa altura se lee como un cartel de ruta.
- La rotación **no pisa** `CLAVE_SALA`: la tele es una vista, no una
  preferencia del dueño.
- La hora del último dato está siempre a la vista y se pone en rojo a los 5
  minutos. Un tablero de pared miente callado: si el sondeo se cortó, sigue
  mostrando lo de hace una hora con la misma cara.
- Wake Lock mientras la pestaña esté visible, re-pedido al volver del fondo.
  Si el navegador de la tele no lo soporta, hay que apagar el suspendido en
  las opciones del televisor.

### Cómo llega a la tele

Dos caminos, y el modo TV hace falta para los dos:

1. **Castear la pestaña** desde Chrome (⋮ → Enviar → Enviar pestaña). Anda
   hoy, cero código: la tele recibe píxeles de una sesión **ya iniciada**, así
   que no hay problema de login. El costo es que la máquina queda prendida con
   la pestaña abierta.
2. **Un receiver de Google Cast** (pendiente): libera la máquina, pero la tele
   carga la URL sola, sin cookie y sin `localStorage`. Ahí vuelve el login, y
   la salida es que el sender —donde el dueño SÍ está logueado— mintee un token
   de pantalla y se lo pase al receiver por el canal de Cast, sin que nadie
   tipee nada con el control. Requiere registrar el receiver en la Cast SDK
   Developer Console (US$5 una vez). Samsung y LG tienen Google Cast nativo
   desde 2024–2026 según modelo y firmware, así que conviene **confirmar que
   la tele aparece en la lista de "Enviar" de Chrome antes de gastar nada**.

Ni esta página ni el patio mandan `X-Frame-Options` ni CSP, así que el
receiver puede mostrarlas en un `<iframe>` — verificado antes de escribir esto.

## Contratar agentes

Modo diseño → **Contratar agente**: nombre, qué hace, repo (opcional),
palabras clave, color. Hace tres cosas: (1) `POST {OFICINA_API}/oficina/contratar`
— FiBOT lo guarda en su tabla `oficina_agentes` y desde ese momento le delega
lo que hable de sus claves (y despacha si tiene repo); si la API falla, no
se contrata; (2) lo suma a `AGENTES` y a `localStorage` (`fibot-oficina-agentes`,
`aplicarContratados` en `iniciar`) con un Open Peeps al azar (editable
después) y un escritorio en la primera celda libre de la sala activa; (3)
**Descargar agents.json** lo vuelve oficial, mismo patrón que layout y
avatares. El id es el slug del nombre y no se puede repetir.

## Carteles — pizarras que son links

Mueble `cartel` (`{tipo, x, y, titulo, url, icono}`): en vista normal un click
abre `url` en otra pestaña (`noopener`); en Modo diseño el panel de
selección muestra título / link / ícono. El ícono es un emoji opcional; si
está vacío se pide el **favicon** a `google.com/s2/favicons` (única llamada
externa del sitio en tiempo de ejecución, con fallback 🔗 si falla o está
bloqueado). Los campos usan `change` y redibujan **sólo ese objeto**
(`replaceWith(elementoDe(obj))`): un `render()` entero rehace el panel y te
saca del campo mientras escribís. Los cuatro oficiales: Railway (el
proyecto `jarvis`), Flota Cantarini, Hub FiBOT y GitHub.

## Editor de apariencia — cambiar la pinta de un agente sin pedirle a nadie

Panel del agente → **Editar apariencia**. Es Open Peeps de verdad, generado
en el navegador con **`vendor/openpeeps.js`** (bundle de DiceBear core +
`openPeeps`, MIT + CC0, ver `vendor/LICENSES.md`), que se carga **sólo al
abrir el editor** — la oficina sigue sin dependencias externas para verse.
Campos: peinado (48), cara (30), vello facial, anteojos/accesorio, máscara,
piel (5) y ropa (7), más "Al azar". Se guarda con las `opciones` elegidas
(para reabrir el editor donde quedó) y el SVG ya generado.

Persistencia, mismo patrón que el layout: lo guardado va a `localStorage`
(`fibot-oficina-avatares`) por encima de `avatares.json`
(`aplicarOverridesAvatares` en `iniciar`, y `AVATARES.oficiales` guarda la
copia original para "Volver al oficial"). Para que se vea en cualquier
dispositivo: **Descargar avatares.json** y reemplazar el del repo.

Para regenerar el bundle: `npm i @dicebear/core @dicebear/collection`, un
`entry.js` con `window.OpenPeeps = { createAvatar, openPeeps }` y
`bun build entry.js --outfile vendor/openpeeps.js --minify --format=iife --target=browser`.

## Vida en la oficina — cuerpos, cocina, tazas y el agente del mes

Pedido de Nacho: que los agentes tengan cuerpo y anden por la oficina. Es
**decorado sobre datos reales**, no una simulación con estado propio:

- **Cuerpo**: la cabeza es el Open Peeps de siempre; el cuerpo es un SVG
  propio (`cuerpoSVG`, remera del color del agente, piernas que se
  alternan con CSS mientras camina). Los peeps viven en `#capa-vida`
  (`pointer-events: none`, arriba de los muebles); cuando uno sale, su
  escritorio muestra la silla vacía.
- **Qué hacen**: si no tienen tarea (`inactivo`/`pendiente`/`hecha` o sin
  reporte) cada 20–90 s eligen una actividad de `ACTIVIDADES` según los
  muebles que haya en la sala: cafetera, heladera (snacks), dispenser,
  planta (la riegan), sofá, pizarra, y el **cuadro** — al que sólo van los
  que NO son el agente del mes, a decir "el próximo es mío". Van por BFS
  en la grilla (`camino`), sin atravesar muebles ni muros; alfombra y
  puerta son transitables. Los que están `en_curso` o `esperando_dueno`
  se quedan sentados (los `en_curso` con tres puntitos "tecleando").
- **Tarea grande** (llega un estado nuevo con tarea distinta, `en_curso`,
  y con link de despacho o detalle largo): van a la cafetera, dicen "dos
  cafés, va a ser largo" y vuelven con ☕☕ en la mano. Si estaban afuera,
  queda `cafePendiente` y lo hacen al sentarse.
- **Tazas en el escritorio** = `tareas_mes[id]` del backend (una por
  tarea pedida en el mes; hasta 5 dibujadas y después `+N`). No es un
  contador local: si se recarga, se ve lo mismo.
- **Agente del mes** = `agente_del_mes` del backend (quien más terminó el
  mes pasado; `provisional` = el que va ganando este). Se ve en el mueble
  `cuadro` (marco con su avatar) y como 🏆 en la etiqueta de su
  escritorio; el panel de FiBOT lo nombra.
- **Se apaga** en modo diseño (`montarVida` no monta la capa) y con
  `prefers-reduced-motion`. `?vida` en la URL acorta todos los tiempos —
  es para las pruebas de Playwright, no un modo de uso.

Lección: `render()` recrea todo el DOM (también en cada refresco de
estado), así que los peeps guardan su estado en `VIDA.peeps` y
`montarVida` vuelve a derivar clases y burbuja de ahí — cualquier cosa que
se ponga sólo en el elemento se pierde al minuto.

## Avatares — Open Peeps, y nada más

Un solo estilo, por decisión de Nacho (hubo un selector con Lorelei y Pixel
Art; los probó y se quedó con Open Peeps, así que el selector y esos dos sets
se sacaron — eran 40KB que nadie iba a ver). **Open Peeps** es de Pablo
Stanley, **CC0 1.0** (dominio público, sin atribución obligatoria), elegido a
propósito entre los estilos de [DiceBear](https://www.dicebear.com/) que
**son** CC0 — DiceBear tiene 61 estilos y varios (ej. Adventurer) son
CC-BY-4.0 (piden crédito visible) o de licencia más restrictiva; no vale
asumir, hay que mirar cada uno. El circulito clásico (`avatarSVG()`) queda
únicamente como **fallback** si `avatares.json` no carga o un agente nuevo
todavía no tiene avatar generado.

**Por qué está embebido en `avatares.json` y no viene de la API/librería de
DiceBear en vivo**: es la misma lógica que ya rige el resto del sitio — cero
dependencia externa en tiempo de ejecución. Se generó **una sola vez**,
localmente, con `@dicebear/core` + `@dicebear/collection` (Node) y quedó
commiteado como SVG crudo. Al sumar un agente hace falta regenerar su
avatar: `createAvatar(openPeeps, { seed: agenteId })`, sacar `<metadata>`,
sacar `width`/`height` **sólo de la etiqueta `<svg>` raíz** (ver el segundo
bug de abajo) y ponerle `class="avatar"`. No está en el repo — son 10 líneas.

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
vive en GitHub como el tracker de la rutina de prospección), el camino es el
estado vivo que reporta FiBOT (`GET /oficina/estado`, Etapa 2), no un token
acá. Mientras tanto queda `nota` a mano.

## Estado de los datos que siguen siendo a mano

`agents.json` (roster, rol, color, link) se edita a mano y está bien que
así sea: cambia cuando aparece o muere una línea de trabajo, no todos los
días. Lo que cambia todos los días (tarea, pregunta, cuándo reportó) va por
el contrato de estado vivo, y lo escribe FiBOT desde su Postgres — nunca
una Action que commitee JSON acá, que era el plan viejo.

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

**Bug real de la primera entrada (para no repetirlo)**: Nacho abrió el sitio
por `http://` y la puerta murió con "Cannot read properties of undefined
(reading 'digest')" — `crypto.subtle` **sólo existe en contexto seguro**
(https o localhost), y los tests habían corrido en localhost, que cuenta
como seguro. Dos arreglos: (1) la puerta detecta `http://` fuera de
localhost, **no manda la clave** (viajaría sin cifrar, igual que el token
después) y muestra el link `https://`; (2) `sha256Hex` cae a una
implementación en JS puro (`sha256HexJS`, verificada contra `hashlib` de
Python) si `crypto.subtle` no está — el hash no tiene por qué depender de
la API del navegador. Regla general que sale de acá: **todo test de
"funciona en el navegador" hay que correrlo también en un origen que NO
sea localhost** (en Playwright: `--host-resolver-rules` mapeando un
hostname falso a 127.0.0.1) — localhost es un contexto privilegiado y
esconde exactamente esta clase de bug. En GitHub Pages, una vez emitido el
certificado, activar **Enforce HTTPS** en Settings → Pages para que `http`
redirija solo.

## Convenciones

- **Nunca commitear directo a `main`**: rama + PR.
- Sitio estático: sin build, sin dependencias, se edita y se pushea.
- Cero credenciales acá — este repo es público y sirve una página pública.
