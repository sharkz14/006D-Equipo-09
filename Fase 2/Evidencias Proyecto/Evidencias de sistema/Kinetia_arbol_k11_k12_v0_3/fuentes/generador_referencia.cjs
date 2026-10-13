/* Kinetia: simulación de escritorio; reglas v0.6 y fichas v0.1.
 * Ejecutar: node Kinetia_prueba_generador_v0.1.cjs [ruta-resultados.json]
 * Sin paquetes externos. No constituye una aplicación ni habilita contenido.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const VERSION = 'simulacion-0.1-reglas-0.6';
const FLOOR = new Set(['boca_arriba', 'cuadrupedia', 'lateral']);
const dose = (value, rest, sideRest = 0, unit = 'repeticiones') =>
  value === null ? null : { series: 2, cantidad: value, unidad: unit,
    descansoEntreSeries: rest, descansoEntreLados: sideRest };

function exercise(id, nombre, familia, funcion, equipo, nivelMinimo,
  posicion, lateralidad, p, i, rest, sideRest = 0, tags = []) {
  return { id, nombre, familia, funcion, equipo, nivelMinimo, posicion,
    lateralidad, tags: [posicion, ...tags], habilitado: false, versionFicha: '0.1',
    dosis: { P: dose(p, rest, sideRest), I: dose(i, rest, sideRest) } };
}

// Metadatos para selección. Las instrucciones y variantes exactas siguen en las fichas.
const CATALOG = Object.fromEntries([
  exercise('K01', 'Sentadilla corporal', 'sentadilla', 'rodilla', 'PC', 'P',
    'de_pie', 'bilateral', 8, 10, 90),
  exercise('K02', 'Sentadilla goblet, una mancuerna', 'sentadilla', 'rodilla', 'M1', 'P',
    'de_pie', 'bilateral', 8, 10, 90, 0, ['sujecion_carga']),
  exercise('K03', 'Split squat corporal', 'split_squat', 'apoyo_asimetrico', 'PC', 'P',
    'de_pie', 'por_lado', 6, 8, 90, 30),
  exercise('K04', 'Split squat goblet, una mancuerna', 'split_squat', 'apoyo_asimetrico', 'M1', 'I',
    'de_pie', 'por_lado', null, 6, 90, 30, ['sujecion_carga']),
  exercise('K05', 'Rumano bilateral, una mancuerna con ambas manos', 'bisagra', 'cadera', 'M1', 'I',
    'de_pie', 'bilateral', null, 8, 90, 0, ['sujecion_carga']),
  exercise('K06', 'Puente bilateral corporal', 'puente', 'cadera', 'PC', 'P',
    'boca_arriba', 'bilateral', 10, 12, 90, 0, ['manos_en_suelo', 'brazos_en_suelo']),
  exercise('K07', 'Puente bilateral, mancuerna en pelvis', 'puente', 'cadera', 'M1', 'P',
    'boca_arriba', 'bilateral', 8, 10, 90, 0, ['sujecion_carga']),
  exercise('K08', 'Puente unilateral, pierna contraria sujeta detrás del muslo', 'puente', 'cadera', 'PC', 'I',
    'boca_arriba', 'por_lado', null, 6, 90, 30, ['sujecion_muslo', 'apoyo_un_pie']),
  exercise('K09', 'Talones bilaterales, suelo plano, sin apoyo externo', 'pantorrilla', 'pantorrilla', 'PC', 'P',
    'de_pie', 'bilateral', 10, 12, 60, 0, ['elevacion_talones']),
  exercise('K10', 'Talones bilaterales goblet, una mancuerna', 'pantorrilla', 'pantorrilla', 'M1', 'P',
    'de_pie', 'bilateral', 8, 10, 60, 0, ['elevacion_talones', 'sujecion_carga']),
  exercise('K11', 'Dead bug inicial desde apoyos', 'dead_bug', 'control_anterior', 'PC', 'P',
    'boca_arriba', 'alternado', 5, 6, 60, 0, ['manos_en_suelo', 'brazos_atras']),
  exercise('K12', 'Dead bug con extensión contralateral', 'dead_bug', 'control_anterior', 'PC', 'I',
    'boca_arriba', 'alternado', null, 5, 60, 0, ['brazos_atras', 'piernas_sin_apoyo']),
  exercise('K13', 'Bird dog contralateral', 'bird_dog', 'cuadrupedia', 'PC', 'I',
    'cuadrupedia', 'alternado', null, 5, 60, 0, ['apoyo_manos', 'apoyo_rodillas']),
  exercise('K14', 'Plancha lateral con rodillas apoyadas', 'plancha_lateral', 'control_lateral', 'PC', 'P',
    'lateral', 'sosten_por_lado', 10, 15, 60, 30, ['apoyo_antebrazo', 'apoyo_rodillas']),
].map(item => [item.id, item]));
for (const level of ['P', 'I']) CATALOG.K14.dosis[level].unidad = 'segundos';

const AUX = {
  P01: { id: 'P01', familia: 'marcha', posicion: 'de_pie', tags: ['de_pie', 'marcha'], habilitado: false },
  P02: { id: 'P02', familia: 'marcha', posicion: 'de_pie', tags: ['de_pie', 'marcha', 'giros_hombros'], habilitado: false },
  C01: { id: 'C01', familia: 'caminata', posicion: 'de_pie', tags: ['de_pie', 'caminata'], habilitado: false },
  C02: { id: 'C02', familia: 'estiramiento_gluteo', posicion: 'boca_arriba', tags: ['boca_arriba', 'sujecion_muslo', 'pierna_cruzada'], habilitado: false },
  C03: { id: 'C03', familia: 'estiramiento_cuadriceps', posicion: 'lateral', tags: ['lateral', 'sujecion_pie', 'apoyo_brazo', 'flexion_rodilla'], habilitado: false },
};

// Cada lista tiene el mismo orden que las reglas publicadas.
const PRIORITIES = {
  P_PC: { sentadilla: ['K01'], split_squat: ['K03'], bisagra: [], puente: ['K06'],
    pantorrilla: ['K09'], dead_bug: ['K11'], bird_dog: [], plancha_lateral: ['K14'] },
  P_M1: { sentadilla: ['K02', 'K01'], split_squat: ['K03'], bisagra: [], puente: ['K06', 'K07'],
    pantorrilla: ['K09', 'K10'], dead_bug: ['K11'], bird_dog: [], plancha_lateral: ['K14'] },
  I_PC: { sentadilla: ['K01'], split_squat: ['K03'], bisagra: [], puente: ['K08', 'K06'],
    pantorrilla: ['K09'], dead_bug: ['K12', 'K11'], bird_dog: ['K13'], plancha_lateral: ['K14'] },
  I_M1: { sentadilla: ['K02', 'K01'], split_squat: ['K04', 'K03'], bisagra: ['K05'], puente: ['K08', 'K06', 'K07'],
    pantorrilla: ['K09', 'K10'], dead_bug: ['K12', 'K11'], bird_dog: ['K13'], plancha_lateral: ['K14'] },
};
const FAMILIES = {
  sentadilla: 'rodilla', split_squat: 'apoyo_asimetrico', bisagra: 'cadera', puente: 'cadera',
  pantorrilla: 'pantorrilla', dead_bug: 'control_anterior', bird_dog: 'cuadrupedia', plancha_lateral: 'control_lateral',
};
const TEMPLATE_ORDERS = {
  P20: ['sentadilla', 'puente', 'dead_bug'],
  P30: ['sentadilla', 'split_squat', 'pantorrilla', 'puente', 'dead_bug'],
  P40: ['sentadilla', 'split_squat', 'pantorrilla', 'puente', 'dead_bug', 'plancha_lateral'],
  I20_PC: ['sentadilla', 'puente', 'dead_bug'],
  I30_PC: ['sentadilla', 'split_squat', 'pantorrilla', 'puente', 'dead_bug'],
  I40_PC: ['sentadilla', 'split_squat', 'pantorrilla', 'puente', 'dead_bug', 'bird_dog', 'plancha_lateral'],
  I20_M1: ['sentadilla', 'bisagra', 'dead_bug'],
  I30_M1: ['sentadilla', 'split_squat', 'bisagra', 'pantorrilla', 'dead_bug'],
  I40_M1: ['sentadilla', 'split_squat', 'bisagra', 'pantorrilla', 'dead_bug', 'bird_dog', 'plancha_lateral'],
};
const KNOWN_IDS = new Set([...Object.keys(CATALOG), ...Object.keys(AUX)]);
const KNOWN_FAMILIES = new Set([...Object.keys(FAMILIES), ...Object.values(AUX).map(x => x.familia)]);
const KNOWN_TAGS = new Set([...Object.values(CATALOG), ...Object.values(AUX)].flatMap(x => x.tags).concat('acceso_suelo'));

function totals(exercise, d) {
  const sides = exercise.lateralidad === 'bilateral' ? 1 : 2;
  const count = d.series * d.cantidad * sides;
  const rest = (d.series - 1) * d.descansoEntreSeries +
    (exercise.lateralidad === 'por_lado' || exercise.lateralidad === 'sosten_por_lado'
      ? d.series * d.descansoEntreLados : 0);
  return { lados: sides, totalRepeticiones: d.unidad === 'repeticiones' ? count : null,
    totalSostenerSegundos: d.unidad === 'segundos' ? count : null,
    totalSostenes: d.unidad === 'segundos' ? d.series * sides : 0,
    totalDescansoSegundos: rest };
}

function generateRoutine(input, catalog = CATALOG) {
  const { nivel, equipo, duracion } = input;
  const modo = input.modo ?? 'app'; // El uso de borradores requiere modo explícito.
  const exclusions = { ids: [], familias: [], tags: [], ...input.excluir };
  const optional = input.cierreOpcional ?? ['C02', 'C03'];
  const result = { version: VERSION, entrada: structuredClone(input), estado: 'pendiente',
    ejecutable: false, plantilla: null, versionPlantilla: null, principal: [], omitidos: [], auxiliaresOmitidos: [],
    secuencia: [], mensajes: [], duracion: null };
  const stop = (state, message) => { result.estado = state; result.mensajes.push(message); return result; };

  if (!['P', 'I'].includes(nivel) || !['PC', 'M1'].includes(equipo) || !['borrador', 'app'].includes(modo))
    return stop('entrada_invalida', 'Revisar nivel, equipo o modo de simulación.');
  if (!Number.isInteger(duracion))
    return stop('entrada_invalida', 'La duración debe ser un número entero de minutos.');
  for (const [field, known] of [['ids', KNOWN_IDS], ['familias', KNOWN_FAMILIES], ['tags', KNOWN_TAGS]]) {
    if (!Array.isArray(exclusions[field]) || exclusions[field].some(x => !known.has(x)))
      return stop('entrada_invalida', `Exclusión desconocida en ${field}; no se ignora.`);
  }
  if (!Array.isArray(optional) || optional.some(x => !['C02', 'C03'].includes(x)))
    return stop('entrada_invalida', 'Revisar las opciones de cierre.');
  if (input.filtroSuperado !== true)
    return stop('filtro_no_superado', 'No iniciar sesión; el generador no interpreta diagnósticos.');

  // 1. Elegir plantilla. P comparte estructura; I concreta el orden según equipo.
  const key = nivel === 'P' ? `P${duracion}` : `I${duracion}_${equipo}`;
  const order = TEMPLATE_ORDERS[key];
  if (!order) return stop('plantilla_pendiente', 'La plantilla solicitada está pendiente de configurar.');
  result.plantilla = key;
  result.versionPlantilla = key === 'P20' ? '0.4' : '0.1';
  const profile = PRIORITIES[`${nivel}_${equipo}`];
  const requirements = item => FLOOR.has(item.posicion)
    ? [...item.tags, 'acceso_suelo', 'de_pie'] : item.tags;
  // Las secuencias actuales parten/terminan de pie. Acceso al suelo y sus dos
  // extremos se filtran; la mecánica y apoyos exactos de las transiciones son pendientes.
  const compatible = item => item &&
    !exclusions.ids.includes(item.id) && !exclusions.familias.includes(item.familia) &&
    !requirements(item).some(tag => exclusions.tags.includes(tag)) &&
    (modo === 'borrador' || item.habilitado === true);

  // 2 y 3. Filtrar y seleccionar la primera variante compatible por cupo.
  const used = new Set();
  for (const family of order) {
    const selected = profile[family].map(id => catalog[id]).find(item => compatible(item) &&
      item.familia === family && item.funcion === FAMILIES[family] && !used.has(item.familia) &&
      (nivel === 'I' || item.nivelMinimo === 'P') &&
      (equipo === 'M1' || item.equipo === 'PC') && item.dosis?.[nivel]);
    if (!selected) {
      result.omitidos.push(family);
      result.mensajes.push(`Esta sesión tendrá menos ejercicios: no hay alternativa compatible para ${family}.`);
      continue;
    }
    used.add(selected.familia);
    const d = { ...selected.dosis[nivel] };
    if (key === 'P40' && ['K01', 'K06', 'K11'].includes(selected.id)) d.series = 3;
    result.principal.push({ id: selected.id, nombre: selected.nombre, familia: selected.familia,
      funcion: selected.funcion, equipo: selected.equipo, posicion: selected.posicion,
      lateralidad: selected.lateralidad, tags: requirements(selected),
      versionFicha: selected.versionFicha, dosis: d, conteo: totals(selected, d) });
  }
  if (!result.principal.length)
    return stop('sin_principal', modo === 'app'
      ? 'No hay ejercicios principales compatibles y habilitados para la app.'
      : 'No queda ningún principal compatible; no generar una sesión solo con auxiliares.');

  // 4. Montar guías, ensayos propios de cada plantilla y auxiliares compatibles.
  const legacy = nivel === 'P' && duracion !== 20;
  const guidesShown = new Set();
  const append = block => {
    const previous = result.secuencia.filter(x => x.tipo !== 'transicion').at(-1);
    const from = previous?.posicion ?? 'de_pie';
    if (from !== block.posicion) {
      const floorChange = FLOOR.has(from) || FLOOR.has(block.posicion);
      result.secuencia.push({ tipo: 'transicion', desde: from, hacia: block.posicion,
        tags: [from, block.posicion, ...(floorChange ? ['acceso_suelo'] : [])],
        segundosEstimados: FLOOR.has(from) && FLOOR.has(block.posicion) &&
          previous?.fase !== 'principal' && block.fase !== 'principal' ? 20 : 30 });
    } else if (previous?.tipo === 'principal' && block.tipo === 'principal') {
      result.secuencia.push({ tipo: 'transicion', desde: from, hacia: from,
        tags: [from, ...(FLOOR.has(from) ? ['acceso_suelo'] : [])], segundosEstimados: 30 });
    }
    result.secuencia.push(block);
  };
  const addAux = (id, phase, seconds) => {
    const aux = AUX[id];
    if (!compatible(aux)) { result.auxiliaresOmitidos.push(id); return; }
    append({ tipo: 'auxiliar', fase: phase, id, familia: aux.familia,
      posicion: aux.posicion, tags: requirements(aux), segundosEstimados: seconds,
      ...(id === 'C02' || id === 'C03'
        ? { dosis: { unidad: 'segundos', cantidadPorLado: 20, lados: 2, sostenesPorLado: 1 } } : {}) });
  };
  addAux('P01', 'preparacion', 180);
  if (legacy) addAux('P02', 'preparacion', 60);
  for (const item of result.principal) {
    const trial = item.id === 'K01' || (key === 'P20' && item.id === 'K06');
    if (trial) {
      const pause = item.id === 'K06' ? 30 : 0;
      append({ tipo: 'ensayo', fase: 'preparacion', id: item.id, familia: item.familia,
        posicion: item.posicion, tags: [...item.tags], repeticiones: 4,
        guiaSegundosEstimados: 30, pausaSegundos: pause,
        segundosEstimados: 30 + 16 + pause + (item.id === 'K01' ? 14 : 0) });
      guidesShown.add(item.id);
    }
    const movement = item.conteo.totalSostenerSegundos ??
      item.conteo.totalRepeticiones * (item.lateralidad === 'alternado' ? 5 : 4);
    const guide = guidesShown.has(item.id) ? 0 : 30;
    append({ ...item, tipo: 'principal', fase: 'principal', guiaSegundosEstimados: guide,
      segundosEstimados: movement + item.conteo.totalDescansoSegundos + guide +
        (item.id === 'K14' ? item.conteo.totalSostenes * 10 : 0) });
    guidesShown.add(item.id);
  }
  addAux('C01', 'cierre', legacy ? 300 : 120);
  if (!legacy) for (const id of ['C02', 'C03']) if (optional.includes(id)) addAux(id, 'cierre', 90);
  const last = result.secuencia.filter(x => x.tipo !== 'transicion').at(-1);
  if (FLOOR.has(last.posicion)) result.secuencia.push({ tipo: 'transicion', desde: last.posicion,
    hacia: 'de_pie', tags: [last.posicion, 'de_pie', 'acceso_suelo'], segundosEstimados: 30 });

  const loaded = result.principal.some(x => x.equipo === 'M1');
  const estimatedSeconds = result.secuencia.reduce((sum, block) => sum + block.segundosEstimados, 0);
  result.duracion = { objetivoMinutos: duracion,
    minutosAproximados: loaded ? null : Math.round(estimatedSeconds / 60),
    estado: loaded ? 'pendiente_manejo_y_preparacion' : 'estimacion_de_escritorio',
    parcialSegundosParaCalculo: estimatedSeconds };
  if (loaded) result.mensajes.push('Estimación completa pendiente de preparación y manejo de carga.');
  result.estado = modo === 'borrador' ? 'borrador' : 'configuracion_app';
  // Mantener false: faltan medios visuales, revisión y transiciones exactas.
  return result;
}

// Expectativas manuales, escritas aparte de las listas de prioridad.
const BASELINES = [
  ['P', 'PC', 20, ['K01', 'K06', 'K11']],
  ['P', 'M1', 20, ['K02', 'K06', 'K11']],
  ['P', 'PC', 30, ['K01', 'K03', 'K09', 'K06', 'K11']],
  ['P', 'M1', 30, ['K02', 'K03', 'K09', 'K06', 'K11']],
  ['P', 'PC', 40, ['K01', 'K03', 'K09', 'K06', 'K11', 'K14']],
  ['P', 'M1', 40, ['K02', 'K03', 'K09', 'K06', 'K11', 'K14']],
  ['I', 'PC', 20, ['K01', 'K08', 'K12']],
  ['I', 'M1', 20, ['K02', 'K05', 'K12']],
  ['I', 'PC', 30, ['K01', 'K03', 'K09', 'K08', 'K12']],
  ['I', 'M1', 30, ['K02', 'K04', 'K05', 'K09', 'K12']],
  ['I', 'PC', 40, ['K01', 'K03', 'K09', 'K08', 'K12', 'K13', 'K14']],
  ['I', 'M1', 40, ['K02', 'K04', 'K05', 'K09', 'K12', 'K13', 'K14']],
];
const input = (changes = {}) => ({ nivel: 'I', equipo: 'M1', duracion: 30,
  filtroSuperado: true, modo: 'borrador', ...changes });
const ids = result => result.principal.map(x => x.id);
const trials = result => result.secuencia.filter(x => x.tipo === 'ensayo').map(x => x.id);
const auxIds = result => result.secuencia.filter(x => x.tipo === 'auxiliar').map(x => x.id);
const byId = (result, id) => result.principal.find(x => x.id === id);

function runTests() {
  const results = [];
  function test(name, testInput, check, catalog = CATALOG) {
    try {
      const result = generateRoutine(testInput, catalog);
      check(result);
      results.push({ nombre: name, ok: true, entrada: testInput, estado: result.estado,
        principal: ids(result), ensayos: trials(result), auxiliares: auxIds(result),
        omitidos: result.omitidos, mensajes: result.mensajes, duracion: result.duracion });
    } catch (error) { results.push({ nombre: name, ok: false, error: error.message }); }
  }
  for (const [nivel, equipo, duracion, expected] of BASELINES)
    test(`Base ${nivel}${duracion}_${equipo}`, input({ nivel, equipo, duracion }),
      r => assert.deepEqual(ids(r), expected));

  test('K12 excluido: usar K11 con dosis I', input({ excluir: { ids: ['K12'] } }), r => {
    assert.deepEqual(ids(r), ['K02', 'K04', 'K05', 'K09', 'K11']);
    assert.equal(byId(r, 'K11').dosis.cantidad, 6);
    assert.equal(byId(r, 'K11').conteo.totalRepeticiones, 24);
  });
  test('K05 excluido: omitir bisagra e informar', input({ excluir: { ids: ['K05'] } }), r => {
    assert.deepEqual(ids(r), ['K02', 'K04', 'K09', 'K12']);
    assert.deepEqual(r.omitidos, ['bisagra']);
    assert.ok(r.mensajes.some(x => x.includes('bisagra')));
  });
  test('Boca arriba: retirar ambas variantes y C02', input({ excluir: { tags: ['boca_arriba'] } }), r => {
    assert.deepEqual(ids(r), ['K02', 'K04', 'K05', 'K09']);
    assert.ok(!auxIds(r).includes('C02'));
    assert.ok(auxIds(r).includes('C03'));
    assert.ok(r.secuencia.every(x => !x.tags.includes('boca_arriba')));
  });
  test('Todos los principales excluidos: no sesión auxiliar', input({ excluir: { ids: Object.keys(CATALOG) } }), r => {
    assert.equal(r.estado, 'sin_principal'); assert.deepEqual(r.secuencia, []);
  });
  test('Misma entrada y configuración: mismo resultado', input(), r =>
    assert.deepEqual(r, generateRoutine(input())));
  test('Familia sentadilla: no recuperar otra variante', input({ excluir: { familias: ['sentadilla'] } }), r => {
    assert.deepEqual(ids(r), ['K04', 'K05', 'K09', 'K12']); assert.deepEqual(trials(r), []);
  });
  test('K02 excluido: K01 y su ensayo, guía una vez', input({ excluir: { ids: ['K02'] } }), r => {
    assert.equal(ids(r)[0], 'K01'); assert.deepEqual(trials(r), ['K01']);
    assert.equal(r.secuencia.filter(x => x.id === 'K01').reduce((sum, x) => sum + x.guiaSegundosEstimados, 0), 30);
  });
  test('K04 excluido: K03 tiene 8 por lado', input({ excluir: { ids: ['K04'] } }), r => {
    assert.equal(byId(r, 'K03').dosis.cantidad, 8);
    assert.equal(byId(r, 'K03').conteo.totalRepeticiones, 32);
    assert.equal(byId(r, 'K03').conteo.totalDescansoSegundos, 150);
  });
  test('Talones: variante cargada solo con equipo', input({ excluir: { ids: ['K09'] } }), r => {
    assert.equal(byId(r, 'K10').dosis.cantidad, 10); assert.equal(byId(r, 'K10').conteo.totalRepeticiones, 20);
  });
  test('Talones sin mancuerna: cupo omitido', input({ equipo: 'PC', excluir: { ids: ['K09'] } }), r => {
    assert.deepEqual(ids(r), ['K01', 'K03', 'K08', 'K12']); assert.ok(r.omitidos.includes('pantorrilla'));
  });
  test('P20: familia puente no bloquea C02', input({ nivel: 'P', equipo: 'PC', duracion: 20,
    excluir: { familias: ['puente'] } }), r => {
    assert.deepEqual(ids(r), ['K01', 'K11']); assert.deepEqual(trials(r), ['K01']);
    assert.ok(auxIds(r).includes('C02')); assert.ok(!r.secuencia.some(x => x.id === 'K06'));
  });
  test('P40: tres series no se copian a K02/K07', input({ nivel: 'P', duracion: 40,
    excluir: { ids: ['K06'] } }), r => {
    assert.deepEqual(ids(r), ['K02', 'K03', 'K09', 'K07', 'K11', 'K14']);
    assert.equal(byId(r, 'K02').dosis.series, 2); assert.equal(byId(r, 'K07').dosis.series, 2);
    assert.equal(byId(r, 'K07').dosis.cantidad, 8); assert.equal(byId(r, 'K11').dosis.series, 3);
    assert.deepEqual(trials(r), []); assert.ok(auxIds(r).includes('P02'));
  });
  test('P40 corporal: excepción de tres series en IDs previstos', input({ nivel: 'P', equipo: 'PC',
    duracion: 40 }), r => {
    assert.deepEqual(r.principal.map(x => x.dosis.series), [3, 2, 2, 3, 3, 2]);
    assert.equal(r.versionPlantilla, '0.1');
  });
  test('I40: dos series en todos los ejercicios', input({ equipo: 'PC', duracion: 40 }), r =>
    assert.deepEqual(r.principal.map(x => x.dosis.series), [2, 2, 2, 2, 2, 2, 2]));
  test('I20: sustituciones corporales usan dosis I, sin ensayo K06', input({ equipo: 'PC', duracion: 20,
    excluir: { ids: ['K08', 'K12'] } }), r => {
    assert.deepEqual(ids(r), ['K01', 'K06', 'K11']); assert.deepEqual(trials(r), ['K01']);
    assert.equal(byId(r, 'K06').dosis.cantidad, 12); assert.equal(byId(r, 'K11').dosis.cantidad, 6);
  });
  test('I40: sin bisagra ni dead bug, no reemplazo cruzado', input({ duracion: 40,
    excluir: { ids: ['K05'], familias: ['dead_bug'] } }), r => {
    assert.deepEqual(ids(r), ['K02', 'K04', 'K09', 'K13', 'K14']);
    assert.deepEqual(r.omitidos, ['bisagra', 'dead_bug']);
  });
  test('I40 corporal: boca arriba bloquea puente, dead bug y C02', input({ equipo: 'PC', duracion: 40,
    excluir: { tags: ['boca_arriba'] } }), r => {
    assert.deepEqual(ids(r), ['K01', 'K03', 'K09', 'K13', 'K14']);
    assert.ok(!auxIds(r).includes('C02')); assert.ok(auxIds(r).includes('C03'));
  });
  test('Apoyo de rodillas: no confundir con flexión de rodilla', input({ equipo: 'PC', duracion: 40,
    excluir: { tags: ['apoyo_rodillas'] } }), r => {
    assert.deepEqual(ids(r), ['K01', 'K03', 'K09', 'K08', 'K12']); assert.ok(auxIds(r).includes('C03'));
  });
  test('Acceso al suelo excluido: retirar entradas y salidas', input({ nivel: 'P', equipo: 'PC', duracion: 20,
    excluir: { tags: ['acceso_suelo'] } }), r => {
    assert.deepEqual(ids(r), ['K01']); assert.deepEqual(auxIds(r), ['P01', 'C01']);
    assert.ok(r.secuencia.every(x => !x.tags.includes('acceso_suelo')));
  });
  test('Acceso al suelo y sentadilla excluidos: cero principal', input({ nivel: 'P', equipo: 'PC', duracion: 20,
    excluir: { tags: ['acceso_suelo'], familias: ['sentadilla'] } }), r => {
    assert.equal(r.estado, 'sin_principal'); assert.deepEqual(r.secuencia, []);
  });
  test('Apoyo en manos: retirar K13 sin eliminar K14', input({ duracion: 40,
    excluir: { tags: ['apoyo_manos'] } }), r => {
    assert.ok(!ids(r).includes('K13')); assert.ok(ids(r).includes('K14'));
  });
  test('Apoyo en antebrazo: retirar K14 sin eliminar K13', input({ duracion: 40,
    excluir: { tags: ['apoyo_antebrazo'] } }), r => {
    assert.ok(!ids(r).includes('K14')); assert.ok(ids(r).includes('K13'));
  });
  test('K14: cuatro sostenes, pausas y ambos lados', input({ duracion: 40 }), r => {
    assert.deepEqual(byId(r, 'K14').conteo, { lados: 2, totalRepeticiones: null,
      totalSostenerSegundos: 60, totalSostenes: 4, totalDescansoSegundos: 120 });
    assert.equal(byId(r, 'K13').conteo.totalRepeticiones, 20);
  });
  test('P20: ensayos son volumen adicional', input({ nivel: 'P', equipo: 'PC', duracion: 20 }), r => {
    assert.deepEqual(trials(r), ['K01', 'K06']);
    assert.equal(byId(r, 'K01').conteo.totalRepeticiones, 16);
    assert.equal(byId(r, 'K06').conteo.totalRepeticiones, 20);
    assert.equal(r.secuencia.filter(x => x.tipo === 'ensayo').reduce((sum, x) => sum + x.repeticiones, 0), 8);
  });
  test('Cierre sin estiramientos: retirar guías y nueva bajada', input({ equipo: 'PC', cierreOpcional: [] }), r => {
    assert.ok(!auxIds(r).includes('C02')); assert.ok(!auxIds(r).includes('C03'));
    const startClose = r.secuencia.findIndex(x => x.id === 'C01');
    assert.equal(r.secuencia.slice(startClose).length, 1);
    assert.ok(r.duracion.minutosAproximados < generateRoutine(input({ equipo: 'PC' })).duracion.minutosAproximados);
  });
  test('C02 excluido individualmente: C03 permanece', input({ excluir: { ids: ['C02'] } }), r => {
    assert.ok(!auxIds(r).includes('C02')); assert.ok(auxIds(r).includes('C03'));
  });
  test('Entrada de app: borradores no se habilitan', input({ modo: 'app' }), r => {
    assert.equal(r.estado, 'sin_principal'); assert.equal(r.ejecutable, false); assert.deepEqual(r.secuencia, []);
  });
  test('P20 en modo app: tampoco habilitar borradores', input({ nivel: 'P', equipo: 'PC', duracion: 20,
    modo: 'app' }), r => { assert.equal(r.estado, 'sin_principal'); assert.deepEqual(r.secuencia, []); });
  test('Modo omitido: se exige contenido habilitado', input({ modo: undefined }), r => {
    assert.equal(r.estado, 'sin_principal'); assert.equal(r.ejecutable, false);
  });
  test('Filtro previo negativo: no intentar sustituciones', input({ filtroSuperado: false }), r => {
    assert.equal(r.estado, 'filtro_no_superado'); assert.deepEqual(r.principal, []); assert.deepEqual(r.omitidos, []);
  });
  test('Filtro previo ausente: no generar', input({ filtroSuperado: undefined }), r =>
    assert.equal(r.estado, 'filtro_no_superado'));
  test('Duración sin plantilla: informar pendiente', input({ duracion: 25 }), r =>
    assert.equal(r.estado, 'plantilla_pendiente'));
  test('Duración como texto: rechazar entrada ambigua', input({ duracion: '20' }), r =>
    assert.equal(r.estado, 'entrada_invalida'));
  test('Familia marcha: retirar P01 y P02, conservar caminata', input({ nivel: 'P', duracion: 30,
    excluir: { familias: ['marcha'] } }), r => {
    assert.ok(!auxIds(r).includes('P01')); assert.ok(!auxIds(r).includes('P02')); assert.ok(auxIds(r).includes('C01'));
  });
  test('Exclusión desconocida: no ignorarla', input({ excluir: { tags: ['diagnostico_no_interpretable'] } }), r =>
    assert.equal(r.estado, 'entrada_invalida'));
  const missingDose = structuredClone(CATALOG); missingDose.K12.dosis.I = null;
  test('Dosis ausente: intentar siguiente opción', input(), r =>
    assert.deepEqual(ids(r), ['K02', 'K04', 'K05', 'K09', 'K11']), missingDose);
  test('Carga: duración completa sigue pendiente', input(), r => {
    assert.equal(r.duracion.minutosAproximados, null);
    assert.equal(r.duracion.estado, 'pendiente_manejo_y_preparacion');
  });
  const snapshot = JSON.stringify(CATALOG);
  test('Generar no cambia catálogo ni habilitación', input({ nivel: 'P', duracion: 40 }), () =>
    assert.equal(JSON.stringify(CATALOG), snapshot));

  // Barrido de exclusiones simples en los 12 perfiles, sin pretender exhaustividad.
  const grid = [];
  const singleExclusions = [
    ...Object.keys(CATALOG).map(id => ({ ids: [id] })),
    ...Object.keys(FAMILIES).map(family => ({ familias: [family] })),
    ...['boca_arriba', 'acceso_suelo', 'apoyo_manos', 'apoyo_rodillas', 'apoyo_antebrazo',
      'sujecion_muslo', 'sujecion_pie', 'de_pie'].map(tag => ({ tags: [tag] })),
  ];
  for (const [nivel, equipo, duracion] of BASELINES) for (const exclusion of singleExclusions) {
    const data = input({ nivel, equipo, duracion, excluir: exclusion });
    try {
      const r = generateRoutine(data);
      assert.deepEqual(r, generateRoutine(data));
      assert.equal(new Set(r.principal.map(x => x.familia)).size, r.principal.length);
      for (const item of r.principal) {
        assert.ok(!(exclusion.ids ?? []).includes(item.id));
        assert.ok(!(exclusion.familias ?? []).includes(item.familia));
        if (nivel === 'P') assert.equal(CATALOG[item.id].nivelMinimo, 'P');
        if (equipo === 'PC') assert.equal(item.equipo, 'PC');
      }
      for (const block of r.secuencia) {
        assert.ok(!(exclusion.ids ?? []).includes(block.id));
        assert.ok(!(exclusion.familias ?? []).includes(block.familia));
        assert.ok(!(exclusion.tags ?? []).some(tag => block.tags.includes(tag)));
      }
      if (!r.principal.length) assert.deepEqual(r.secuencia, []);
      grid.push({ entrada: data, ok: true, principal: ids(r), omitidos: r.omitidos });
    } catch (error) { grid.push({ entrada: data, ok: false, error: error.message }); }
  }
  return { version: VERSION, fecha: '2026-10-02', modo: 'simulacion_de_escritorio',
    resumen: { casosEspecificos: results.length, casosEspecificosCorrectos: results.filter(x => x.ok).length,
      combinacionesBarrido: grid.length, combinacionesCorrectas: grid.filter(x => x.ok).length },
    casos: results, barrido: grid };
}

module.exports = { generateRoutine, runTests, CATALOG, TEMPLATE_ORDERS, VERSION };
if (require.main === module) {
  const report = runTests();
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.resumen, null, 2));
  const failures = [...report.casos, ...report.barrido].filter(x => !x.ok);
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exitCode = failures.length ? 1 : 0;
}
