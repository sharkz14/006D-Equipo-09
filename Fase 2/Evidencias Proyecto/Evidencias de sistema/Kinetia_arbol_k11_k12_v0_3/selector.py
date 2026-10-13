"""Inferencia portable en Python estandar; no entrena ni modifica la app."""
import argparse
from base import (BASE, CAMPOS, CATEGORIAS, CONTEXTO, EJERCICIOS, cargar_datos,
                  canonico, exigir, leer, validar_contexto, validar_entradas)

def leer_modelo(ruta, modelo_id="K11_K12_v0.3"):
    modelo = leer(ruta)
    exigir(modelo.get("modelo_id") == modelo_id, "Identificador de modelo distinto del solicitado.")
    exigir(modelo.get("formato") == "kinetia_arbol_categorico_0.1", "Formato no reconocido.")
    validar_contexto(modelo.get("contexto"))
    exigir(modelo.get("campos") == CAMPOS and modelo.get("categorias") == CATEGORIAS,
           "Esquema del modelo distinto al contrato.")
    return modelo

def trazar(modelo, entradas, contexto):
    validar_contexto(contexto)
    validar_entradas(entradas)
    exigir(canonico(modelo["contexto"]) == canonico(contexto), "Contexto distinto del modelo.")
    exigir(modelo["modelo_id"] in ["K11_K12_v0.1", "K11_K12_v0.2", "K11_K12_v0.3"],
           "Identificador de modelo incorrecto.")
    exigir(modelo["campos"] == CAMPOS and modelo["categorias"] == CATEGORIAS,
           "Esquema de modelo alterado.")
    vector = [float(entradas[c] == cat) for c, cats in zip(CAMPOS, CATEGORIAS) for cat in cats]
    idx = 0
    ruta = []
    for _ in range(len(modelo["nodos"])):
        exigir(type(idx) is int and 0 <= idx < len(modelo["nodos"]), "Rama no valida.")
        nodo = modelo["nodos"][idx]
        if "clase" in nodo:
            exigir(nodo["clase"] in EJERCICIOS, "Clase desconocida.")
            return {"seleccion":nodo["clase"], "hoja":idx, "profundidad":len(ruta), "ruta":ruta}
        variable = nodo["variable"]
        exigir(type(variable) is int and 0 <= variable < len(vector), "Variable no valida.")
        izquierda = vector[variable] <= nodo["umbral"]
        ruta.append({"nodo":idx, "variable":modelo["columnas_codificadas"][variable],
                     "valor":vector[variable], "umbral":nodo["umbral"],
                     "rama":"izquierda" if izquierda else "derecha"})
        idx = nodo["izquierda"] if izquierda else nodo["derecha"]
    raise ValueError("El arbol contiene un ciclo o no termina.")

def predecir(modelo, entradas, contexto):
    return trazar(modelo, entradas, contexto)["seleccion"]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--caso", default="DB03", choices=[f"DB{i:02}" for i in range(1, 12)])
    args = parser.parse_args()
    datos = cargar_datos()
    caso = next(c for c in datos["casos"] if c["caso_id"] == args.caso)
    modelo = leer_modelo(BASE / "modelo_congelado/arbol.json")
    resultado = predecir(modelo, caso["entradas"], CONTEXTO)
    print(args.caso + ": seleccion del arbol = " + resultado)
    if caso["revision"]["preferencia"] == "EMPATE":
        print("DB11 es control descriptivo excluido del ajuste: este clasificador no aprende indiferencia.")
    print("Ejemplo de desarrollo. No genera ni habilita una sesion de ejercicio.")

if __name__ == "__main__":
    main()

