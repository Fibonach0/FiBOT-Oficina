import json, re, io
import os
# El script vive en proto/3d/, así que la raíz del repo son dos niveles arriba.
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..") + os.sep
ags={a["id"]:a for a in json.load(open(base+"agents.json"))["agentes"]}
AV=json.load(open(base+"avatares.json"))["avatares"]
sala=[s for s in json.load(open(base+"layout.json"))["salas"] if s["id"]=="principal"][0]

_n=[0]
def cara(aid):
    """Open Peeps recortado a la cabeza, listo para usarse como textura."""
    svg=(AV.get(aid) or {}).get("openPeeps","")
    if not svg: return ""
    _n[0]+=1; suf=f"t{_n[0]}"
    for m in set(re.findall(r'id="([^"]+)"', svg)):
        svg=svg.replace(f'id="{m}"',f'id="{m}-{suf}"').replace(f'url(#{m})',f'url(#{m}-{suf})')
    # width/height explícitos: sin eso, un SVG en data-URI no se puede usar como textura
    return re.sub(r'^<svg[^>]*>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="112 78 480 480">', svg, count=1)

caras={}
for o in sala["objetos"]:
    if o.get("agenteId") and o["agenteId"] in AV:
        caras[o["agenteId"]] = cara(o["agenteId"])

agentes={k:{"nombre":ags[k]["nombre"],"color":ags[k].get("color","#7a6f60")} for k in caras}
# estado vivo de muestra, el mismo de las capturas
VIVO={
 "prospeccion":{"estado":"en_curso","tarea":"Seguimientos de 7 días a 12 prospectos","cuando":"hace 4 min"},
 "consultorio":{"estado":"esperando_dueno","tarea":"¿Cargo los feriados como día no laborable?","cuando":"hace 52 min"},
 "personal-fibot":{"estado":"en_curso","tarea":"Payroll: recolector de costos","cuando":"hace 11 min"},
 "farmacia":{"estado":"hecha","tarea":"Alta de 40 productos nuevos","cuando":"hace 3 h"},
 "fibot":{"estado":"en_curso","tarea":"Reparte los pedidos de la oficina","cuando":"hace 2 min"},
 "casa":{"estado":"pendiente","tarea":"Escenas programadas por horario","cuando":"hace 1 día"},
}

html = io.open("plantilla.html", encoding="utf-8").read()
html = (html
  .replace("/*__SALA__*/null", json.dumps(sala, ensure_ascii=False))
  .replace("/*__AGENTES__*/null", json.dumps(agentes, ensure_ascii=False))
  .replace("/*__CARAS__*/null", json.dumps(caras, ensure_ascii=False))
  .replace("/*__VIVO__*/null", json.dumps(VIVO, ensure_ascii=False)))
io.open("index.html","w",encoding="utf-8").write(html)
print(f"index.html · {len(html)} bytes · {len(caras)} caras · {len(sala['objetos'])} objetos")
