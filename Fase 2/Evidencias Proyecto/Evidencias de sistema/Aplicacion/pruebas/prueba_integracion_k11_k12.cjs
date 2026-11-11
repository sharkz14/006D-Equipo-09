/* Kinetia · prueba de la integración K11/K12 en el generador (sin dependencias).
 * Uso: node prueba_integracion_k11_k12.cjs <build_nuevo> <build_original> <paquete_integracion>
 *   build_*: carpetas con lib/generador.js compilado desde src (tsc, commonjs).
 */
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const [nuevoDir, originalDir, paqueteDir] = process.argv.slice(2);
const nuevo = require(path.resolve(nuevoDir, 'lib/generador.js'));
const original = require(path.resolve(originalDir, 'lib/generador.js'));
const formulario = require(path.resolve(nuevoDir, 'lib/ia/formulario-dead-bug.js'));
const leer = (f) => JSON.parse(fs.readFileSync(path.join(paqueteDir, f), 'utf8').replace(/^﻿/, ''));

const resultados = [];
let fallos = 0;
function prueba(nombre, fn) {
  try { const detalle = fn(); resultados.push({ nombre, ok: true, ...(detalle ? { detalle } : {}) }); }
  catch (e) { fallos += 1; resultados.push({ nombre, ok: false, error: e.message }); }
}

const BASE = { nivel: 'I', equipo: 'PC', duracion: 20, filtroSuperado: true, modo: 'borrador',
  excluir: { ids: [], familias: [], tags: [] } };
const deadBug = (r) => r.principal.find((x) => x.familia === 'dead_bug');

// 1. Las 192 combinaciones de la referencia Python, pasando por el generador completo.
prueba('192 combinaciones de referencia Python a través del generador', () => {
  const ref = leer('pruebas/referencia_python.json').combinaciones;
  let admitidas = 0; let rechazadas = 0;
  for (const c of ref) {
    const r = nuevo.generateRoutine({ ...BASE, deadBugIA: { entradas: c.entradas } });
    const db = deadBug(r);
    assert.ok(db, 'falta el cupo dead_bug');
    if (c.esperadoPython.estado === 'seleccion_ia') {
      admitidas += 1;
      assert.strictEqual(db.seleccion.origen, 'modelo', JSON.stringify(c.entradas));
      assert.strictEqual(db.id, c.esperadoPython.ejercicioId, JSON.stringify(c.entradas));
      assert.strictEqual(db.seleccion.modeloId, 'K11_K12_v0.4');
      assert.deepStrictEqual(db.seleccion.recorrido.map((p) => [p.nodo, p.columna, p.rama]),
        c.esperadoPython.traza.ruta.map((p) => [p.nodo, p.variable, p.rama]));
    } else {
      rechazadas += 1;
      assert.strictEqual(db.seleccion.origen, 'regla');
      assert.strictEqual(db.id, 'K12', 'el respaldo debe conservar el orden de prioridad');
      assert.match(db.seleccion.motivo, /no son coherentes/);
    }
  }
  assert.strictEqual(admitidas, 41); assert.strictEqual(rechazadas, 151);
  return `41 admitidas con igual selección y recorrido; 151 rechazadas con respaldo por reglas`;
});

// 2. Casos de la demostración del paquete.
prueba('Casos demo DB03, DB05, RDB01 y RDB01_A', () => {
  const salida = [];
  for (const c of leer('casos_demo.json')) {
    const r = nuevo.generateRoutine({ ...BASE, deadBugIA: { entradas: c.entradas } });
    const db = deadBug(r);
    assert.strictEqual(db.id, c.esperadoPython.seleccion, c.casoId);
    assert.strictEqual(db.id, c.preferenciaRevisada, c.casoId);
    salida.push(`${c.casoId} → ${db.id}: ${db.seleccion.motivo}`);
  }
  return salida;
});

// 3. La dosis montada corresponde al ejercicio elegido.
prueba('La rutina monta la dosis del ejercicio realmente elegido', () => {
  const k11 = { experiencia_k12: 'nunca', control_k12: 'no_aplica', historia_core: 'sin_practica_habitual', antiguedad_k12: 'no_aplica' };
  const k12 = { experiencia_k12: 'practico', control_k12: 'controlado', historia_core: 'desconocida', antiguedad_k12: 'un_mes' };
  for (const [entradas, id, cantidad] of [[k11, 'K11', 6], [k12, 'K12', 5]]) {
    const r = nuevo.generateRoutine({ ...BASE, deadBugIA: { entradas } });
    const db = deadBug(r);
    assert.strictEqual(db.id, id);
    assert.deepStrictEqual([db.dosis.series, db.dosis.cantidad, db.dosis.descansoEntreSeries], [2, cantidad, 60]);
    const bloque = r.secuencia.find((b) => b.tipo === 'principal' && b.familia === 'dead_bug');
    assert.strictEqual(bloque.id, id);
    assert.strictEqual(r.principal.length, 3);
  }
});

// 4. Fuera de contrato: el motor conserva su comportamiento y registra el motivo.
prueba('Fuera de contrato se usa el respaldo por reglas (o se bloquea como antes)', () => {
  const entradas = { experiencia_k12: 'nunca', control_k12: 'no_aplica', historia_core: 'sin_practica_habitual', antiguedad_k12: 'no_aplica' };
  const casos = [
    ['Principiante 20 min', { nivel: 'P' }, (r) => { assert.strictEqual(deadBug(r).seleccion.origen, 'opcion_unica'); assert.strictEqual(deadBug(r).id, 'K11'); }],
    ['Intermedio 30 min', { duracion: 30 }, (r) => { assert.strictEqual(deadBug(r).seleccion.origen, 'regla'); assert.match(deadBug(r).seleccion.motivo, /fuera del piloto K11\/K12/); }],
    ['Intermedio 40 min', { duracion: 40 }, (r) => { assert.match(deadBug(r).seleccion.motivo, /fuera del piloto K11\/K12/); }],
    ['Una mancuerna', { equipo: 'M1' }, (r) => { assert.match(deadBug(r).seleccion.motivo, /fuera del piloto K11\/K12/); }],
    ['Exclusión de otra familia', { excluir: { ids: [], familias: ['sentadilla'], tags: [] } }, (r) => { assert.match(deadBug(r).seleccion.motivo, /fuera del piloto K11\/K12/); }],
    ['Exclusión que retira K12', { excluir: { ids: [], familias: [], tags: ['piernas_sin_apoyo'] } }, (r) => { assert.strictEqual(deadBug(r).id, 'K11'); assert.strictEqual(deadBug(r).seleccion.origen, 'opcion_unica'); }],
    ['Exclusión de la familia dead bug', { excluir: { ids: [], familias: ['dead_bug'], tags: [] } }, (r) => { assert.ok(!deadBug(r)); assert.ok(r.omitidos.includes('dead_bug')); }],
    ['Filtro no superado', { filtroSuperado: false }, (r) => { assert.strictEqual(r.estado, 'filtro_no_superado'); assert.strictEqual(r.principal.length, 0); }],
    ['Modo app (sin contenido habilitado)', { modo: 'app' }, (r) => { assert.strictEqual(r.estado, 'sin_principal'); }],
  ];
  for (const [nombre, cambio, comprobar] of casos) {
    const r = nuevo.generateRoutine({ ...BASE, ...cambio, deadBugIA: { entradas } });
    try { comprobar(r); } catch (e) { throw new Error(`${nombre}: ${e.message}`); }
  }
  const sin = deadBug(nuevo.generateRoutine({ ...BASE }));
  assert.match(sin.seleccion.motivo, /Sin respuestas del piloto K11\/K12/);
  const otra = deadBug(nuevo.generateRoutine({ ...BASE, deadBugIA: { fueraDeEsquema: 'fecha_no_contemplada' } }));
  assert.strictEqual(otra.seleccion.origen, 'regla'); assert.match(otra.seleccion.motivo, /fecha indicada/);
  return casos.map((c) => c[0]).concat(['Sin respuestas', 'Fecha no contemplada']);
});

// 5. Sin respuestas de dead bug, la rutina es idéntica a la original (incluido K06/K08).
prueba('Regresión: sin respuestas K11/K12 todo coincide con el generador original', () => {
  const normalizar = (r) => {
    const copia = JSON.parse(JSON.stringify(r));
    delete copia.version;
    const limpiar = (x) => { if (x.familia === 'dead_bug' && x.seleccion) delete x.seleccion.motivo; };
    copia.principal.forEach(limpiar); copia.secuencia.forEach(limpiar);
    return copia;
  };
  const exclusiones = [{ ids: [], familias: [], tags: [] }];
  for (const id of Object.keys(nuevo.CATALOG)) exclusiones.push({ ids: [id], familias: [], tags: [] });
  for (const f of Object.keys(nuevo.FAMILIES)) exclusiones.push({ ids: [], familias: [f], tags: [] });
  for (const t of ['boca_arriba', 'acceso_suelo', 'apoyo_manos', 'apoyo_rodillas', 'apoyo_antebrazo', 'sujecion_muslo', 'sujecion_pie', 'de_pie'])
    exclusiones.push({ ids: [], familias: [], tags: [t] });
  const exp = ['nunca', 'alguna_vez', 'habitual', 'desconocida'];
  const rec = ['menos_3_meses', 'entre_3_y_12_meses', 'mas_12_meses', 'desconocida'];
  const fin = ['con_margen', 'justo', 'paro_antes_por_esfuerzo', 'desconocido'];
  const puentes = [undefined, { entradas: { experiencia_k08: 'nunca', recencia_k08: 'no_aplica', fin_ultima_k08: 'no_aplica' }, dosisPrevia: 'no_aplica' }];
  for (const e of exp.slice(1)) for (const r of rec) for (const f of fin)
    for (const dosisPrevia of ['coincide', 'otra_o_desconocida'])
      puentes.push({ entradas: { experiencia_k08: e, recencia_k08: r, fin_ultima_k08: f }, dosisPrevia });
  let comparadas = 0; let conModeloPuente = 0;
  for (const nivel of ['P', 'I']) for (const duracion of [20, 30, 40]) for (const equipo of ['PC', 'M1'])
    for (const excluir of exclusiones) for (const modo of ['borrador', 'app'])
      for (const puenteIA of (nivel === 'I' && duracion === 20 && equipo === 'PC' ? puentes : [undefined])) {
        const entrada = { nivel, duracion, equipo, filtroSuperado: true, modo, excluir, ...(puenteIA ? { puenteIA } : {}) };
        const a = normalizar(original.generateRoutine(entrada));
        const b = normalizar(nuevo.generateRoutine(entrada));
        assert.deepStrictEqual(b, a, JSON.stringify(entrada));
        comparadas += 1;
        if (b.principal.some((x) => x.familia === 'puente' && x.seleccion.origen === 'modelo')) conModeloPuente += 1;
      }
  assert.ok(conModeloPuente > 0);
  return `${comparadas} configuraciones idénticas (${conModeloPuente} con selección del modelo K06/K08)`;
});

// 6. Sustitución manual y recálculo al cambiar respuestas.
prueba('Sustitución manual conserva respuestas; cambiarlas invalida la rutina', () => {
  const entradaA = { ...BASE, deadBugIA: { entradas: { experiencia_k12: 'practico', control_k12: 'controlado', historia_core: 'desconocida', antiguedad_k12: 'un_mes' } } };
  const rutina = nuevo.generateRoutine(entradaA);
  assert.strictEqual(deadBug(rutina).id, 'K12');
  const alternativas = nuevo.getCompatibleAlternatives(entradaA, rutina, 'dead_bug');
  assert.deepStrictEqual(alternativas.map((x) => x.id), ['K11']);
  const sustituida = nuevo.replaceExercise(entradaA, rutina, 'dead_bug', 'K11');
  assert.strictEqual(deadBug(sustituida).id, 'K11');
  assert.strictEqual(deadBug(sustituida).seleccion.origen, 'manual');
  const entradaB = { ...BASE, deadBugIA: { entradas: { experiencia_k12: 'nunca', control_k12: 'no_aplica', historia_core: 'sin_practica_habitual', antiguedad_k12: 'no_aplica' } } };
  assert.throws(() => nuevo.replaceExercise(entradaB, rutina, 'dead_bug', 'K11'), /La configuración cambió/);
});

// 7. El formulario de la pantalla no inventa respuestas.
prueba('Formulario: pendientes, «no sé», fecha fuera de esquema e incoherencias', () => {
  const ev = formulario.evaluarFormularioDeadBug;
  const v = formulario.formularioDeadBugVacio();
  assert.strictEqual(ev(v).tipo, 'incompleta');
  assert.strictEqual(ev({ ...v, experiencia: 'nunca' }).tipo, 'incompleta', 'falta core');
  assert.deepStrictEqual(ev({ ...v, experiencia: 'nunca', core: 'habitual_actual' }).solicitud.entradas,
    { experiencia_k12: 'nunca', control_k12: 'no_aplica', historia_core: 'habitual_actual', antiguedad_k12: 'no_aplica' });
  assert.deepStrictEqual(ev({ ...v, experiencia: 'desconocida', core: 'desconocida' }).solicitud.entradas,
    { experiencia_k12: 'desconocida', control_k12: 'desconocido', historia_core: 'desconocida', antiguedad_k12: 'desconocida' });
  assert.strictEqual(ev({ ...v, experiencia: 'practico', core: 'desconocida', control: 'controlado' }).tipo, 'incompleta', 'falta fecha');
  assert.deepStrictEqual(ev({ ...v, experiencia: 'practico', core: 'desconocida', control: 'controlado', antiguedad: 'otra' }).solicitud,
    { fueraDeEsquema: 'fecha_no_contemplada' });
  assert.strictEqual(ev({ experiencia: 'practico', control: 'controlado', antiguedad: 'un_mes', core: 'interrumpida_mas_de_12_meses' }).tipo, 'incoherente');
});

const resumen = { fecha: new Date().toISOString(), pruebas: resultados.length, fallos, resultados };
fs.writeFileSync(path.join(__dirname, 'resultado_prueba_integracion_k11_k12.json'), JSON.stringify(resumen, null, 2) + '\n');
for (const r of resultados) console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.nombre}${r.error ? ` → ${r.error}` : ''}`);
for (const r of resultados) if (r.ok && r.detalle) console.log(`     ${Array.isArray(r.detalle) ? r.detalle.join('\n     ') : r.detalle}`);
console.log(fallos === 0 ? `\n${resultados.length}/${resultados.length} pruebas correctas.` : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
