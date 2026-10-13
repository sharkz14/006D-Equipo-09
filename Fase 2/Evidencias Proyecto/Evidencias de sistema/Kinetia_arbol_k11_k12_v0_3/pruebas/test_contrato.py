"""Verificaciones del contrato, la transcripcion y el tratamiento del empate."""
import copy
from itertools import product
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from base import (BASE, CAMPOS, CATEGORIAS, CONTEXTO, cargar_datos, canonico,
                  separar_ajuste, validar_datos, validar_entradas, validar_contexto, leer, sha)
from preparar_datos import extraer
from selector import leer_modelo
from entrenar import matriz, comparar, PARAMETROS, validar_cambio_parametros, diagnosticar_rama


class Contrato(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.datos = cargar_datos()
        cls.anterior = leer_modelo(BASE / "fuentes/arbol_k11_k12_v0_2.json", "K11_K12_v0.2")

    def test_fuentes_reconstruyen_exactamente_los_datos(self):
        self.assertEqual(canonico(extraer()), canonico(self.datos))
        self.assertIsNone(self.datos["fuente_chat"]["fecha_revision_declarada"])
        anterior = leer(BASE / "fuentes/congelacion_k11_k12_v0_2.json")
        self.assertEqual(sha(BASE / "datos/desarrollo_k11_k12.json"),
                         anterior["sha256_archivos"]["datos/desarrollo_k11_k12.json"])
        self.assertEqual(self.datos["version"], "0.2")

    def test_unico_cambio_permitido_es_profundidad_tres_a_cuatro(self):
        antes = self.anterior["parametros"]
        nuevos = dict(antes, **PARAMETROS)
        self.assertEqual(validar_cambio_parametros(antes,nuevos),
                         {"max_depth":{"antes":3,"despues":4}})
        for clave, valor in [("random_state",43), ("max_depth",5), ("class_weight","balanced")]:
            with self.assertRaises(ValueError):
                validar_cambio_parametros(antes,dict(nuevos,**{clave:valor}))

    def test_diagnostico_baseline_recupera_diferencia_ya_presente(self):
        ajuste,_ = separar_ajuste(self.datos["casos"])
        diagnostico = diagnosticar_rama(self.anterior,ajuste)
        self.assertTrue(diagnostico["misma_hoja"])
        for traza in diagnostico["trazas_DB02_DB03"].values():
            self.assertEqual((traza["hoja"],traza["profundidad"]),(4,3))
        self.assertEqual(diagnostico["hojas_con_datos_de_fit"]["4"]["conteos_clase"], {"K11":1,"K12":1})
        self.assertEqual(set(diagnostico["antecedentes_que_ya_difieren"]), {"historia_core"})

    def test_empate_no_entra_en_ajuste_y_no_se_duplica(self):
        ajuste, controles = separar_ajuste(self.datos["casos"])
        self.assertEqual([c["caso_id"] for c in ajuste], [f"DB{i:02}" for i in range(1, 11)])
        self.assertEqual([c["caso_id"] for c in controles], ["DB11"])
        self.assertEqual(len(matriz(ajuste)), 10)
        self.assertTrue(all(len(fila) == 4 for fila in matriz(ajuste)))
        self.assertEqual({c["revision"]["preferencia"] for c in ajuste}, {"K11", "K12"})

    def test_empate_fuera_de_coincidencia_dentro_de_aceptabilidad(self):
        reporte = comparar(self.datos["casos"], self.anterior)
        empate = reporte["por_caso"][-1]
        for nombre, metricas in reporte["resumen"].items():
            self.assertEqual(metricas["preferencia_total"], 10)
            self.assertEqual(metricas["aceptabilidad_total"], 11)
            self.assertIsNone(empate["sistemas"][nombre]["coincide_preferencia"])
            self.assertTrue(empate["sistemas"][nombre]["opcion_aceptada"])

    def test_empate_necesita_ambas_aceptadas_y_no_aplica(self):
        for campo, valor in [("aceptables", ["K11"]), ("firmeza", "SUAVE"), ("preferencia", "K12")]:
            alterado = copy.deepcopy(self.datos)
            alterado["casos"][-1]["revision"][campo] = valor
            with self.assertRaises(ValueError):
                validar_datos(alterado)

    def test_contrato_no_extiende_fechas_ni_imputa_experiencia(self):
        entrada = copy.deepcopy(self.datos["casos"][0]["entradas"])
        for campo, valor in [("experiencia_k12", ""), ("antiguedad_k12", "tres_meses"),
                             ("control_k12", "controlado")]:
            invalida = dict(entrada, **{campo: valor})
            with self.assertRaises(ValueError):
                validar_entradas(invalida)
        otro_contexto = copy.deepcopy(CONTEXTO)
        otro_contexto["dosis"]["K12"]["repeticiones_por_lado"] = 6
        with self.assertRaises(ValueError):
            validar_contexto(otro_contexto)

    def test_mismo_dominio_categorico_de_41_combinaciones(self):
        validas = 0
        for valores in product(*CATEGORIAS):
            try:
                validar_entradas(dict(zip(CAMPOS, valores)))
            except ValueError:
                continue
            validas += 1
        self.assertEqual(validas, 41)

if __name__ == "__main__":
    unittest.main()
