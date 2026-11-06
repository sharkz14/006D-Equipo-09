# Kinetia · evaluación de la IA contra el preparador físico (30-10-2026)

## Qué se midió
Las **31 historias** con etiqueta real del preparador físico (14 del puente K06/K08 y 17 del dead bug K11/K12; una es
empate) se enviaron a la IA de Kinetia **igual que en producción**: mismo servidor, prompt, esquema JSON y validación
(contrato `kinetia-rutina-ia-0.2`, modelo `claude-haiku-5-5`), plantilla I20_PC (intermedio, 20 min, peso corporal, sin
exclusiones) y un perfil neutro (30 años, 65 kg, 170 cm: sin límites por edad ni peso). Cada historia se preguntó
**3 veces** (93 consultas por corrida). Se compara la variante elegida por la IA con la preferida por el preparador.

Se hicieron dos corridas:
1. **Versión inicial** del prompt (regla «si dudas, elige la opción más conservadora»).
2. **Versión ajustada**: esa regla se reemplazó por los criterios de selección del proyecto (hoja «Criterios» de
   `hoja_etiquetado_kinetia_v2.xlsx`): «no se sabe» es neutro; un intermedio sin señales en contra parte de la variante
   exigente; señales en contra con peso (paró por esfuerzo, muy fuerte; dejó el core hace más de un año, fuerte; nunca
   la hizo, leve…); lo reciente pesa más; con poca información, la prudencia va en la dosis y no en la variante.

## Resultados
| | Versión inicial | **Versión ajustada** |
|---|---|---|
| Coincide con la preferida (voto de 3), puente | 9 / 14 | **14 / 14** |
| Coincide con la preferida (voto de 3), dead bug | 9 / 16 | **16 / 16** |
| **Coincide con la preferida, total** | 18 / 30 (60 %) | **30 / 30 (100 %)** |
| Coincide por respuesta | 54 / 90 (60 %) | **87 / 90 (97 %)** |
| Dentro de lo aceptable para el preparador | 90 / 90 | 90 / 90 |
| Casos FIRME (evidencia directa y reciente) | 15 / 15 respuestas | 15 / 15 respuestas |
| Misma respuesta las 3 veces | 26 / 30 | 27 / 30 |
| Desacuerdos: IA más conservadora / más exigente | 11 / 1 | 0 / 0 |
| Respuestas con intensidad reducida | 37 / 93 | 50 / 93 |
| Motivos con estilos de baile no declarados | 28 / 93 | 0 / 93 |
| Palabras internas («cupo», «ficha») / códigos (K08…) | 4 / 0 | 0 / 0 |

Referencias sobre la misma muestra:
| Método | Coincide |
|---|---|
| Siempre la variante básica | 11 / 30 |
| Siempre la variante exigente (orden de prioridad del generador) | 19 / 30 |
| Árboles entrenados con estas etiquetas (leave-one-out) | 23 / 30 |
| Criterios escritos del proyecto, aplicados a mano (suma de pesos) | 30 / 30 (14/14 · 16/16) |
| IA, versión inicial | 18 / 30 |
| **IA, versión ajustada** | **30 / 30** |

## Lectura
- La versión inicial **nunca eligió algo inaceptable** y acertó todos los casos FIRME, pero era sistemáticamente más
  conservadora que el preparador (11 de 12 desacuerdos), sobre todo con datos desconocidos.
- Con los criterios del proyecto, la IA coincide en las 30 historias y **traslada la prudencia a la dosis**: elige la
  variante exigente con intensidad reducida cuando la información es incompleta (p. ej., «Como practicas core con
  regularidad, te propongo el dead bug con extensión, aunque sea nuevo para ti; con la dosis reducida…»).
- En estas dos decisiones, la IA ajustada **iguala** a los criterios escritos aplicados a mano (30/30): lo que muestra
  es que aplica de forma consistente un criterio profesional, sin reglas programadas para cada caso, y lo explica; no que
  lo supere.
- La IA aporta, además de la elección, la **dosis y la explicación** en lenguaje natural, y combina esta decisión con
  los límites por edad y peso, la última sesión y los estilos de baile (que los árboles y la suma de pesos no
  consideran).

## Límites (importante para el informe)
- **El 30/30 es optimista.** Los criterios del dead bug se calibraron con estas mismas etiquetas (coherencia 13/14), así
  que su 16/16 no es una prueba a ciegas. Los del puente se escribieron sin ver las etiquetas, por lo que su 14/14 es
  más confiable, aunque la muestra es pequeña («siempre K08» acertaría 10/14).
- Un solo revisor; historias hipotéticas; 30 casos; se mide acuerdo con el criterio de un profesional, no eficacia física.
- **Prueba limpia pendiente:** las 18 filas «A CIEGAS» de la hoja v2 (10 del dead bug, 8 del puente), que el preparador
  debe etiquetar sin ver las propuestas. Con ellas se puede repetir esta evaluación sin sesgo.

## Incidente detectado y corregido
En la corrida ajustada, 7 de 93 respuestas quedaron cortadas (`stop_reason: max_tokens`): Claude Haiku 5.5 piensa de
forma adaptativa por defecto y esos tokens cuentan en `max_tokens` (estaba en 2000). Se subió a 16000 (valor de la guía
oficial) y el tiempo de espera de la app de 25 a 45 s; las 7 consultas se repitieron con el mismo prompt
(`--completar`). Sin este arreglo, en la app esas rutinas habrían caído al respaldo por reglas.

## Archivos (carpeta del proyecto)
- `herramientas/casos_evaluacion_ia.json`: las 31 solicitudes (idénticas a producción).
- `herramientas/evaluar-ia-preparador.mjs`: script de evaluación (se corre con la clave en el PC).
- `herramientas/resultado_evaluacion_ia.json`: versión inicial (93 respuestas con motivo).
- `herramientas/resultado_evaluacion_ia_calibrada.json`: versión ajustada (93 respuestas; 7 repetidas con `--completar`;
  huella SHA-256 del servidor en el archivo).
