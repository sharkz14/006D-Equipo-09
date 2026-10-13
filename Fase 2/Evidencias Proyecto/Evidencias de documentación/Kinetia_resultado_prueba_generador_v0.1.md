# Kinetia — Prueba de generación por reglas

Versión 0.1 · 2 de octubre de 2026

**Resultado:** 50/50 casos específicos y 360/360 combinaciones del barrido pasaron, sin fallos en esta ejecución. Se creó y ejecutó `Kinetia_prueba_generador_v0.1.cjs`, con Node.js 24.19.0 y sin paquetes externos.

Es una **simulación de escritorio con contenido preliminar**. Comprueba lógica de selección y montaje; no valida técnica, dosis, eficacia en baile ni ejecución física de transiciones. Todo el catálogo permanece sin habilitar y cada resultado conserva `ejecutable: false`.

## Qué se probó

| Cobertura | Alcance |
|---|---|
| 12 perfiles base | P/I × 20/30/40 × peso corporal/una mancuerna, comparados con listas esperadas escritas aparte |
| 38 casos adicionales | Sustituciones, omisiones, dosis/lados, ensayos, auxiliares, exclusiones combinadas, bloqueo previo, datos desconocidos y modo app |
| 360 combinaciones | Los 12 perfiles con una exclusión cada vez: 14 IDs principales, ocho familias principales y ocho características |

Las ocho características del barrido son boca arriba, acceso al suelo, apoyo en manos, rodillas o antebrazo, sujeción de muslo o pie y postura de pie. Se comprobaron ausencia de contenido excluido en toda la secuencia, ausencia de familias principales repetidas, nivel/equipo compatibles y repetición determinística del resultado.

El barrido no incluye todas las combinaciones posibles de varias exclusiones; esas interacciones tienen casos específicos representativos. El número de comprobaciones no certifica el catálogo ni sustituye la revisión del contenido.

## Casos destacados

| Caso simulado | Principal observado | Comparación con lo esperado |
|---|---|---|
| K12 excluido: usar K11 con dosis I | K02 → K04 → K05 → K09 → K11 | Correcto |
| K05 excluido: omitir bisagra e informar | K02 → K04 → K09 → K12 | Correcto |
| Boca arriba: retirar ambas variantes y C02 | K02 → K04 → K05 → K09 | Correcto |
| P20: familia puente no bloquea C02 | K01 → K11 | Correcto |
| P40: tres series no se copian a K02/K07 | K02 → K03 → K09 → K07 → K11 → K14 | Correcto |
| I20: sustituciones corporales usan dosis I, sin ensayo K06 | K01 → K06 → K11 | Correcto |
| I40: sin bisagra ni dead bug, no reemplazo cruzado | K02 → K04 → K09 → K13 → K14 | Correcto |
| Apoyo de rodillas: no confundir con flexión de rodilla | K01 → K03 → K09 → K08 → K12 | Correcto |
| Acceso al suelo excluido: retirar entradas y salidas | K01 | Correcto |
| Todos los principales excluidos: no sesión auxiliar | Sin principal | Correcto |
| Entrada de app: borradores no se habilitan | Sin principal | Correcto |
| Filtro previo negativo: no intentar sustituciones | Sin principal | Correcto |

Precisiones verificadas:

- K12 → K11 conserva control anterior y utiliza dosis I de K11: dos series de seis por lado, 24 movimientos alternados en total.
- K04 → K03 cambia a ocho por lado, 32 repeticiones totales y 150 s de descansos para dos series completas.
- I20 corporal con K08/K12 excluidos usa K06 de dos series de 12 y K11 de dos series de seis por lado. Solo K01 tiene ensayo; K06 no hereda el de P20.
- P40 conserva tres series únicamente en K01/K06/K11. K02 y K07 mantienen dos; todos los ejercicios de I40 mantienen dos.
- K14 intermedio suma cuatro sostenes, 60 s de sostén y 120 s de pausas, además de guía y colocación. K13 suma 20 movimientos alternados.
- Excluir la familia puente retira sus guías/ensayos, pero permite C02 si sus características siguen compatibles. Excluir boca arriba sí retira C02.
- Excluir apoyo de rodillas retira K13/K14; no equivale a excluir la flexión de rodilla de C03.
- Al retirar estiramientos desaparecen sus guías y la nueva bajada al suelo. Al quedar cero principales no se crea una sesión solo con auxiliares.
- El filtro previo no superado detiene la generación antes de intentar sustituciones. Una exclusión desconocida se informa; no se ignora.

## Cómo volver a ejecutar

Guardar el archivo JavaScript y abrir una terminal en su carpeta:

```sh
node Kinetia_prueba_generador_v0.1.cjs
```

El comando muestra los conteos y devuelve un código de error si algún caso falla. Opcionalmente, guarda los resultados completos:

```sh
node Kinetia_prueba_generador_v0.1.cjs resultados.json
```

El mismo archivo exporta `generateRoutine` para trabajar después en la integración. Ejemplo de entrada de escritorio:

```javascript
{
  nivel: 'I',
  equipo: 'M1',
  duracion: 30,
  filtroSuperado: true,
  modo: 'borrador',
  excluir: { ids: ['K05'], familias: [], tags: [] },
  cierreOpcional: ['C02', 'C03']
}
```

P/I corresponden al nivel elegido de fuerza; PC/M1 al equipo. `modo` es un control del entorno de prueba, no un nuevo dato que deba pedir la app a la persona. Si se omite, se exige contenido habilitado. El script recibe el resultado del filtro previo; no diseña ese filtro ni interpreta diagnósticos.

Devuelve principal en orden, dosis y conteos de ambos lados, ensayos/auxiliares, transiciones genéricas, omisiones/mensajes, ID y versión de plantilla y estimación referencial. El motor conserva cuatro pasos: elegir, filtrar, seleccionar y montar. Las expectativas y el barrido se ejecutan solo al lanzar el archivo; importarlo no ejecuta las pruebas.

## Límites y siguiente paso

Los tiempos se usan para informar, sin completar cupos o cambiar descansos por el reloj. En resultados con carga la estimación completa queda pendiente; el cálculo parcial no se presenta como duración total. Las cantidades internas para guías/colocación tampoco activan temporizadores.

Las transiciones actuales representan cambios de postura y acceso al suelo. Su técnica y apoyos concretos todavía deben describirse y revisarse antes de habilitar ejecución; esta simulación no comprueba una forma física de bajar o levantarse. Las secuencias configuradas parten y terminan de pie: excluir esa postura bloquea también su acceso al suelo. Esta limitación del recorrido no interpreta una condición clínica.

Quedan pendientes medios visuales y permisos, revisión técnica/dosis, preparación específica y manejo de carga, integración en el prototipo y prueba de interfaz con confirmación de series, descansos, sostenes y cambios de lado. No se ha probado todavía una pantalla ni su reproductor/temporizadores.

**Base:** catálogo candidato v0.1; fichas simples K01–K14 y C02/C03 v0.1; reglas v0.6; modelo P20 v0.4; plantillas P30/P40 v0.1 y de intermedio v0.1. Reglas v0.7 registran esta prueba sin cambiar las prioridades o dosis. La transcripción del catálogo al script y las etiquetas auxiliares son datos propios para esta simulación.

No se modificaron el catálogo de origen, las fichas ni entregables académicos anteriores.
