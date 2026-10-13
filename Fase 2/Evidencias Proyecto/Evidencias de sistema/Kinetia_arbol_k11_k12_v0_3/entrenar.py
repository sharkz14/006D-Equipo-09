"""Revision dirigida K11/K12 v0.3: profundidad 4 con los datos de v0.2 intactos."""
import argparse
from collections import Counter
from datetime import datetime, timezone
from importlib.metadata import version
from itertools import product
from pathlib import Path
import platform
import sys

from base import (BASE, CAMPOS, CATEGORIAS, CONTEXTO, cargar_datos, canonico,
                  exigir, guardar, leer, regla_comparacion, sha, validar_entradas,
                  separar_ajuste, verificar_fuentes, EJERCICIOS)
from selector import predecir, leer_modelo, trazar

# Un unico candidato nuevo. Solo max_depth cambia respecto del baseline v0.2.
PARAMETROS = dict(criterion="gini", splitter="best", max_depth=4,
                 min_samples_split=2, min_samples_leaf=1,
                 random_state=42, class_weight=None, ccp_alpha=0.0)
VERSIONES = {"scikit-learn":"1.7.2", "numpy":"2.2.6", "scipy":"1.15.3",
             "joblib":"1.5.2", "threadpoolctl":"3.6.0",
             "openpyxl":"3.1.5", "et-xmlfile":"2.0.0"}

def matriz(casos):
    # Solo cuatro antecedentes. No entran etiquetas, motivos, firmeza o IDs.
    return [[c["entradas"][campo] for campo in CAMPOS] for c in casos]

def exportar(pipeline):
    enc, clf = pipeline.named_steps["categorias"], pipeline.named_steps["arbol"]
    tree = clf.tree_
    nodos = []
    for i in range(tree.node_count):
        if tree.children_left[i] == tree.children_right[i]:
            nodos.append({"clase":str(clf.classes_[tree.value[i][0].argmax()]),
                          "filas_entrenamiento":int(tree.n_node_samples[i])})
        else:
            nodos.append({"variable":int(tree.feature[i]), "umbral":float(tree.threshold[i]),
                          "izquierda":int(tree.children_left[i]), "derecha":int(tree.children_right[i])})
    return {"formato":"kinetia_arbol_categorico_0.1", "modelo_id":"K11_K12_v0.3",
            "contexto":CONTEXTO, "campos":CAMPOS, "categorias":[a.tolist() for a in enc.categories_],
            "columnas_codificadas":enc.get_feature_names_out(CAMPOS).tolist(),
            "clases":clf.classes_.tolist(), "parametros":clf.get_params(),
            "profundidad_aprendida":int(clf.get_depth()), "nodos":nodos}

def probar_exportacion(pipeline, modelo, anterior, casos):
    entradas = []
    for valores in product(*CATEGORIAS):
        e = dict(zip(CAMPOS, valores))
        try:
            validar_entradas(e)
        except ValueError:
            continue
        entradas.append(e)
    original = pipeline.predict([[e[c] for c in CAMPOS] for e in entradas]).tolist()
    exportado = [predecir(modelo,e,CONTEXTO) for e in entradas]
    exigir(original == exportado, "La exportacion no reproduce scikit-learn.")
    diferencias_regla = [
        {"entradas":e, "arbol":p, "regla":regla_comparacion(e)}
        for e,p in zip(entradas,exportado) if p != regla_comparacion(e)
    ]
    cambios_baseline = [
        {"entradas":e, "arbol_v0_2":predecir(anterior,e,CONTEXTO), "arbol_v0_3":p}
        for e,p in zip(entradas,exportado) if p != predecir(anterior,e,CONTEXTO)
    ]
    registradas = {canonico(c["entradas"]) for c in casos}
    presentes = sum(canonico(e) in registradas for e in entradas)
    return {"combinaciones_validas":len(entradas), "equivalencia_exportacion":True,
            "combinaciones_presentes_en_registros":presentes,
            "combinaciones_fuera_de_registros":len(entradas)-presentes, "etiquetas_nuevas":0,
            "diferencias_arbol_regla":diferencias_regla,
            "cambios_frente_baseline_v0_2":cambios_baseline,
            "significado":"Prueba informatica del dominio: incluye entradas ya registradas y otras sin revision. No crea etiquetas ni observaciones, no es evaluacion de generalizacion."}

def comparar(casos, anterior, modelo=None):
    referencia = leer(BASE / "fuentes/referencia_motor.json")
    exigir(referencia["seleccion_dead_bug"] == "K12", "Referencia del motor alterada.")
    filas = []
    for c in casos:
        r = c["revision"]
        preds = {"motor_actual":referencia["seleccion_dead_bug"],
                 "regla_post_hoc_v0_1":regla_comparacion(c["entradas"]),
                 "arbol_v0_2":predecir(anterior,c["entradas"],CONTEXTO)}
        if modelo is not None:
            preds["arbol_v0_3"] = predecir(modelo,c["entradas"],CONTEXTO)
        filas.append({"caso_id":c["caso_id"], "grupo_id":c["grupo_id"],
                      "preferencia":r["preferencia"], "aceptables":r["aceptables"],
                      "firmeza":r["firmeza"],
                      "sistemas":{k:{"seleccion":v,
                                     "coincide_preferencia":(v==r["preferencia"] if r["preferencia"] in EJERCICIOS else None),
                                     "opcion_aceptada":v in r["aceptables"]} for k,v in preds.items()}})
    resumen = {k:{
        "preferencia_aciertos":sum(f["sistemas"][k]["coincide_preferencia"] is True for f in filas),
        "preferencia_total":sum(f["sistemas"][k]["coincide_preferencia"] is not None for f in filas),
        "aceptabilidad_aciertos":sum(f["sistemas"][k]["opcion_aceptada"] for f in filas),
        "aceptabilidad_total":len(filas)} for k in filas[0]["sistemas"]}
    return {"resumen":resumen,"por_caso":filas}

def validar_cambio_parametros(anterior, candidato):
    exigir(set(anterior) == set(candidato), "Diferencia en el conjunto de parametros.")
    cambios = {k:{"antes":anterior[k], "despues":candidato[k]}
               for k in anterior if anterior[k] != candidato[k]}
    exigir(cambios == {"max_depth":{"antes":3,"despues":4}},
           "Este experimento solo permite cambiar max_depth de 3 a 4.")
    return cambios

def diagnosticar_rama(modelo, ajuste):
    """Cuenta etiquetas conocidas que alcanzan cada hoja; no calcula confianza."""
    trazas = {c["caso_id"]:trazar(modelo,c["entradas"],CONTEXTO) for c in ajuste}
    hojas = {}
    for c in ajuste:
        hoja = str(trazas[c["caso_id"]]["hoja"])
        if hoja not in hojas:
            hojas[hoja] = {"casos":[], "conteos_clase":{"K11":0,"K12":0}}
        hojas[hoja]["casos"].append(c["caso_id"])
        hojas[hoja]["conteos_clase"][c["revision"]["preferencia"]] += 1
    por_id = {c["caso_id"]:c for c in ajuste}
    diferencias = {campo:{"DB02":por_id["DB02"]["entradas"][campo],
                           "DB03":por_id["DB03"]["entradas"][campo]}
                   for campo in CAMPOS if por_id["DB02"]["entradas"][campo] != por_id["DB03"]["entradas"][campo]}
    return {"modelo_id":modelo["modelo_id"],
            "trazas_DB02_DB03":{cid:trazas[cid] for cid in ["DB02","DB03"]},
            "misma_hoja":trazas["DB02"]["hoja"] == trazas["DB03"]["hoja"],
            "antecedentes_que_ya_difieren":diferencias, "hojas_con_datos_de_fit":hojas,
            "significado":"Conteos del desarrollo que alcanza cada hoja. No son probabilidades calibradas ni evaluacion independiente."}

def decidir_candidato(comparacion, pruebas):
    por_id = {f["caso_id"]:f for f in comparacion["por_caso"]}
    regresiones = [f["caso_id"] for f in comparacion["por_caso"]
                   if f["sistemas"]["arbol_v0_2"]["coincide_preferencia"] is True
                   and f["sistemas"]["arbol_v0_3"]["coincide_preferencia"] is not True]
    aceptabilidad_perdida = [f["caso_id"] for f in comparacion["por_caso"]
                            if f["sistemas"]["arbol_v0_2"]["opcion_aceptada"]
                            and not f["sistemas"]["arbol_v0_3"]["opcion_aceptada"]]
    condiciones = {
        "DB02_coincide":por_id["DB02"]["sistemas"]["arbol_v0_3"]["coincide_preferencia"] is True,
        "DB03_coincide":por_id["DB03"]["sistemas"]["arbol_v0_3"]["coincide_preferencia"] is True,
        "ninguna_preferencia_antes_correcta_empeora":not regresiones,
        "aceptabilidad_no_desciende":not aceptabilidad_perdida,
        "contrato_y_exportacion_correctos":pruebas["equivalencia_exportacion"] and pruebas["combinaciones_validas"] == 41,
    }
    cumple = all(condiciones.values())
    return {"condiciones":condiciones, "regresiones":regresiones,
            "perdidas_aceptabilidad":aceptabilidad_perdida,
            "v0_3_candidato_para_evaluacion":cumple,
            "referencia_seleccionada": "K11_K12_v0.3" if cumple else "K11_K12_v0.2",
            "alcance":"Decision sobre desarrollo con criterio prefijado; no demuestra generalizacion. No se prueban otras configuraciones."}

def reglas_legibles(modelo):
    reglas = []
    def recorrer(i, condiciones):
        nodo = modelo["nodos"][i]
        if "clase" in nodo:
            reglas.append("Si " + " y ".join(condiciones or ["siempre"]) + ": " + nodo["clase"] + ".")
            return
        nombre = modelo["columnas_codificadas"][nodo["variable"]]
        recorrer(nodo["izquierda"],condiciones+[nombre+" = NO"])
        recorrer(nodo["derecha"],condiciones+[nombre+" = SI"])
    recorrer(0,[])
    return "\n".join(reglas)+"\n"

def entrenar(salida):
    for paquete,esperada in VERSIONES.items():
        exigir(version(paquete)==esperada, paquete+": instalar la version de requirements.txt.")
    from preparar_datos import extraer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder
    from sklearn.tree import DecisionTreeClassifier
    protocolo = verificar_fuentes()
    exigir(protocolo["version"] == "0.3" and protocolo["parametros"] == PARAMETROS,
           "Los parametros deben coincidir con el protocolo v0.3 fijado.")
    exigir(protocolo["numero_fits_nuevos_previstos"] == 1
           and protocolo["otras_configuraciones_prohibidas_en_este_experimento"] is True,
           "El protocolo debe limitarse a un unico ajuste nuevo.")
    datos = cargar_datos()
    exigir(canonico(datos)==canonico(extraer()), "El JSON no coincide con el Excel y las respuestas de chat fijadas.")
    casos = datos["casos"]
    ajuste, controles = separar_ajuste(casos)
    anterior = leer_modelo(BASE / "fuentes/arbol_k11_k12_v0_2.json", "K11_K12_v0.2")
    sha_anterior = sha(BASE / "fuentes/arbol_k11_k12_v0_2.json")
    diagnostico_previo = diagnosticar_rama(anterior, ajuste)
    exigir(diagnostico_previo["misma_hoja"]
           and all(t["hoja"] == 4 and t["profundidad"] == 3
                   for t in diagnostico_previo["trazas_DB02_DB03"].values())
           and diagnostico_previo["hojas_con_datos_de_fit"]["4"]["conteos_clase"] == {"K11":1,"K12":1},
           "El baseline no reproduce el diagnostico previo de DB02 y DB03.")
    exigir(set(diagnostico_previo["antecedentes_que_ya_difieren"]) == {"historia_core"},
           "Los datos no conservan la distincion de core ya disponible.")
    # Diagnostico del baseline congelado antes de fit. Los datos de desarrollo
    # son exactamente los mismos; no se entrena nuevamente profundidad 3.
    contraste = {
        "fecha_utc":datetime.now(timezone.utc).isoformat(),
        "tipo":"diagnostico_previo_rama_v0_2_sin_ajuste",
        "evaluacion_independiente":False,
        "modelo_v0_2_sha256":sha_anterior,
        "nota":"Se revisa una rama usando el mismo desarrollo adaptativo G03; no es reserva.",
        "diagnostico_rama":diagnostico_previo,
        **comparar(casos, anterior),
    }
    salida.mkdir(parents=True,exist_ok=True)
    guardar(salida/"diagnostico_v0_2_antes_ajuste.json", contraste)
    pipeline = Pipeline([
        ("categorias",OneHotEncoder(categories=CATEGORIAS,sparse_output=False,handle_unknown="error")),
        ("arbol",DecisionTreeClassifier(**PARAMETROS)),
    ])
    cambios_parametros = validar_cambio_parametros(anterior["parametros"],
                                                   pipeline.named_steps["arbol"].get_params())
    inicio = datetime.now(timezone.utc).isoformat()
    pipeline.fit(matriz(ajuste),[c["revision"]["preferencia"] for c in ajuste])
    modelo = exportar(pipeline)
    pruebas = probar_exportacion(pipeline,modelo,anterior,casos)
    comparacion = comparar(casos,anterior,modelo)
    seleccion = decidir_candidato(comparacion,pruebas)
    diagnostico_nuevo = diagnosticar_rama(modelo,ajuste)
    reporte = {
        "fecha_utc":inicio, "tipo":"revision_dirigida_de_capacidad_sobre_desarrollo",
        "version_modelo":"0.3", "version_datos":"0.2",
        "numero_fits_nuevos":1, "baseline_reentrenado":False,
        "cambios_parametros":cambios_parametros,
        "evaluacion_independiente_realizada":False,
        "filas":len(casos), "filas_usadas_para_fit":len(ajuste),
        "controles_empate":[c["caso_id"] for c in controles],
        "filas_excluidas_de_fit":[{"caso_id":c["caso_id"],"motivo":"EMPATE: sin objetivo binario unico"} for c in controles],
        "grupos":dict(Counter(c["grupo_id"] for c in casos)),
        "clases_fit":dict(Counter(c["revision"]["preferencia"] for c in ajuste)),
        "firmeza":dict(Counter(c["revision"]["firmeza"] for c in casos)),
        "variables_en_ramas":sorted({modelo["columnas_codificadas"][n["variable"]]
                                    for n in modelo["nodos"] if "variable" in n}),
        **comparacion, "pruebas_software":pruebas,
        "contraste_previo":contraste,
        "diagnostico_rama_nueva":diagnostico_nuevo,
        "seleccion_segun_protocolo":seleccion,
        "limites":[
            "Once casos hipoteticos del grupo G03. No son observaciones independientes.",
            "Diez preferencias unicas entran en fit. DB11 EMPATE permanece como control descriptivo.",
            "DB11 no entra en el denominador de coincidencia con preferencia unica; si en aceptabilidad.",
            "Este clasificador binario no aprende ni emite empates. No se duplicaron filas ni usaron pesos 0.5.",
            "DB09-DB11 fueron elegidos tras revisar discrepancias v0.1: son desarrollo adaptativo, no holdout.",
            "La profundidad 4 se eligio tras observar un desacuerdo de v0.2 en este desarrollo; no es seleccion independiente.",
            "Solo se comparo el baseline congelado de profundidad 3 con un ajuste nuevo de profundidad 4.",
            "Se preservan byte por byte los datos y las fuentes de v0.2. No hay nuevas etiquetas ni predictores.",
            "Las trazas y conteos de hojas describen los datos de fit; no son confianza calibrada.",
            "No se hizo split ni validacion cruzada dentro de G03. Ninguna reserva utilizada.",
            "Resultados sobre entrenamiento: no estiman rendimiento en usuarios o escenarios nuevos.",
            "La regla fue deducida de las mismas revisiones; es una referencia post hoc.",
            "Todos admiten ambas opciones: aceptabilidad no discrimina los metodos en este lote.",
            "Firmeza no se usa como peso, predictor ni probabilidad.",
            "Antiguedad es candidata; su uso o ausencia en ramas no demuestra importancia general.",
            "Un mes es un caso concreto, no un umbral universal de reciente.",
            "Revisor identificado genericamente. Identidad y credenciales no verificadas.",
            "No valida dosis, tecnica, seguridad ni mejora fisica; fichas siguen en borrador."
        ],
    }
    exigir(sha(BASE / "fuentes/arbol_k11_k12_v0_2.json") == sha_anterior,
           "El modelo anterior cambio durante el ajuste.")
    guardar(salida/"arbol.json",modelo)
    guardar(salida/"reporte_desarrollo.json",reporte)
    guardar(salida/"trazas_rama_antes_despues.json",{
        "antes":diagnostico_previo, "despues":diagnostico_nuevo,
        "nota":"Sin nuevas observaciones, sin entrenamiento adicional, sin probabilidades calibradas."})
    with (salida/"reglas_aprendidas.txt").open("w",encoding="utf-8",newline="\n") as f:
        f.write(reglas_legibles(modelo))
    nombres = ["base.py","selector.py","preparar_datos.py","entrenar.py","requirements.txt",
               "datos/desarrollo_k11_k12.json","fuentes/revision_completada.xlsx",
               "fuentes/generador_referencia.cjs","fuentes/referencia_motor.json",
               "fuentes/fichas_k11_k12_v0_1.md","protocolo.json","pruebas/test_contrato.py"]
    nombres += ["fuentes/respuestas_DB09_DB11.json","fuentes/respuestas_DB09_DB11.txt",
                "fuentes/arbol_k11_k12_v0_1.json","fuentes/congelacion_k11_k12_v0_1.json",
                "fuentes/arbol_k11_k12_v0_2.json","fuentes/congelacion_k11_k12_v0_2.json",
                "fuentes/protocolo_v0_2.json"]
    guardar(salida/"congelacion.json",{
        "fecha_utc":inicio, "estado":"candidato_v0_3_fijado_sin_evaluacion_independiente",
        "reserva_utilizada":False, "python":platform.python_version(),
        "plataforma":platform.system(), "versiones":VERSIONES,
        "parametros":PARAMETROS, "orden_casos_fit":[c["caso_id"] for c in ajuste],
        "controles_sin_fit":[c["caso_id"] for c in controles],
        "sha256_modelo_v0_2":sha_anterior,
        "candidato_seleccionado_para_evaluacion":seleccion["referencia_seleccionada"],
        "sha256_archivos":{n:sha(BASE/n) for n in nombres},
        "sha256_arbol":sha(salida/"arbol.json"),
        "siguiente_paso":"Revisar generalizacion con nuevos grupos; no reutilizar G03 como evaluacion."
    })
    print("Kinetia: arbol K11/K12 v0.3 entrenado; solo max_depth cambia de 3 a 4")
    print("Desarrollo: 11 casos G03; fit: 10; empate sin fit: DB11. Evaluacion independiente: pendiente.")
    for k,m in reporte["resumen"].items():
        print(f"{k}: preferencia {m['preferencia_aciertos']}/{m['preferencia_total']}; aceptabilidad {m['aceptabilidad_aciertos']}/{m['aceptabilidad_total']}")
    print("DB11 no participa en coincidencia de preferencia; este clasificador no aprende indiferencia.")
    print("Candidato para evaluacion segun criterio previo: " + seleccion["referencia_seleccionada"])
    print("Estos resultados describen el entrenamiento; no prueban generalizacion.")
    ref = BASE/"modelo_congelado/arbol.json"
    if ref.exists() and ref.resolve()!=(salida/"arbol.json").resolve():
        igual = canonico(leer(ref))==canonico(modelo)
        print("Reproduccion del arbol entregado: "+("IGUAL" if igual else "DISTINTO"))
        exigir(igual,"El modelo local no reproduce el entregado.")
    return reporte

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--salida",type=Path,default=BASE/"resultados_locales")
    parser.add_argument("--verificar",action="store_true",
                        help="Compara resultados_locales con modelo_congelado sin entrenar.")
    args = parser.parse_args()
    exigir(args.salida.resolve()!=(BASE/"modelo_congelado").resolve(),
           "Conserva modelo_congelado. Utiliza otra carpeta.")
    if args.verificar:
        igual=canonico(leer(BASE/"modelo_congelado/arbol.json"))==canonico(leer(args.salida/"arbol.json"))
        print("Reproduccion del arbol entregado: "+("IGUAL" if igual else "DISTINTO"))
        return 0 if igual else 1
    entrenar(args.salida)
    return 0

if __name__=="__main__":
    try:
        sys.exit(main())
    except (ValueError,OSError,ImportError,KeyError) as e:
        print("Error: "+str(e),file=sys.stderr)
        sys.exit(1)

