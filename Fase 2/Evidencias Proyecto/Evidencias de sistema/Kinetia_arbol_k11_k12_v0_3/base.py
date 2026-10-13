"""Contrato del experimento K11/K12. No sustituye filtros de la app."""
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
CAMPOS = ["experiencia_k12", "control_k12", "historia_core", "antiguedad_k12"]
CATEGORIAS = [
    ["nunca", "practico", "desconocida"],
    ["controlado", "dificultad_control", "desconocido", "no_aplica"],
    ["habitual_actual", "sin_practica_habitual", "interrumpida_mas_de_12_meses", "desconocida"],
    ["un_mes", "mas_de_12_meses", "desconocida", "no_aplica"],
]
CONTEXTO = {
    "familia": "dead_bug", "cupo": "control_anterior", "nivel": "I",
    "equipo": "PC", "duracion_referencial_min": 20,
    "filtro_superado": True, "exclusiones": [], "candidatos_compatibles": ["K11", "K12"],
    "fichas_version": "0.1", "modo": "experimento_borrador",
    "dosis": {
        "K11": {"series": 2, "repeticiones_por_lado": 6, "descanso_series_s": 60},
        "K12": {"series": 2, "repeticiones_por_lado": 5, "descanso_series_s": 60},
    },
}
EJERCICIOS = ["K11", "K12"]
SOURCE_SHA = "0c6ca37b91ad283b1d7892bf5a0eee3aba924fd1c261e287b7ea0051fe73d491"

def exigir(condicion, mensaje):
    if not condicion:
        raise ValueError(mensaje)

def sha(ruta):
    return hashlib.sha256(Path(ruta).read_bytes()).hexdigest()

def canonico(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, allow_nan=False, separators=(",", ":"))

def guardar(ruta, obj):
    ruta = Path(ruta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with ruta.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write("\n")

def leer(ruta):
    return json.loads(Path(ruta).read_text(encoding="utf-8-sig"))

def validar_contexto(contexto):
    exigir(canonico(contexto) == canonico(CONTEXTO),
           "Contexto fuera del experimento K11/K12. No seleccionar con este modelo.")

def validar_entradas(entrada):
    exigir(isinstance(entrada, dict) and set(entrada) == set(CAMPOS),
           "Se requieren exactamente los cuatro antecedentes del esquema.")
    for campo, cats in zip(CAMPOS, CATEGORIAS):
        exigir(isinstance(entrada[campo], str) and entrada[campo] in cats,
               "Valor ausente o no contemplado: " + campo)
    exp, control, core, fecha = [entrada[c] for c in CAMPOS]
    exigir(not (core == "interrumpida_mas_de_12_meses" and fecha == "un_mes"),
           "K12 hace un mes contradice haber dejado todo el core hace mas de un anio.")
    if exp == "nunca":
        exigir(control == "no_aplica" and fecha == "no_aplica",
               "Nunca K12 exige control y antiguedad no_aplica.")
    elif exp == "desconocida":
        exigir(control == "desconocido" and fecha == "desconocida",
               "Experiencia desconocida no admite inventar control o fecha.")
    else:
        exigir(control != "no_aplica" and fecha != "no_aplica",
               "Practico K12: control o fecha pueden ser desconocidos, no no_aplica.")

def verificar_fuentes():
    protocolo = leer(BASE / "protocolo.json")
    huellas = protocolo.get("sha256_fuentes", {})
    requeridas = ["fuentes/respuestas_DB09_DB11.json", "fuentes/respuestas_DB09_DB11.txt",
                  "fuentes/arbol_k11_k12_v0_1.json", "fuentes/arbol_k11_k12_v0_2.json",
                  "fuentes/congelacion_k11_k12_v0_2.json", "fuentes/protocolo_v0_2.json",
                  "datos/desarrollo_k11_k12.json"]
    exigir(all(n in huellas for n in requeridas), "Faltan huellas de fuentes en protocolo.json.")
    for nombre, huella in huellas.items():
        exigir(sha(BASE / nombre) == huella, "Cambio en fuente fijada: " + nombre)
    anterior = leer(BASE / "fuentes/congelacion_k11_k12_v0_1.json")
    exigir(sha(BASE / "fuentes/arbol_k11_k12_v0_1.json") == anterior["sha256_arbol"],
           "El arbol anterior no coincide con su congelacion.")
    congelacion_v02 = leer(BASE / "fuentes/congelacion_k11_k12_v0_2.json")
    exigir(sha(BASE / "fuentes/arbol_k11_k12_v0_2.json") == congelacion_v02["sha256_arbol"],
           "El baseline v0.2 no coincide con su congelacion.")
    exigir(sha(BASE / "datos/desarrollo_k11_k12.json")
           == congelacion_v02["sha256_archivos"]["datos/desarrollo_k11_k12.json"],
           "Los datos deben conservar los mismos bytes de v0.2.")
    exigir(sha(BASE / "fuentes/protocolo_v0_2.json")
           == congelacion_v02["sha256_archivos"]["protocolo.json"],
           "El protocolo anterior fue alterado.")
    return protocolo

def validar_datos(datos):
    exigir(datos["version"] == "0.2", "Version del conjunto distinta de 0.2.")
    exigir(datos["uso"] == "desarrollo", "Este lote no es desarrollo.")
    validar_contexto(datos["contexto"])
    exigir(datos["fuente"]["sha256"] == SOURCE_SHA, "Huella de fuente distinta.")
    casos = datos["casos"]
    exigir([c["caso_id"] for c in casos] == [f"DB{i:02}" for i in range(1, 12)],
           "Orden, cantidad o identificadores distintos del experimento.")
    firmas = set()
    for c in casos:
        exigir(c["grupo_id"] == "G03" and c["caso_origen"] == "C04", "Grupo u origen cambiado.")
        validar_entradas(c["entradas"])
        firma = canonico(c["entradas"])
        exigir(firma not in firmas, "Entradas duplicadas: " + c["caso_id"])
        firmas.add(firma)
        rev = c["revision"]
        exigir(isinstance(rev["aceptables"], list) and rev["aceptables"]
               and all(e in EJERCICIOS for e in rev["aceptables"])
               and len(set(rev["aceptables"])) == len(rev["aceptables"]),
               "Aceptabilidad sin resolver.")
        exigir(isinstance(rev["motivo"], str) and rev["motivo"].strip(), "Falta motivo.")
        if c["caso_id"] == "DB11":
            exigir(rev["preferencia"] == "EMPATE" and set(rev["aceptables"]) == set(EJERCICIOS)
                   and rev["firmeza"] == "NO_APLICA", "DB11 conserva empate entre ambas, sin firmeza.")
        else:
            exigir(rev["preferencia"] in EJERCICIOS, "DB01-DB10 requieren preferencia concreta.")
            exigir(rev["preferencia"] in rev["aceptables"], "Preferencia no aceptada.")
            exigir(rev["firmeza"] in ["SUAVE", "FIRME"], "Falta firmeza.")
    return datos

def cargar_datos():
    verificar_fuentes()
    exigir(sha(BASE / "fuentes/revision_completada.xlsx") == SOURCE_SHA,
           "Cambio en la fuente original. Crear una nueva version del experimento.")
    return validar_datos(leer(BASE / "datos/desarrollo_k11_k12.json"))

def separar_ajuste(casos):
    ajuste = [c for c in casos if c["revision"]["preferencia"] in EJERCICIOS]
    controles = [c for c in casos if c["revision"]["preferencia"] == "EMPATE"]
    exigir([c["caso_id"] for c in ajuste] == [f"DB{i:02}" for i in range(1, 11)],
           "El ajuste conserva solo DB01-DB10.")
    exigir([c["caso_id"] for c in controles] == ["DB11"], "El control de empate es DB11.")
    return ajuste, controles

def regla_comparacion(entrada):
    """Regla post hoc deducida de las opiniones; no es evidencia independiente."""
    validar_entradas(entrada)
    if entrada["control_k12"] == "dificultad_control":
        return "K11"
    if entrada["historia_core"] == "interrumpida_mas_de_12_meses":
        return "K11"
    if entrada["experiencia_k12"] == "nunca" and entrada["historia_core"] == "sin_practica_habitual":
        return "K11"
    return "K12"

