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
agents.json  el roster — nombre, rol, color, estado, nota, link
CNAME        oficina.fibot.ar
```

Cada escritorio es un SVG dibujado a mano (`avatarSVG()` en `index.html`) —
nada de assets externos, cero riesgo de licencia. El estado (`activo` /
`pausa` / `bloqueado`) es el punto de color en el monitor; la nota corta es
lo primero que se lee, el panel de detalle (click) trae la descripción larga
y el link al repo.

## Estado de los datos: a mano, a propósito (por ahora)

`agents.json` se edita a mano. Conectar datos en vivo es el próximo paso
lógico, pero **no puede ser un fetch directo del browser a la API de GitHub
para los repos privados** (Personal-FiBOT, jarvis) porque expondría un token
en una página pública. Caminos reales para cuando se quiera automatizar:

- Repos **públicos** (FiBOT-Consultorio, hoy) sí se pueden leer en vivo desde
  el browser sin token (API pública de GitHub, sin auth, con rate limit).
- Para repos privados o para datos que no viven en GitHub (la rutina de
  prospección hoy guarda su tracker en un scratchpad de sesión, ni siquiera
  en un repo), hace falta algo que escriba un `agents.json` actualizado desde
  el lado de atrás (una GitHub Action programada, o un endpoint chico) — no
  algo que este sitio estático pueda hacer solo.

## Convenciones

- **Nunca commitear directo a `main`**: rama + PR.
- Sitio estático: sin build, sin dependencias, se edita y se pushea.
- Cero credenciales acá — este repo es público y sirve una página pública.
