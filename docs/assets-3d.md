# Assets 3D con licencia libre — dónde buscar y qué mirar

Notas para cuando haya que sumar modelos al [prototipo 3D](../proto/3d/) o
llevar el patio de la flota a 3D. **La licencia se verifica ANTES de bajar
nada**: ver en `CLAUDE.md` el episodio del tileset de Munder Difflin, que es
código MIT usando un asset pago de terceros.

## Lo que hoy usa la oficina: nada externo

- **Muebles del isométrico**: SVG propio (`DECO_SVG`).
- **Texturas del prototipo 3D**: dibujadas en un canvas en tiempo de ejecución.
- **Avatares**: Open Peeps de Pablo Stanley, **CC0**, pre-generados en
  `avatares.json`.

O sea que hoy no hay ninguna dependencia de assets de terceros, y conviene que
siga siendo así salvo que un pack aporte mucho.

## Fuentes CC0 verificadas

| Fuente | Qué tiene | Licencia | Alcanzable desde una sesión de Claude Code |
|---|---|---|---|
| [KayKit](https://github.com/KayKit-Game-Assets) (Kay Lousberg) | City Builder Bits, Furniture Bits, Space Base Bits, Character Animations, Dungeon, Prototype Bits. OBJ + FBX + glTF | **CC0**, uso comercial, sin atribución | **Sí** — están en GitHub, `raw.githubusercontent.com` responde |
| [Quaternius](https://quaternius.com/) | Cars Bundle (7 modelos), packs de vehículos y props | **CC0** | No — el dominio está bloqueado por el proxy del sandbox. Bajar desde una máquina normal |
| [Kenney](https://kenney.nl/assets) | Kits de vehículos y props | **CC0** | No — dominio bloqueado |
| [poly.pizza](https://poly.pizza/) | Espejo de Quaternius y otros | según el modelo | No — dominio bloqueado |
| [madjin/awesome-cc0](https://github.com/madjin/awesome-cc0) | Índice de fuentes CC0 | — | Sí |

**Kay Lousberg es el que usa Bot Crossing** y es el más práctico para nosotros:
está en GitHub, así que se puede traer desde una sesión sin salir a buscar a
mano.

## Para el patio de la flota (camiones)

El patio vive en `fleet-bot-pastor` (`patio.py`) y hoy es una vista de estado,
no una escena. Si alguna vez se lleva a 3D:

1. **KayKit City Builder Bits** — 32+ modelos de ciudad en glTF, CC0. Está en
   GitHub, así que es el primero para revisar. **Pendiente de verificar** si
   incluye camiones o sólo autos y edificios: el README no itemiza los modelos.
2. **Quaternius Cars Bundle** — CC0, incluye vehículos de carga. Hay que bajarlo
   desde una máquina con salida a internet libre.

Al sumar cualquiera de estos: guardar el archivo de licencia junto a los
modelos, y anotar acá de dónde salió cada uno.

## Lo que NO se hace

- Copiar assets de otro proyecto porque su **código** sea MIT. El código y los
  assets tienen licencias distintas, casi siempre.
- Bajar texturas fotográficas para el estilo de juguete de la oficina: rompen la
  escala y se ven peor que una veta dibujada.
