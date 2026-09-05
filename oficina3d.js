// oficina3d.js — la oficina en 3D real (three.js), como vista de la oficina.
//
// Reemplaza SÓLO el dibujo: lo que antes hacía isoRender() lo hace esto sobre
// un canvas WebGL. Todo lo demás sigue siendo de index.html — el layout, las
// salas, la puerta, el estado vivo, el panel de detalle y, sobre todo, la VIDA:
// quién se levanta, adónde va (BFS), cuánto se queda y qué dice lo decide
// tickVida() allá, y acá cada cuadro se lee VIDA.peeps y se dibuja donde está
// cada uno. Un solo simulador, dos vistas.
//
// Se carga con import() sólo cuando la vista 3D está activa: la oficina
// isométrica y el modo diseño siguen sin dependencias.
//
// Convención del escritorio: la MISMA que en isométrico — la silla del lado de
// la cámara y el monitor detrás de la persona. La cabeza es un cartel que
// siempre mira a la cámara, así que se le ve la cara igual; y la regla de la
// vida ("del escritorio se sale por adelante o por los costados") vale para
// las dos vistas sin tocar el BFS.
import * as THREE from "three";
import { OrbitControls } from "./vendor/three/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "./vendor/three/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./vendor/three/jsm/environments/RoomEnvironment.js";

export function hayWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch (e) { return false; }
}

// Las paletas son las de DiceBear openPeeps: piel es una lista cerrada, así que
// se reconoce por valor (para cuello, manos y brazos).
const PALETA_PIEL = ["#694d3d", "#ae5d29", "#d08b5b", "#edb98a", "#ffdbb4"];
function pielDe(svg) {
  const fills = [...(svg || "").matchAll(/fill="(#[0-9a-f]{3,6})"/gi)].map((m) => m[1].toLowerCase());
  return fills.find((c) => PALETA_PIEL.includes(c)) || "#edb98a";
}

// El avatar recortado a la cabeza, con los ids internos renombrados (DiceBear
// repite `viewboxMask` en todos) y un recorte elíptico: algunos peinados (la
// melena larga) ocupan medio lienzo y salían como un bloque detrás de la cara.
let nCaras = 0;
function cara(svg) {
  if (!svg) return "";
  const suf = "c" + (++nCaras);
  for (const id of new Set([...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))) {
    svg = svg.split(`id="${id}"`).join(`id="${id}-${suf}"`).split(`url(#${id})`).join(`url(#${id}-${suf})`);
  }
  if (!/viewBox="0 0 704 704"/.test(svg)) {
    // No es un Open Peeps (el circulito de fallback): se usa entero.
    return svg.replace(/^<svg[^>]*>/, (m) => m.replace(/\s(width|height)="[^"]*"/g, "").replace("<svg", '<svg width="512" height="512"'));
  }
  return svg
    .replace(/^<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="100 62 504 504"><defs><clipPath id="corte-${suf}"><ellipse cx="352" cy="318" rx="218" ry="252"/></clipPath></defs><g clip-path="url(#corte-${suf})">`)
    .replace(/<\/svg>\s*$/, "</g></svg>");
}

const HORAS = {
  dia:   { sol: 2.7, solCol: "#ffe2b8", cielo: .22, punto: 0,   niebla: "#12100d", ent: .17, fondo: ["#1b1611", "#090807"], cara: "#ffffff" },
  tarde: { sol: 2.0, solCol: "#ffb173", cielo: .17, punto: .45, niebla: "#181009", ent: .13, fondo: ["#241708", "#0c0806"], cara: "#f3dcc4" },
  noche: { sol: .28, solCol: "#7f97c9", cielo: .09, punto: 1.5, niebla: "#080b12", ent: .07, fondo: ["#0c111b", "#050609"], cara: "#9aa3b8" },
};
function horaDelDia(forzada) {
  if (forzada && HORAS[forzada]) return forzada;
  const h = new Date().getHours();
  return h >= 7 && h < 17 ? "dia" : (h >= 17 && h < 20 ? "tarde" : "noche");
}

// `api` es lo que index.html le presta: getters del estado de la oficina y
// callbacks de click. Nada de lo de acá escribe en el estado de la oficina.
export function montarVista3D({ tablero, api }) {
  const CALIDAD = api.calidad ?? (api.tv ? 1 : 0);
  const mat = (c, r = .85, m = 0) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: r, metalness: m });

  // ---------- lienzo y capas ----------
  const canvas = document.createElement("canvas");
  canvas.className = "lienzo-3d";
  const capaPlacas = document.createElement("div");
  capaPlacas.className = "iso-nombres placas-3d";

  const escena = new THREE.Scene();
  function fondoDegrade(arriba, abajo) {
    const c = document.createElement("canvas"); c.width = 2; c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, arriba); g.addColorStop(1, abajo);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  for (const h of Object.values(HORAS)) h.tex = h.tex || fondoDegrade(h.fondo[0], h.fondo[1]);
  escena.fog = new THREE.Fog("#0f0d0b", 16, 40);
  const camara = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200);
  const render = new THREE.WebGLRenderer({ canvas, antialias: CALIDAD < 2, powerPreference: "high-performance" });
  render.setPixelRatio(CALIDAD === 0 ? Math.min(devicePixelRatio, 2) : 1);
  render.shadowMap.enabled = CALIDAD < 2;
  render.shadowMap.type = CALIDAD === 0 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  render.toneMapping = THREE.ACESFilmicToneMapping;
  render.toneMappingExposure = .92;
  const pmrem = new THREE.PMREMGenerator(render);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = .17;

  const control = new OrbitControls(camara, canvas);
  control.enableDamping = true;
  control.maxPolarAngle = Math.PI / 2.15;
  control.minDistance = 4; control.maxDistance = 40;
  if (api.tv) { control.autoRotate = true; control.autoRotateSpeed = .35; control.enabled = false; }

  const sol = new THREE.DirectionalLight("#ffe2b8", 2.7);
  sol.position.set(8, 13, 7); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 3;
  sol.shadow.bias = -0.0006; sol.shadow.normalBias = .02;
  escena.add(sol);
  const cielo = new THREE.HemisphereLight("#c9dcff", "#8a7350", .22); escena.add(cielo);
  const contra = new THREE.DirectionalLight("#9fb8e8", .5); contra.position.set(-8, 6, -9); escena.add(contra);
  const relleno = new THREE.PointLight("#ffcf8a", 0, 11, 1.6); relleno.position.set(.5, 2.9, .5); escena.add(relleno);
  { // se arranca directamente en la hora actual: la transición es para cuando cambia, no para el primer cuadro
    const h = HORAS[horaDelDia(api.hora)];
    sol.intensity = h.sol; sol.color.set(h.solCol); cielo.intensity = h.cielo; relleno.intensity = h.punto;
    escena.environmentIntensity = h.ent; escena.fog.color.set(h.niebla); escena.background = h.tex;
  }

  // ---------- texturas (dibujadas, no bajadas) ----------
  function lienzo(n, pintar) {
    const c = document.createElement("canvas"); c.width = c.height = n; pintar(c.getContext("2d"), n);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  }
  const pintarMadera = (claro, oscuro) => (ctx, n) => {
    ctx.fillStyle = claro; ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 190; i++) {
      const y = Math.random() * n, alto = .6 + Math.random() * 2.6;
      ctx.globalAlpha = .05 + Math.random() * .22; ctx.fillStyle = oscuro; ctx.beginPath();
      for (let x = 0; x <= n; x += 8) { const yy = y + Math.sin((x / n) * Math.PI * (1 + Math.random() * .3)) * 3; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.lineTo(n, y + alto); ctx.lineTo(0, y + alto); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const pintarTela = (base, hilo) => (ctx, n) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n); ctx.strokeStyle = hilo; ctx.lineWidth = 1; ctx.globalAlpha = .25;
    for (let i = 0; i < n; i += 3) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, n); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i + 1.5); ctx.lineTo(n, i + 1.5); ctx.stroke(); }
    ctx.globalAlpha = .1;
    for (let i = 0; i < n * n * .06; i++) { ctx.fillStyle = Math.random() < .5 ? "#000" : "#fff"; ctx.fillRect(Math.random() * n, Math.random() * n, 1, 1); }
    ctx.globalAlpha = 1;
  };
  const pintarYeso = (base) => (ctx, n) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < n * n * .12; i++) { ctx.fillStyle = Math.random() < .5 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.06)"; ctx.fillRect(Math.random() * n, Math.random() * n, 1.5, 1.5); }
  };
  const pintarPiso = (ctx, n) => {
    pintarMadera("#d9c8a6", "#a8905f")(ctx, n); ctx.strokeStyle = "rgba(90,68,38,.35)"; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { const y = (i / 4) * n; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(n, y); ctx.stroke(); }
  };
  const conRelieve = (m, tex, escala = .35) => { m.map = tex; m.bumpMap = tex; m.bumpScale = escala; return m; };
  const TEX = {
    madera: lienzo(256, pintarMadera("#c99460", "#8a5c2e")), maderaOsc: lienzo(256, pintarMadera("#a3703f", "#6b451f")),
    tela: lienzo(256, pintarTela("#dfe9e2", "#9db3a6")), telaSofa: lienzo(256, pintarTela("#9585b8", "#6d5f8e")),
    yeso: lienzo(256, pintarYeso("#e4dbcb")), piso: lienzo(512, pintarPiso),
  };
  TEX.yeso.repeat.set(5, 2); TEX.tela.repeat.set(2, 2);
  const MAT = {
    piso: conRelieve(mat("#d9c8a6", .92), TEX.piso, .25),
    muro: conRelieve(mat("#e4dbcb", .95), TEX.yeso, .12),
    tabique: conRelieve(mat("#d7e5db", .95), TEX.tela, .5),
    madera: conRelieve(mat("#bc9268", .72), TEX.madera, .3),
    maderaOsc: conRelieve(mat("#94663d", .7), TEX.maderaOsc, .3),
    pantalla: mat("#262c34", .35), gris: mat("#d6d3cd", .8), grisOsc: mat("#948a7d", .85),
    verde: mat("#63a878", .85), maceta: mat("#c07a4e", .8),
    sofa: conRelieve(mat("#8d81a6", .95), TEX.telaSofa, .45),
    metal: mat("#e6ebee", .3, .35), agua: mat("#a8d8e6", .15),
    vidrio: new THREE.MeshStandardMaterial({ color: "#c8e4ea", roughness: .08, metalness: .1, transparent: true, opacity: .5 }),
    pizarra: mat("#2c3a33", .55), alfombra: conRelieve(mat("#b7a6c6", .98), TEX.telaSofa, .3), poste: mat("#94762f", .75),
    zocalo: mat("#d8cdb8", .9), papel: mat("#f6f1e6", .9),
  };
  const TEX_SOMBRA = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128; const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(38,26,12,.58)"); g.addColorStop(.5, "rgba(38,26,12,.24)"); g.addColorStop(1, "rgba(40,28,14,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  function sombraContacto(r) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r, r), new THREE.MeshBasicMaterial({ map: TEX_SOMBRA, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = .006; m.renderOrder = -1; return m;
  }
  // Un cartel con su título dibujado: la textura se genera por cartel.
  function texturaCartel(titulo, icono) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 160; const ctx = c.getContext("2d");
    ctx.fillStyle = "#f6f1e6"; ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = "#6e4429"; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 246, 150);
    ctx.fillStyle = "#2b2b33"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 34px system-ui, sans-serif";
    const palabras = String(titulo || "Cartel").split(/\s+/); const lineas = []; let l = "";
    for (const p of palabras) { const t = l ? l + " " + p : p; if (ctx.measureText(t).width > 210 && l) { lineas.push(l); l = p; } else l = t; }
    if (l) lineas.push(l);
    const y0 = 80 - (lineas.length - 1) * 20 + (icono ? 12 : 0);
    if (icono) { ctx.font = "40px system-ui, sans-serif"; ctx.fillText(icono, 128, 40); ctx.font = "700 30px system-ui, sans-serif"; }
    lineas.slice(0, 3).forEach((t, i) => ctx.fillText(t, 128, y0 + i * 40));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // ---------- la sala ----------
  const mundo = new THREE.Group(); escena.add(mundo);
  let sala = null, cols = 10, rows = 7, firma = "";
  const enPiso = (gx, gy) => [gx - cols / 2 + .5, gy - rows / 2 + .5];
  let personas = {};     // agenteId → { g, piernas, brazos, cabezaMat, asiento: Vector3, obj }
  let carteles = [];     // materiales de cabezas, para el tinte por hora
  let placas = {};       // agenteId | objId → { el, obj, persona? }
  const disposables = [];
  function caja(w, h, p, m, x, y, z, rot = 0, padre = mundo) {
    const r = Math.min(.035, Math.min(w, h, p) * .28);
    const geo = new RoundedBoxGeometry(w, h, p, 2, r); disposables.push(geo);
    const g = new THREE.Mesh(geo, m);
    g.position.set(x, y + h / 2, z); g.rotation.y = rot; g.castShadow = true; g.receiveShadow = true;
    padre.add(g); return g;
  }
  const PIEZAS = {
    pared: (x, z, o) => caja(...(((o.rot || 0) % 180 === 90) ? [.94, .62, .1] : [.1, .62, .94]), MAT.tabique, x, 0, z),
    muro: (x, z) => caja(.98, .9, .98, MAT.muro, x, 0, z),
    puerta: (x, z) => { caja(.1, .62, .2, MAT.tabique, x, 0, z - .38); caja(.1, .62, .2, MAT.tabique, x, 0, z + .38); },
    // Silla del lado de la cámara (+z) y monitor detrás, igual que en isométrico.
    escritorio: (x, z, o) => {
      const col = colorDe(o.agenteId);
      caja(1, .06, .52, MAT.madera, x, .44, z - .16);
      for (const [dx, dz] of [[-.45, .04], [.45, .04], [-.45, -.36], [.45, -.36]]) caja(.06, .44, .06, MAT.maderaOsc, x + dx, 0, z + dz);
      caja(.36, .26, .03, MAT.pantalla, x + .2, .5, z - .3);
      caja(.14, .03, .1, MAT.pantalla, x + .2, .47, z - .26);
      caja(.44, .06, .44, mat(col), x, .34, z + .32);
      caja(.44, .34, .06, mat(col), x, .4, z + .52);
      for (let i = 0; i < 4; i++) caja(.05, .4, .05, MAT.grisOsc, x + (i % 2 ? .17 : -.17), 0, z + (i < 2 ? .15 : .49));
    },
    isla: (x, z, o) => {
      const geo = new THREE.CylinderGeometry(.42, .42, .06, 24); disposables.push(geo);
      const tapa = new THREE.Mesh(geo, MAT.madera); tapa.position.set(x, .47, z); tapa.castShadow = tapa.receiveShadow = true; mundo.add(tapa);
      caja(.1, .44, .1, MAT.maderaOsc, x, 0, z);
      [[0, -.62], [.62, 0], [0, .62], [-.62, 0]].forEach(([dx, dz], i) => {
        const col = colorDe((o.asientos || [])[i]) || "#9a9082";
        caja(.4, .06, .4, mat(col), x + dx, .3, z + dz);
      });
    },
    planta: (x, z) => {
      const g1 = new THREE.CylinderGeometry(.2, .16, .26, 8); disposables.push(g1);
      const p = new THREE.Mesh(g1, MAT.maceta); p.position.set(x, .13, z); p.castShadow = true; mundo.add(p);
      for (const [dx, dy, dz, r] of [[0, .42, 0, .24], [-.16, .3, .06, .17], [.15, .32, -.05, .16]]) {
        const g2 = new THREE.IcosahedronGeometry(r, 0); disposables.push(g2);
        const h = new THREE.Mesh(g2, MAT.verde); h.position.set(x + dx, dy, z + dz); h.castShadow = true; mundo.add(h);
      }
    },
    estanteria: (x, z) => { caja(.9, 1.3, .34, MAT.madera, x, 0, z - .2); caja(.82, .03, .3, MAT.maderaOsc, x, .5, z - .2); caja(.82, .03, .3, MAT.maderaOsc, x, .9, z - .2); },
    sofa: (x, z) => { caja(1.05, .32, .6, MAT.sofa, x, 0, z + .06); caja(1.05, .34, .16, MAT.sofa, x, .32, z - .27); },
    cafetera: (x, z) => { caja(.4, .58, .4, MAT.gris, x, 0, z); caja(.32, .08, .32, MAT.pantalla, x, .58, z); },
    heladera: (x, z) => { caja(.56, 1.24, .5, MAT.metal, x, 0, z); caja(.04, .3, .04, MAT.grisOsc, x + .2, .55, z + .27); },
    dispenser: (x, z) => { caja(.34, .6, .34, MAT.metal, x, 0, z); const g = new THREE.CylinderGeometry(.15, .15, .4, 10); disposables.push(g);
      const b = new THREE.Mesh(g, MAT.agua); b.position.set(x, .82, z); b.castShadow = true; mundo.add(b); },
    impresora: (x, z) => { caja(.6, .3, .46, MAT.gris, x, 0, z); caja(.46, .02, .3, MAT.muro, x, .3, z + .04); },
    archivero: (x, z) => { caja(.6, .8, .46, MAT.grisOsc, x, 0, z); },
    pizarra: (x, z) => { caja(.9, .6, .06, MAT.pizarra, x, .5, z - .3); caja(.06, .5, .06, MAT.poste, x, 0, z - .3); },
    alfombra: (x, z) => { const g = new THREE.PlaneGeometry(1, 1); disposables.push(g); const a = new THREE.Mesh(g, MAT.alfombra);
      a.rotation.x = -Math.PI / 2; a.position.set(x, .004, z); a.receiveShadow = true; mundo.add(a); },
    cartel: (x, z, o) => {
      caja(.07, .8, .07, MAT.poste, x, 0, z);
      const t = texturaCartel(o.titulo, o.icono); disposables.push(t);
      const m = new THREE.MeshStandardMaterial({ map: t, roughness: .9 }); disposables.push(m);
      const tabla = caja(.72, .44, .05, m, x, .8, z);
      tabla.userData = { tipo: "cartel", obj: o };
    },
    cuadro: (x, z, o) => {
      caja(.07, .8, .07, MAT.poste, x, 0, z);
      const marco = caja(.5, .56, .05, MAT.poste, x, .78, z);
      marco.userData = { tipo: "cuadro", obj: o };
      const adm = api.agenteDelMes();
      const ag = adm && agenteDe(adm.id);
      const svg = ag && api.avatar(ag.id);
      if (svg) {
        const sp = cabezaCartel(svg, .46);
        sp.position.set(x, .82, z + .04); mundo.add(sp);
      } else {
        caja(.4, .44, .02, MAT.papel, x, .84, z + .03);
      }
    },
    reloj: (x, z) => { const g = new THREE.CylinderGeometry(.16, .16, .04, 14); disposables.push(g); const r = new THREE.Mesh(g, MAT.muro);
      r.rotation.x = Math.PI / 2; r.position.set(x, 1.3, z); mundo.add(r); },
    ventana: (x, z) => caja(.9, .7, .06, MAT.vidrio, x, .8, z),
  };
  const SIN_SOMBRA = new Set(["alfombra", "reloj", "ventana", "muro"]);

  function agenteDe(id) { return id ? (api.agentes() || []).find((a) => a.id === id) : null; }
  function colorDe(id) { const a = agenteDe(id); return (a && a.color) || null; }

  // ---------- la gente ----------
  const cargador = new THREE.TextureLoader();
  function cabezaCartel(svg, tam = .7) {
    const g = new THREE.Group();
    const tex = cargador.load("data:image/svg+xml;charset=utf-8," + encodeURIComponent(cara(svg)));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; disposables.push(tex);
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: .35, depthWrite: true }); disposables.push(m);
    const cartel = new THREE.Sprite(m);
    cartel.center.set(.5, .08); cartel.scale.set(tam, tam, 1);
    g.add(cartel);
    const R = .2 * tam / .7;
    const geo = new THREE.SphereGeometry(R, 16, 12); disposables.push(geo);
    const sombra = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    sombra.castShadow = true; sombra.position.y = R * 1.1; g.add(sombra);
    carteles.push(m);
    return g;
  }
  function brazo(colorRemera, piel, lado) {
    const hombro = new THREE.Group();
    const g1 = new THREE.CapsuleGeometry(.045, .12, 3, 8), g2 = new THREE.CapsuleGeometry(.04, .11, 3, 8), g3 = new THREE.SphereGeometry(.05, 12, 10);
    disposables.push(g1, g2, g3);
    const sup = new THREE.Mesh(g1, mat(colorRemera, .9)); sup.position.y = -.09; sup.castShadow = true; hombro.add(sup);
    const codo = new THREE.Group(); codo.position.y = -.18;
    const inf = new THREE.Mesh(g2, mat(piel, .85)); inf.position.y = -.08; inf.castShadow = true; codo.add(inf);
    const mano = new THREE.Mesh(g3, mat(piel, .85)); mano.position.y = -.16; mano.scale.set(1, .85, 1.1); codo.add(mano);
    hombro.add(codo);
    hombro.position.set(lado * .175, .6, 0); hombro.rotation.z = lado * .12;
    return { hombro, codo };
  }
  function persona(agente) {
    const svg = api.avatar(agente.id) || "";
    const piel = pielDe(svg), color = agente.color || "#7a6f60";
    const g = new THREE.Group();
    const gc = new THREE.CapsuleGeometry(.17, .2, 5, 16); disposables.push(gc);
    const cuerpo = new THREE.Mesh(gc, mat(color, .9)); cuerpo.position.y = .46; cuerpo.scale.set(1, 1, .9); cuerpo.castShadow = true; g.add(cuerpo);
    const gn = new THREE.CylinderGeometry(.075, .085, .07, 12); disposables.push(gn);
    const cuello = new THREE.Mesh(gn, mat(piel, .85)); cuello.position.y = .68; g.add(cuello);
    const brazos = [-1, 1].map((lado) => { const b = brazo(color, piel, lado); g.add(b.hombro); return b; });
    const piernas = [-1, 1].map((s) => { const p = caja(.1, .3, .1, MAT.grisOsc, 0, 0, 0, 0, g); p.position.set(s * .09, .15, 0); return p; });
    const cabeza = cabezaCartel(svg); cabeza.position.y = .705; g.add(cabeza);
    g.add(sombraContacto(.8));
    g.userData = { tipo: "agente", id: agente.id };
    mundo.add(g);
    return { g, brazos, piernas, rumbo: 0, rumboObjetivo: 0, t: Math.random() * 10, vis: new THREE.Vector3() };
  }
  const poseSentado = (p) => p.brazos.forEach((b) => { b.hombro.rotation.x = -1.15; b.codo.rotation.x = .55; b.hombro.rotation.z = 0; });
  const poseParado = (p) => { p.brazos.forEach((b) => { b.hombro.rotation.x = -.35; b.codo.rotation.x = .9; }); p.piernas.forEach((pi) => { pi.rotation.x = 0; }); };

  function limpiarSala() {
    for (const el of Object.values(placas)) el.el.remove();
    placas = {}; personas = {}; carteles = [];
    mundo.clear();
    for (const d of disposables) { try { d.dispose && d.dispose(); } catch (e) { /* ya liberado */ } }
    disposables.length = 0;
  }
  function firmaDe(s) {
    const ids = new Set(); s.objetos.forEach((o) => { if (o.agenteId) ids.add(o.agenteId); (o.asientos || []).forEach((a) => a && ids.add(a)); });
    const adm = api.agenteDelMes();
    return JSON.stringify([s.id, s.grid, s.objetos.map((o) => [o.id, o.tipo, o.x, o.y, o.rot || 0, o.agenteId || null, (o.asientos || []).join(), o.titulo || "", o.icono || ""]),
      [...ids].map((id) => { const a = agenteDe(id), sv = api.avatar(id) || ""; return [id, a && a.color, sv.length, sv.slice(-40)]; }), adm && adm.id]);
  }
  function construirSala(s) {
    limpiarSala();
    sala = s; cols = s.grid.cols; rows = s.grid.rows;
    // piso, muros (fondo e izquierda), zócalo y ventanas
    const gp = new THREE.PlaneGeometry(cols, rows); disposables.push(gp);
    const piso = new THREE.Mesh(gp, MAT.piso); piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; mundo.add(piso);
    TEX.piso.repeat.set(rows / 2.2, cols / 1.1); TEX.piso.rotation = Math.PI / 2; TEX.piso.center.set(.5, .5);
    caja(cols, 1.9, .12, MAT.muro, 0, 0, -rows / 2 - .06);
    caja(.12, 1.9, rows, MAT.muro, -cols / 2 - .06, 0, 0);
    caja(cols, .1, .05, MAT.zocalo, 0, 0, -rows / 2 + .02);
    caja(.05, .1, rows, MAT.zocalo, -cols / 2 + .02, 0, 0);
    const nVent = Math.max(1, Math.floor(cols / 3.4));
    for (let i = 0; i < nVent; i++) {
      const k = -cols / 2 + (i + .5) * (cols / nVent);
      caja(2.24, .94, .05, MAT.muro, k, .73, -rows / 2 - .02); caja(2.06, .76, .04, MAT.vidrio, k, .82, -rows / 2 - .04); caja(.05, .76, .05, MAT.muro, k, .82, -rows / 2 - .06);
    }
    for (const o of s.objetos) {
      const [x, z] = enPiso(o.x, o.y);
      (PIEZAS[o.tipo] || PIEZAS.archivero)(x, z, o);
      if (!SIN_SOMBRA.has(o.tipo)) { const sc = sombraContacto(o.tipo === "escritorio" ? 1.7 : 1.15); sc.position.set(x, .006, z); mundo.add(sc); }
      if (o.tipo === "escritorio" && o.agenteId) {
        const ag = agenteDe(o.agenteId);
        if (ag && !personas[ag.id]) {
          const p = persona(ag); p.obj = o; p.asiento = new THREE.Vector3(x, 0, z + .3);
          p.g.position.copy(p.asiento); p.vis.copy(p.asiento); poseSentado(p);
          personas[ag.id] = p;
        }
      }
      if (o.tipo === "isla") {
        [[0, -.62, Math.PI], [.62, 0, -Math.PI / 2], [0, .62, 0], [-.62, 0, Math.PI / 2]].forEach(([dx, dz, rot], i) => {
          const ag = agenteDe((o.asientos || [])[i]);
          if (!ag) return;
          const p = persona(ag); p.fijo = true;
          p.g.position.set(x + dx * .78, 0, z + dz * .78); p.g.rotation.y = rot; p.g.scale.set(.85, .85, .85); poseSentado(p);
          p.g.userData = { tipo: "isla", obj: o };
        });
      }
    }
    // cámara encuadrada a la sala
    const k = Math.max(cols / 10, rows / 7, .6);
    camara.position.set(8.4 * k, 7.6 * k, 9.2 * k);
    control.target.set(0, .7, .4 * k); control.update();
    const d = Math.max(cols, rows) * .9;
    Object.assign(sol.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: 44 });
    sol.shadow.camera.updateProjectionMatrix();
    armarPlacas();
  }
  // Las placas son las mismas de la vista isométrica (las arma index.html):
  // acá sólo se las proyecta sobre la cabeza de cada uno.
  function armarPlacas() {
    for (const el of Object.values(placas)) el.el.remove();
    placas = {};
    if (!sala) return;
    for (const o of sala.objetos) {
      if (!((o.tipo === "escritorio" && o.agenteId) || o.tipo === "isla")) continue;
      const el = api.etiqueta(o);
      if (!el) continue;
      const act = document.createElement("div"); act.className = "pl-act";
      (el.querySelector(".placa") || el).appendChild(act);
      capaPlacas.appendChild(el);
      const [x, z] = enPiso(o.x, o.y);
      placas[o.tipo === "isla" ? o.id : o.agenteId] = { el, act, obj: o, fijo: new THREE.Vector3(x, o.tipo === "isla" ? 1.3 : 1.55, z) };
    }
  }

  // ---------- cuadro a cuadro ----------
  const v3 = new THREE.Vector3(), dir = new THREE.Vector3();
  let ultimo = performance.now(), ancho = 1, alto = 1, vivo = true, raf = 0;
  function proyectar(v, el) {
    v3.copy(v).project(camara);
    const visible = v3.z < 1 && Math.abs(v3.x) < 1.3 && Math.abs(v3.y) < 1.3;
    el.style.display = visible ? "" : "none";
    if (visible) el.style.transform = `translate(${((v3.x * .5 + .5) * ancho).toFixed(1)}px, ${((-v3.y * .5 + .5) * alto).toFixed(1)}px)`;
  }
  function textoActividad(p) {
    if (!p) return "";
    const ahora = performance.now();
    if (p.modo === "actividad" && p.burbuja && p.burbuja.hasta > ahora) return p.burbuja.texto;
    if (p.motivo === "cafe-doble" && (p.modo === "volviendo" || p.modo === "yendo")) return "☕☕";
    if (p.modo === "yendo" && p.act) return `${p.act.icono} ${p.act.texto}`;
    return "";
  }
  function paso(dt) {
    const peeps = api.peeps() || {};
    for (const [id, p] of Object.entries(personas)) {
      if (p.fijo) continue;
      const v = peeps[id];
      p.t += dt;
      const sentado = !v || v.modo === "sentado";
      if (sentado) {
        p.vis.copy(p.asiento); p.rumboObjetivo = 0;
        if (!p.estabaSentado) { poseSentado(p); p.piernas.forEach((pi) => { pi.rotation.x = 0; }); }
        p.estabaSentado = true;
      } else {
        // La posición es EXACTAMENTE la del simulador (ya viene interpolada por
        // la grilla, celda a celda): perseguirla con un tope de velocidad se
        // probó y cortaba las esquinas por adentro de los muebles cuando el
        // simulador iba más rápido que el tope. Lo único que se agrega es el
        // corrimiento de la silla, que se desvanece al salir de la celda del
        // escritorio, así levantarse no es un salto.
        const [x, z] = enPiso(v.x, v.y);
        const enSuCelda = v.desk ? Math.max(0, 1 - 2 * Math.hypot(v.x - v.desk.x, v.y - v.desk.y)) : 0;
        dir.set(x - p.vis.x, 0, z + .3 * enSuCelda - p.vis.z);
        const dist = dir.length();
        p.vis.set(x, 0, z + .3 * enSuCelda);
        const camina = v.modo === "yendo" || v.modo === "volviendo";
        if (camina && dist > .002) {
          p.rumboObjetivo = Math.atan2(dir.x, dir.z);
          const sw = Math.sin(p.t * 7);
          p.piernas[0].rotation.x = sw * .6; p.piernas[1].rotation.x = -sw * .6;
          p.brazos[0].hombro.rotation.x = -sw * .5; p.brazos[1].hombro.rotation.x = sw * .5;
          p.brazos.forEach((b) => { b.codo.rotation.x = .25; b.hombro.rotation.z = 0; });
          p.vis.y = Math.abs(sw) * .03;
        } else {
          p.vis.y = 0;
          if (v.modo === "actividad" && v.act && v.act.obj) { const [ox, oz] = enPiso(v.act.obj.x, v.act.obj.y); p.rumboObjetivo = Math.atan2(ox - p.vis.x, oz - p.vis.z); }
          poseParado(p);
        }
        p.estabaSentado = false;
      }
      p.g.position.copy(p.vis);
      let d = p.rumboObjetivo - p.rumbo; d = Math.atan2(Math.sin(d), Math.cos(d));
      p.rumbo += d * Math.min(1, dt * 9); p.g.rotation.y = p.rumbo;
    }
    // placas: sobre la cabeza del que corresponde, esté sentado o caminando
    for (const [clave, pl] of Object.entries(placas)) {
      const p = personas[clave];
      if (p) { v3.copy(p.g.position); v3.y += 1.5; proyectar(v3, pl.el); pl.act.textContent = textoActividad(peeps[clave]); }
      else proyectar(pl.fijo, pl.el);
    }
    // luz según la hora
    const hora = HORAS[horaDelDia(api.hora)];
    const k = Math.min(1, dt * 3);
    if (escena.background !== hora.tex) escena.background = hora.tex;
    sol.intensity += (hora.sol - sol.intensity) * k; sol.color.lerp(new THREE.Color(hora.solCol), k);
    cielo.intensity += (hora.cielo - cielo.intensity) * k; relleno.intensity += (hora.punto - relleno.intensity) * k;
    escena.environmentIntensity += (hora.ent - escena.environmentIntensity) * k;
    escena.fog.color.lerp(new THREE.Color(hora.niebla), k);
    const tinte = new THREE.Color(hora.cara); for (const m of carteles) m.color.lerp(tinte, k);
  }
  function bucle(ts) {
    raf = 0;
    if (!vivo) return;
    if (canvas.isConnected && ancho > 1 && alto > 1) {
      const dt = Math.min(.05, (ts - ultimo) / 1000);
      paso(dt); control.update(); render.render(escena, camara);
    }
    ultimo = ts;
    raf = requestAnimationFrame(bucle);
  }

  // ---------- tamaño ----------
  function redimensionar() {
    const w = tablero.clientWidth, h = tablero.clientHeight;
    if (!(w > 0 && h > 0) || (w === ancho && h === alto)) return;
    ancho = w; alto = h;
    render.setSize(w, h, false);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    camara.aspect = w / h; camara.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(redimensionar); ro.observe(tablero);

  // ---------- clicks: raycast, sin confundirlo con un arrastre de cámara ----------
  const ray = new THREE.Raycaster(); const punt = new THREE.Vector2();
  let bajada = null;
  function objetivoEn(ev) {
    const r = canvas.getBoundingClientRect();
    punt.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(punt, camara);
    for (const hit of ray.intersectObjects(mundo.children, true)) {
      let o = hit.object;
      while (o && o !== mundo) { if (o.userData && o.userData.tipo) return o.userData; o = o.parent; }
    }
    return null;
  }
  canvas.addEventListener("pointerdown", (e) => { bajada = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", (e) => {
    if (!bajada) return;
    const movio = Math.hypot(e.clientX - bajada[0], e.clientY - bajada[1]) > 6; bajada = null;
    if (movio) return;
    const u = objetivoEn(e);
    if (!u) return;
    if (u.tipo === "agente") { const a = agenteDe(u.id); a && api.onAgente(a); }
    else if (u.tipo === "isla") api.onIsla(u.obj);
    else if (u.tipo === "cartel") api.onCartel(u.obj);
    else if (u.tipo === "cuadro") { const adm = api.agenteDelMes(); const a = adm && agenteDe(adm.id); a && api.onAgente(a); }
  });
  let ultimoHover = 0;
  canvas.addEventListener("pointermove", (e) => {
    const t = performance.now(); if (t - ultimoHover < 120) return; ultimoHover = t;
    const u = objetivoEn(e);
    canvas.style.cursor = u && (u.tipo !== "cuadro" || api.agenteDelMes()) && (u.tipo !== "cartel" || u.obj.url) ? "pointer" : "";
  });

  // ---------- API hacia index.html ----------
  const vista = {
    canvas, capaPlacas,
    // Después de cada render() de la oficina: si la sala cambió se reconstruye,
    // si no, sólo se refrescan las placas (estado nuevo, hora, etc).
    sincronizar() {
      if (!canvas.isConnected) { tablero.replaceChildren(canvas, capaPlacas); ancho = alto = 1; }
      redimensionar();
      const s = api.sala();
      const f = firmaDe(s);
      if (f !== firma) { firma = f; construirSala(s); } else armarPlacas();
      if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(bucle); }
    },
    destruir() {
      vivo = false; if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); limpiarSala(); control.dispose(); render.dispose(); pmrem.dispose();
      canvas.remove(); capaPlacas.remove();
    },
    get dbg() { return { escena, camara, control, render, personas, placas, mundo, paso, proyectarAgente: (id) => { const p = personas[id]; if (!p) return null; v3.copy(p.g.position); v3.y += .9; v3.project(camara); const r = canvas.getBoundingClientRect(); return [r.left + (v3.x * .5 + .5) * r.width, r.top + (-v3.y * .5 + .5) * r.height]; } }; },
  };
  return vista;
}
