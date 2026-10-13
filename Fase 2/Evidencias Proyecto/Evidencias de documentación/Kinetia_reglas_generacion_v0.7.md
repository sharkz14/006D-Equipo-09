# Kinetia — Reglas simples y prioridades de generación

Versión 0.7 · 2 de octubre de 2026

**Estado:** diseño preliminar para programar. Quedan definidas las listas de las ocho familias y los 14 candidatos K01–K14. Las duraciones son referencias generales. Esta versión conserva las prioridades y plantillas de v0.6 y registra una simulación automática de escritorio. No habilita ejecución autónoma ni modifica dosis de las fichas.

## Entradas y filtro previo

La persona aporta nivel elegido según experiencia en fuerza, equipamiento disponible, duración aproximada y exclusiones. El filtro previo se aplica antes: si no está superado, no se inicia sesión ni se buscan ejercicios para resolver dolor, lesión limitante o recuperación clínica.

Las exclusiones identifican ejercicio, familia o posición/apoyo, y alcanzan toda la sesión y sus transiciones. No interpretar diagnósticos. Principiante admite P; intermedio admite P e I. Disponer de una mancuerna permite también peso corporal; ninguna opción exige dos.

## Cuatro pasos

| Paso | Acción |
|---|---|
| **1. Elegir plantilla** | Buscar la del nivel, duración y equipo solicitados. Define cupos en orden y familias/funciones admitidas. Si falta, informar que está pendiente de configurar. |
| **2. Filtrar** | Retirar opciones incompatibles por nivel, equipo, exclusiones, función del cupo o falta de dosis. En la app se exige contenido habilitado; los borradores se estudian aparte en escritorio. |
| **3. Seleccionar** | Recorrer cada lista ordenada y elegir la primera compatible, sin repetir familias del principal. Si ninguna queda, omitir el cupo e informar. Si no queda ningún principal, no generar sesión. |
| **4. Montar y estimar** | Conservar orden y dosis, añadir auxiliares compatibles, retirar ensayos de ejercicios omitidos/sustituidos y ajustar transiciones. Mostrar contenido, omisiones y minutos aproximados. |

La selección es determinística: mismos datos y configuración producen el mismo resultado. La prioridad es explícita, no deducida del ID; pulsar nuevamente «Generar» no cambia la lista.

## Prioridades completas

P = principiante; I = intermedio. La flecha indica orden de intento, no progresión de entrenamiento. «—» significa que no hay opción para ese perfil. La plantilla decide cuáles de estas familias aparecen.

| Familia / función | P · peso corporal | P · mancuerna | I · peso corporal | I · mancuerna |
|---|---|---|---|---|
| Sentadilla | K01 | K02 → K01 | K01 | K02 → K01 |
| Split squat | K03 | K03 | K03 | K04 → K03 |
| Bisagra | — | — | — | K05 |
| Puente, cadera general | K06 | K06 → K07 | K08 → K06 | K08 → K06 → K07 |
| Pantorrilla | K09 | K09 → K10 | K09 | K09 → K10 |
| Dead bug, control anterior | K11 | K11 | K12 → K11 | K12 → K11 |
| Bird dog, cuadrupedia | — | — | K13 | K13 |
| Plancha lateral, control lateral | K14 | K14 | K14 | K14 |

Estas prioridades son decisiones de Kinetia, sin afirmar superioridad, equivalencia de esfuerzo ni transferencia demostrada al baile. Sentadilla/split squat priorizan carga cuando el perfil la admite. Puentes y pantorrilla priorizan sus opciones sin carga; K07/K10 conservan su lugar como alternativas, con manejo o variante exacta pendientes de revisión. La mancuerna no cambia las listas de core.

- **Bisagra:** si K05 queda fuera, omitir el cupo; no insertar automáticamente un puente.
- **Puente:** la lista es para cadera general. Si una plantilla exige unilateral, solo K08 conserva esa función; K06/K07 se filtran fuera.
- **Core:** control anterior, cuadrupedia y lateral conservan cupos distintos. K13/K14 no sustituyen automáticamente a K11/K12 ni entre sí.
- Excluir una familia retira todas sus variantes. Las restricciones compartidas también se aplican: por ejemplo, evitar boca arriba afecta a puentes y dead bug, aunque sean familias diferentes.

## Dosis y referencias de sesión

Cada variante toma series, repeticiones/sostenes y descansos de su ficha para el nivel elegido. Se conservan como propuestas preliminares; no se copian valores de la variante sustituida. En movimientos por lado se completan ambos; los alternados cuentan cada pareja contraria de movimiento y regreso como una repetición. Los sostenes de K14 se cuentan por lado.

| Plantilla configurada | Principal de referencia con peso corporal | Dosis principal | Referencia |
|---|---|---|---|
| P · 20 | K01 → K06 → K11 | Dos series, dosis P | Unos 20 min; modelo v0.4 |
| P · 30 | K01 → K03 → K09 → K06 → K11 | Dos series, dosis P | Unos 30 min; plantillas v0.1 |
| P · 40 | K01 → K03 → K09 → K06 → K11 → K14 | Tres series de K01/K06/K11; dos de los demás | Unos 40 min; plantillas v0.1 |
| I · 20 | K01 → K08 → K12 | Dos series, dosis I | Unos 20 min; plantillas de intermedio v0.1 |
| I · 30 | K01 → K03 → K09 → K08 → K12 | Dos series, dosis I | Unos 30 min; plantillas de intermedio v0.1 |
| I · 40 | K01 → K03 → K09 → K08 → K12 → K13 → K14 | Dos series, dosis I | Unos 40 min; plantillas de intermedio v0.1 |

P40 conserva una excepción preliminar ligada únicamente a K01/K06/K11. Sus tres series no pasan a otras variantes; las sustituciones mantienen las dos de sus fichas. La duración adicional no aumenta automáticamente dosis ni dificultad. Intermedio conserva dos series en sus tres duraciones.

**Configuración de intermedio:** I20_PC/I30_PC/I40_PC usan cadera general mediante puente (K08 → K06). I20_M1/I30_M1/I40_M1 usan bisagra (K05); si falta, omitir ese cupo. Los seis órdenes completos y auxiliares propuestos están en `Kinetia_plantillas_intermedio_v0.1.md`. Las listas conservan la dosis I de la variante seleccionada. Las siete familias de I40 son una composición propia para incluir control anterior, cuadrupedia y lateral, no una cantidad obligatoria para todo intermedio.

P20/P30/P40 reutilizan sus cupos y orden para ambos equipamientos, aplicando las prioridades correspondientes. Sus modelos publicados son corporales; las combinaciones con carga conservan pendientes de preparación, manejo y estimación. Se respeta la excepción de dosis de P40 ligada a IDs concretos.

**Tiempo referencial:** estimar ambos lados, descansos, guías y cambios de posición. No ajustar series, añadir esperas o acortar descansos para alcanzar 20/30/40 exactos. La estimación se presenta en minutos aproximados y cambia si se reduce claramente el contenido. Los descansos y segundos de sostén siguen siendo parte de la dosis.

## Preparación, cierre e interfaz

En P20, los ensayos de cuatro repeticiones de K01 y K06 se conservan solo si se selecciona su ejercicio y está permitido. Son volumen adicional y sus guías se muestran una vez. Otra variante usa su guía; no hereda automáticamente el ensayo anterior ni introduce uno cargado sin definirlo. Marcha, caminata y entradas/salidas también pasan los filtros.

C02/C03 son auxiliares opcionales, con un sostén preliminar de 20 segundos por lado. Al omitirlos se retiran guías y transiciones innecesarias. C02 es un estiramiento, no familia puente: una exclusión de postura boca arriba sí lo afecta. P30/P40 conservan provisionalmente su preparación/cierre anterior. Las nuevas plantillas de intermedio proponen P01 y C01/C02/C03 del modelo P20 v0.4; ensayo de K01 solo si se selecciona K01 y sin ensayos heredados de K06. La preparación específica con carga continúa pendiente antes de habilitar esas sesiones.

La app devuelve ejercicios en orden, dosis, descansos, preparación/cierre, contenido omitido y duración orientativa. Conservar internamente versiones de fichas y plantilla.

Mensaje propuesto: **«Esta sesión tendrá menos ejercicios porque no encontramos una alternativa compatible para [ejercicio]. Duración estimada: [minutos].»** Mostrarlo antes de comenzar. Si se omite un estiramiento durante la sesión, actualizar la estimación restante.

La persona confirma «Serie completada» para iniciar el descanso. En sostenes, confirmar la posición inicia el temporizador; ofrecer cambio de lado y omisión en el cierre. La estimación no completa series automáticamente. La app no evalúa ni corrige técnica; ante dolor se detiene la sesión sin sustituir para continuar.

## Ejemplos de selección en borrador

Suponen que se cumplen los demás filtros; no son sesiones habilitadas.

| Caso | Selección |
|---|---|
| P con mancuerna; K09 excluido | Intentar K10; si tampoco es compatible, omitir pantorrilla. |
| P sin mancuerna; K09 excluido | Omitir pantorrilla e informar. |
| I; K12 excluido | Intentar K11 para control anterior. |
| Familia dead bug excluida | Omitir control anterior; conservar los otros cupos compatibles. |
| K13 o K14 excluido | Omitir respectivamente cuadrupedia o lateral, sin reemplazo cruzado. |

## Pendientes y base

Quedan configurados los cupos y órdenes de las seis plantillas de intermedio. Su preparación/cierre son propuestas preliminares; deben completarse la preparación específica con carga y la integración de los cuatro pasos en la app. Tener cupos configurados no equivale a una rutina habilitada para ejecución autónoma. La prueba presencial, revisión de técnica/dosis, demostraciones y permisos permanecen pendientes. La simulación anterior conserva reglas antiguas como referencia histórica. La prueba nueva `Kinetia_prueba_generador_v0.1.cjs` implementa la selección y montaje de v0.6 en escritorio: pasaron 50 casos específicos y 360 combinaciones de exclusión simple. El detalle está en `Kinetia_resultado_prueba_generador_v0.1.md`. No se han probado aún interfaz ni temporizadores; las transiciones representan posturas y acceso, con su técnica/apoyos exactos pendientes. Todos los contenidos siguen sin habilitar y los resultados son no ejecutables.

K02/K04 requieren completar manejo de carga; K05 conserva su agarre como adaptación propia pendiente; K07 necesita resolver colocación/retirada en pelvis; K10 conserva la combinación exacta con una mancuerna como adaptación no verificada. Mantienen sus IDs y condición de candidatos. Figurar en las listas no habilita su ejecución autónoma.

**Para el chat principal:** revisar el reparto general si se extiende la preparación repartida y el nuevo cierre a 30/40.

**Base:** catálogo candidato v0.1; fichas simples K01/K02, K03/K04, K05, K06–K08, K09/K10, K11/K12 y K13/K14 v0.1; fichas auxiliares C02/C03 v0.1; rutina modelo P20 v0.4; plantillas P30/P40 v0.1; plantillas de intermedio v0.1. La clasificación, prioridades y reglas son propuestas propias. No se modifican las fichas, el catálogo de origen ni entregables académicos.
