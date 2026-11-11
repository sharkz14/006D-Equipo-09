/* Kinetia · pruebas de la sesión guiada, su registro, la migración SQLite v3 y la retroalimentación a la IA.
 * Uso: node prueba_sesion.mjs <build_app_compilada> <carpeta_servidor>
 */
import assert from 'node:assert';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const [buildDir, servidorDir] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const gen = require(path.resolve(buildDir, 'lib/generador.js'));
const ses = require(path.resolve(buildDir, 'lib/sesion.js'));
const fichas = require(path.resolve(buildDir, 'lib/fichas.js'));
const esquema = require(path.resolve(buildDir, 'lib/esquema.js'));
const cq = require(path.resolve(buildDir, 'lib/cuestionario.js'));
const ia = require(path.resolve(buildDir, 'lib/ia/rutina-ia.js'));
const srv = await import(pathToFileURL(path.resolve(servidorDir, 'kinetia-ia.mjs')).href);
const { DatabaseSync } = await import('node:sqlite');

const resultados = []; let fallos = 0;
async function prueba(nombre, fn) {
  try { const d = await fn(); resultados.push({ nombre, ok: true, ...(d ? { detalle: d } : {}) }); }
  catch (e) { fallos += 1; resultados.push({ nombre, ok: false, error: e.message }); }
}
const BASE = { nivel: 'I', equipo: 'PC', duracion: 30, filtroSuperado: true, modo: 'borrador',
  excluir: { ids: [], familias: [], tags: [] } };

const configuraciones = [];
for (const nivel of ['P', 'I']) for (const equipo of ['PC', 'M1']) for (const duracion of [20, 30, 40])
  for (const tags of [[], ['acceso_suelo'], ['apoyo_un_pie']]) for (const perfilCarga of [undefined, { edad: 70, pesoKg: 95, estaturaCm: 160 }])
    configuraciones.push({ ...BASE, nivel, equipo, duracion, excluir: { ids: [], familias: [], tags }, perfilCarga });

await prueba('Toda variante del catálogo tiene instrucciones de su ficha (K05 desde el 05-11)', () => {
  const sin = Object.keys(gen.CATALOG).filter((id) => !fichas.FICHAS[id]);
  assert.deepStrictEqual(sin, []);
  for (const f of Object.values(fichas.FICHAS)) assert.ok(f.pasos.length >= 3 && f.puntos.length === 2 && f.errores.length === 2, f.id);
  return `${Object.keys(fichas.FICHAS).length} fichas con pasos, 2 puntos técnicos y 2 errores frecuentes`;
});

await prueba('Animaciones: todo paso que puede aparecer en una sesión tiene la suya, salvo C02, y sus archivos existen (05-11)', () => {
  const app = path.resolve(servidorDir, '..');
  const datos = fs.readFileSync(path.join(app, 'src/components/animaciones-datos.ts'), 'utf8');
  const conAnimacion = [...datos.matchAll(/^ {2}([A-Z]\d{2}): \{$/gm)].map((m) => m[1]);
  for (const archivo of datos.matchAll(/require\('@\/(assets\/images\/ejercicios\/[a-z0-9]+\.(?:gif|png))'\)/g))
    assert.ok(fs.existsSync(path.join(app, archivo[1])), archivo[1]);
  const posibles = new Set(Object.keys(gen.CATALOG));
  for (const c of configuraciones) {
    const r = gen.generateRoutine(c);
    if (r.principal.length) for (const p of ses.pasosDeSesion(r)) posibles.add(p.id);
  }
  const sin = [...posibles].filter((id) => !conAnimacion.includes(id)).sort();
  assert.deepStrictEqual(sin, ['C02']);
  assert.deepStrictEqual(conAnimacion.filter((id) => !posibles.has(id)), []);
  return `${conAnimacion.length} animaciones; sin animación: ${sin.join(', ')}`;
});

await prueba('Nombres amigables: todo paso posible tiene nombre, y los ejercicios principales su indicación clave (05-11)', () => {
  const nombres = require(path.resolve(buildDir, 'lib/nombres.js'));
  const posibles = new Set(Object.keys(gen.CATALOG));
  for (const c of configuraciones) {
    const r = gen.generateRoutine(c);
    if (r.principal.length) for (const p of ses.pasosDeSesion(r)) posibles.add(p.id);
  }
  const sinNombre = [...posibles].filter((id) => !nombres.NOMBRES[id]?.nombre).sort();
  assert.deepStrictEqual(sinNombre, []);
  const sinIndicacion = Object.keys(gen.CATALOG).filter((id) => !nombres.indicacionClave(id));
  assert.deepStrictEqual(sinIndicacion, []);
  for (const id of Object.keys(gen.CATALOG)) assert.ok(/[.]$/.test(nombres.indicacionClave(id)), id);
  assert.strictEqual(nombres.nombreAmigable('X99', 'Respaldo'), 'Respaldo');
  return `${posibles.size} pasos con nombre; ${Object.keys(gen.CATALOG).length} indicaciones`;
});

await prueba('Ejercicios hechos alguna vez: cuenta solo los que tienen al menos una serie e ignora filas dañadas (05-11)', () => {
  const filas = [
    JSON.stringify([{ id: 'K01', series: 2, hechas: 2 }, { id: 'K08', series: 2, hechas: 0 }]),
    'no es JSON',
    JSON.stringify({ id: 'K03' }),
    JSON.stringify([{ id: 'K12', series: 2, hechas: 1 }, { id: 'K01', series: 2, hechas: 1 }, { hechas: 3 }]),
  ];
  assert.deepStrictEqual(ses.ejerciciosHechosDe(filas).sort(), ['K01', 'K12']);
  assert.deepStrictEqual(ses.ejerciciosHechosDe([]), []);
});

await prueba('Pasos de la sesión: cada ejercicio una vez, series y descansos iguales a la rutina (todas las plantillas, con y sin exclusiones y límites)', () => {
  let n = 0; let tramos = 0;
  for (const c of configuraciones) {
    const r = gen.generateRoutine(c);
    if (!r.principal.length) continue;
    const pasos = ses.pasosDeSesion(r);
    const principales = pasos.filter((p) => p.fase === 'principal');
    assert.deepStrictEqual(principales.map((p) => p.id), r.principal.map((x) => x.id));
    for (const x of r.principal) {
      const p = principales.find((q) => q.id === x.id);
      assert.strictEqual(p.seriesPlan, x.dosis.series);
      const fines = p.tramos.filter((t) => t.tipo === 'trabajo' && t.finDeSerie !== null).map((t) => t.finDeSerie);
      assert.deepStrictEqual(fines, Array.from({ length: x.dosis.series }, (_, i) => i + 1), x.id);
      const descanso = p.tramos.filter((t) => t.tipo === 'descanso').reduce((s, t) => s + t.segundos, 0);
      assert.strictEqual(descanso, x.conteo.totalDescansoSegundos, `${x.id} descanso`);
      const cronometrados = p.tramos.filter((t) => t.tipo === 'trabajo' && t.segundos !== null);
      assert.strictEqual(cronometrados.length > 0, x.dosis.unidad === 'segundos', x.id);
      assert.ok(p.pasos.length > 0, x.id);
      tramos += p.tramos.length;
    }
    // La prueba suave (ensayo) va antes de su ejercicio; los pasos siguen el orden de la secuencia.
    const pruebas = pasos.filter((p) => p.etiqueta === 'Prueba suave');
    assert.strictEqual(pruebas.length, r.secuencia.filter((b) => b.tipo === 'ensayo').length);
    for (const e of pruebas) {
      assert.ok(pasos.findIndex((p) => p === e) < pasos.findIndex((p) => p.fase === 'principal' && p.id === e.id));
    }
    assert.strictEqual(pasos[0].etiqueta, 'Calentamiento');
    assert.strictEqual(pasos[0].cambioPosicion, null);
    n += 1;
  }
  return `${n} rutinas · ${tramos} tramos de ejercicios principales`;
});

await prueba('Indicaciones de posición y tramos por lado', () => {
  const r = gen.generateRoutine({ ...BASE, duracion: 40 });
  const pasos = ses.pasosDeSesion(r);
  const puente = pasos.find((p) => p.fase === 'principal' && p.id.match(/K0[68]/));
  assert.match(puente.cambioPosicion, /boca arriba/);
  const k03 = pasos.find((p) => p.id === 'K03' && p.fase === 'principal');
  assert.deepStrictEqual(k03.tramos.map((t) => t.titulo), ['Serie 1 de 2 · primer lado', 'Cambia de lado', 'Serie 1 de 2 · segundo lado',
    'Descanso', 'Serie 2 de 2 · primer lado', 'Cambia de lado', 'Serie 2 de 2 · segundo lado']);
  const k14 = pasos.find((p) => p.id === 'K14');
  assert.ok(k14.tramos.filter((t) => t.tipo === 'trabajo').every((t) => t.segundos === 15));
  const marcha = pasos[0];
  assert.deepStrictEqual([marcha.id, marcha.origenInstrucciones, marcha.tramos[0].segundos], ['P01', 'kinetia', 180]);
  return pasos.map((p) => `${p.etiqueta}: ${p.nombre}`).join(' → ');
});

await prueba('Registro: completa, incompleta y detenida por dolor', () => {
  const r = gen.generateRoutine(BASE);
  const todas = Object.fromEntries(r.principal.map((x) => [x.id, x.dosis.series]));
  const ok = ses.crearRegistro(r, 'ia', todas, { detenidaPorDolor: false, esfuerzo: 'facil', dolor: false });
  assert.strictEqual(ok.completada, true);
  const parcial = ses.crearRegistro(r, 'ia', { ...todas, K09: 1, K03: 99 }, { detenidaPorDolor: false, esfuerzo: 'dificil', dolor: false });
  assert.strictEqual(parcial.completada, false);
  assert.strictEqual(parcial.ejercicios.find((e) => e.id === 'K03').hechas, 2, 'no supera las series del plan');
  const dolor = ses.crearRegistro(r, 'reglas', todas, { detenidaPorDolor: true, esfuerzo: 'adecuada', dolor: false });
  assert.deepStrictEqual([dolor.completada, dolor.dolor], [false, true]);
  for (const malo of [{ ...ok, esfuerzo: 'mucho' }, { ...ok, plantilla: 'X' }, { ...ok, ejercicios: [] },
    { ...ok, ejercicios: [{ id: 'K01', series: 2, hechas: 3 }] }, { ...ok, fecha: 'ayer' }, null]) {
    assert.throws(() => ses.validarRegistro(malo), JSON.stringify(malo));
  }
});

await prueba('Resumen para la IA: breve, válido para el servidor y con la fecha relativa', () => {
  const r = gen.generateRoutine({ ...BASE, duracion: 40 });
  const ahora = new Date(2026, 9, 30, 18, 0);
  const hace = (d) => new Date(2026, 9, 30 - d, 10, 0);
  const reg = (d, extra = {}) => ({ ...ses.crearRegistro(r, 'ia', { K01: 2 },
    { detenidaPorDolor: true, esfuerzo: 'dificil', dolor: true }, hace(d)), ...extra });
  const casos = [[0, 'hoy'], [1, 'ayer'], [5, 'hace 5 días'], [45, 'hace más de 30 días']];
  for (const [d, esperado] of casos) assert.strictEqual(ses.antecedentesUltimaSesion(reg(d), ahora).cuando, esperado);
  const ant = ses.antecedentesUltimaSesion(reg(2), ahora);
  assert.ok(Object.keys(ant).length <= 6 && Object.values(ant).every((v) => v.length <= 40), JSON.stringify(ant));
  const completo = { estilos: ['hip_hop', 'girly', 'kpop', 'vogue', 'otro'], fuerza: '6_meses_o_mas', mancuerna: true, duracion: 40,
    puenteUnaPierna: 'hace_mucho', deadBugExtension: 'me_cuesta', coreSuelo: 'lo_deje', evitar: [] };
  const s = ia.prepararSolicitudIA({ ...BASE, duracion: 40 }, { edad: 30, pesoKg: 60, estaturaCm: 165, nivel: 'I' },
    { ...cq.antecedentesParaIA(completo), ultima_sesion: ant });
  srv.validarSolicitud(s);
  assert.strictEqual(ses.textoUltimaSesion(reg(0, { completada: true, esfuerzo: 'facil' }), ahora), 'Hoy · completa · te resultó fácil');
  return JSON.stringify(ant);
});

await prueba('De punta a punta: la última sesión llega al mensaje de Claude y el prompt sabe usarla', async () => {
  const r = gen.generateRoutine(BASE);
  const registro = ses.crearRegistro(r, 'ia', { K01: 2 }, { detenidaPorDolor: false, esfuerzo: 'dificil', dolor: false });
  let cuerpo;
  const claude = async (_u, init) => {
    cuerpo = JSON.parse(init.body);
    const props = cuerpo.output_config.format.schema.properties.cupos.properties; const cupos = {};
    for (const [f, p] of Object.entries(props)) cupos[f] = { ejercicio: p.properties.ejercicio.enum[0], series: 1,
      intensidad: p.properties.intensidad.enum[0], descanso: p.properties.descanso.enum[0], motivo: 'ok' };
    return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ resumen: 'r', cupos }) }],
      stop_reason: 'end_turn' }), { status: 200 });
  };
  const res = await ia.generarRutinaConIA(BASE, { edad: 30, pesoKg: 60, estaturaCm: 165, nivel: 'I' },
    { url: 'http://x', fetchImpl: async (u, init) => srv.manejarSolicitud(new Request(u, init), { ANTHROPIC_API_KEY: 'k' }, claude) },
    { ultima_sesion: ses.antecedentesUltimaSesion(registro) });
  assert.strictEqual(res.origen, 'ia', res.aviso);
  const mensaje = cuerpo.messages[0].content;
  assert.ok(mensaje.includes('"ultima_sesion"') && mensaje.includes('difícil') && mensaje.includes('incompleta'), mensaje);
  assert.ok(cuerpo.system.includes('ultima_sesion') && cuerpo.system.includes('no pases a una variante más exigente'));
  assert.ok(cuerpo.system.includes('no uses los códigos de los ejercicios'));
  assert.ok(cuerpo.system.includes('«adecuada» no es «fácil»'));
  assert.ok(cuerpo.system.includes('«ficha», «cupo» o «tope»') && cuerpo.system.includes('no digas que agregas'));
  assert.ok(cuerpo.system.includes('no nombres estilos concretos'));
  assert.ok(cuerpo.system.includes('«No se sabe» es neutro') && !cuerpo.system.includes('Si dudas, elige la opción'));
  assert.ok(cuerpo.messages[0].content.includes('Estilos de baile: no indicó ninguno'));
  assert.strictEqual(srv.limpiarTexto('la dosis de la ficha en todos los cupos'), 'la dosis completa en todos los ejercicios');
  const adecuada = ses.antecedentesUltimaSesion({ ...registro, esfuerzo: 'adecuada' });
  assert.strictEqual(adecuada.le_resulto, 'adecuada (ni fácil ni difícil)');
});

await prueba('SQLite: migración 2 → 3 conserva perfil y respuestas; 0 → 3 y 1 → 3 también funcionan', () => {
  const ahora = new Date().toISOString();
  // Base como la dejaba la versión anterior de la app (v2).
  const db = new DatabaseSync(':memory:');
  db.exec(`${esquema.SQL_TABLA_PERFIL}\n${esquema.SQL_TABLA_CUESTIONARIO}\nPRAGMA user_version = 2;`);
  db.prepare('INSERT INTO perfil VALUES (1, ?, 30, 60, 165, ?, ?, ?)').run('Momo', 'I', ahora, ahora);
  db.prepare(`INSERT INTO cuestionario VALUES (1, '["kpop"]', 'no', 0, 20, NULL, NULL, 'no', '[]', ?)`).run(ahora);
  db.exec(esquema.MIGRACIONES[2]);
  assert.strictEqual(db.prepare('PRAGMA user_version').get().user_version, 3);
  assert.strictEqual(db.prepare('SELECT nombre FROM perfil').get().nombre, 'Momo');
  assert.strictEqual(db.prepare('SELECT estilos FROM cuestionario').get().estilos, '["kpop"]');
  // Mismo INSERT que perfil.ts (guardarSesion).
  const r = ses.crearRegistro(gen.generateRoutine(BASE), 'ia', { K01: 2 }, { detenidaPorDolor: false, esfuerzo: 'adecuada', dolor: false });
  const insertar = db.prepare(`
      INSERT INTO sesion (fecha, plantilla, nivel, duracion, origen, ejercicios, completada, detenida_por_dolor,
        esfuerzo, dolor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  insertar.run(r.fecha, r.plantilla, r.nivel, r.duracionMin, r.origen, JSON.stringify(r.ejercicios), 0, 0, r.esfuerzo, 0);
  assert.throws(() => insertar.run(r.fecha, r.plantilla, r.nivel, r.duracionMin, r.origen, '{}', 0, 0, 'mucho', 0));
  assert.throws(() => insertar.run(r.fecha, r.plantilla, 'X', 25, 'otro', '[]', 2, 0, null, 0));
  const fila = db.prepare('SELECT * FROM sesion ORDER BY id DESC LIMIT 1').get();
  assert.deepStrictEqual(JSON.parse(fila.ejercicios), r.ejercicios);
  // Borrar el perfil borra también el historial (mismo orden que eliminarPerfil).
  db.exec('DELETE FROM sesion; DELETE FROM cuestionario WHERE id = 1; DELETE FROM perfil WHERE id = 1;');
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM sesion').get().n, 0);
  for (const desde of [0, 1]) {
    const d = new DatabaseSync(':memory:');
    if (desde === 1) d.exec(`${esquema.SQL_TABLA_PERFIL}\nPRAGMA user_version = 1;`);
    d.exec(esquema.MIGRACIONES[desde]);
    assert.strictEqual(d.prepare('PRAGMA user_version').get().user_version, 3);
    assert.deepStrictEqual(d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('perfil','cuestionario','sesion') ORDER BY name").all().map((x) => x.name),
      ['cuestionario', 'perfil', 'sesion']);
  }
  assert.strictEqual(esquema.VERSION_BASE, 3);
});

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(dir, 'resultado_prueba_sesion.json'),
  JSON.stringify({ fecha: new Date().toISOString(), pruebas: resultados.length, fallos, resultados }, null, 2) + '\n');
for (const r of resultados) console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.nombre}${r.error ? ` → ${r.error}` : ''}`);
for (const r of resultados) if (r.ok && r.detalle) console.log(`     ${[].concat(r.detalle).join('\n     ')}`);
console.log(fallos === 0 ? `\n${resultados.length}/${resultados.length} pruebas correctas.` : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos ? 1 : 0);
