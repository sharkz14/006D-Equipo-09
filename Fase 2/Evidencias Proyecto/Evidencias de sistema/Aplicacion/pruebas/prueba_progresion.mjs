/* Kinetia · pruebas de la regla de progresión (dos sesiones fáciles y completas seguidas → variante exigente).
 * Uso: node prueba_progresion.mjs <build_app_compilada> <carpeta_servidor>
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
const cq = require(path.resolve(buildDir, 'lib/cuestionario.js'));
const ia = require(path.resolve(buildDir, 'lib/ia/rutina-ia.js'));
const srv = await import(pathToFileURL(path.resolve(servidorDir, 'kinetia-ia.mjs')).href);

const resultados = []; let fallos = 0;
async function prueba(nombre, fn) {
  try { const d = await fn(); resultados.push({ nombre, ok: true, ...(d ? { detalle: d } : {}) }); }
  catch (e) { fallos += 1; resultados.push({ nombre, ok: false, error: e.message }); }
}
const BASE = { nivel: 'I', equipo: 'PC', duracion: 30, filtroSuperado: true, modo: 'borrador',
  excluir: { ids: [], familias: [], tags: [] } };
const PERFIL = { edad: 30, pesoKg: 60, estaturaCm: 165, nivel: 'I' };
const AHORA = new Date(2026, 9, 30, 18, 0);

// Sesión con K06 y K11 (variantes básicas); `cambios` ajusta esfuerzo, ejercicios, etc.
function sesion(diasAtras, esfuerzo, cambios = {}) {
  const ejercicios = [['K01', 2], ['K03', 2], ['K09', 2], ['K06', 2], ['K11', 2]].map(([id, s]) => ({ id, series: s, hechas: s }));
  const base = { fecha: new Date(2026, 9, 30 - diasAtras, 10).toISOString(), plantilla: 'I30_PC', nivel: 'I', duracionMin: 30,
    origen: 'ia', ejercicios, completada: true, detenidaPorDolor: false, esfuerzo, dolor: false };
  return ses.validarRegistro({ ...base, ...cambios, ejercicios: cambios.ejercicios ?? ejercicios });
}
const ids = (avances) => avances.map((a) => a.exigente);

await prueba('Dos fáciles y completas seguidas → avanzan puente y dead bug', () => {
  assert.deepStrictEqual(ids(ses.progresionesListas([sesion(0, 'facil'), sesion(1, 'facil')], AHORA)), ['K08', 'K12']);
  assert.deepStrictEqual(ids(ses.progresionesListas([sesion(0, 'facil'), sesion(0, 'facil'), sesion(2, 'dificil')], AHORA)), ['K08', 'K12']);
  assert.strictEqual(ses.rachaFacil([sesion(0, 'facil'), sesion(1, 'facil'), sesion(2, 'adecuada'), sesion(3, 'facil')]), 2);
});

await prueba('Aviso previo: con una sola fácil (tras otra que no lo fue) se anuncia el avance siguiente', () => {
  // Caso real de Momo: adecuada → fácil → adecuada → fácil. Falta una fácil más.
  const momo = [sesion(0, 'facil'), sesion(0, 'adecuada'), sesion(0, 'facil'), sesion(0, 'adecuada')];
  assert.deepStrictEqual(ses.progresionesListas(momo, AHORA), []);
  assert.deepStrictEqual(ids(ses.progresionesProximas(momo, AHORA)), ['K08', 'K12']);
  assert.deepStrictEqual(ids(ses.progresionesListas([sesion(0, 'facil'), ...momo], AHORA)), ['K08', 'K12']);
  // Con la racha ya en 2 no hay «próximo» (el avance es hoy); sin sesión fácil reciente, tampoco.
  assert.deepStrictEqual(ses.progresionesProximas([sesion(0, 'facil'), sesion(1, 'facil')], AHORA), []);
  assert.deepStrictEqual(ses.progresionesProximas([sesion(0, 'adecuada')], AHORA), []);
  return 'adecuada → fácil → adecuada → fácil: «Si la próxima también te resulta fácil, avanzas…»';
});

await prueba('No avanza: una sola fácil, adecuada, difícil, molestias, incompleta o antigua', () => {
  const casos = {
    'una sola sesión': [sesion(0, 'facil')],
    'la última adecuada': [sesion(0, 'adecuada'), sesion(1, 'facil')],
    'la anterior difícil': [sesion(0, 'facil'), sesion(1, 'dificil')],
    'con molestias': [sesion(0, 'facil', { dolor: true }), sesion(1, 'facil')],
    'detenida': [sesion(0, 'facil'), sesion(1, 'facil', { detenidaPorDolor: true, completada: false, dolor: true })],
    'incompleta': [sesion(0, 'facil', { completada: false }), sesion(1, 'facil')],
    'de hace más de 30 días': [sesion(0, 'facil'), sesion(31, 'facil')],
    'sin historial': [],
  };
  for (const [nombre, recientes] of Object.entries(casos)) {
    assert.deepStrictEqual(ses.progresionesListas(recientes, AHORA), [], nombre);
  }
  return Object.keys(casos).join(' · ');
});

await prueba('Solo avanza la familia cuya variante básica se completó en ambas sesiones', () => {
  const sinPuente = (s) => s.ejercicios.map((e) => (e.id === 'K06' ? { ...e, hechas: 1 } : e));
  const a = sesion(0, 'facil'); const b = sesion(1, 'facil');
  assert.deepStrictEqual(ids(ses.progresionesListas([{ ...a, ejercicios: sinPuente(a) }, b], AHORA)), ['K12']);
  // Si la última ya fue con la variante exigente, no se vuelve a «avanzar».
  const conK08 = { ...a, ejercicios: a.ejercicios.map((e) => (e.id === 'K06' ? { ...e, id: 'K08' } : e)) };
  assert.deepStrictEqual(ids(ses.progresionesListas([conK08, b], AHORA)), ['K12']);
});

await prueba('Solicitud a la IA: solo la variante exigente en el cupo, con el antecedente «progresion»', () => {
  const avances = ses.progresionesListas([sesion(0, 'facil'), sesion(1, 'facil')], AHORA);
  const completo = { estilos: ['hip_hop', 'girly', 'kpop'], fuerza: '6_meses_o_mas', mancuerna: false, duracion: 30,
    puenteUnaPierna: 'no_se', deadBugExtension: 'nunca', coreSuelo: 'no', evitar: [] };
  const s = ia.prepararSolicitudIA(BASE, PERFIL, { ...cq.antecedentesParaIA(completo),
    ultima_sesion: ses.antecedentesUltimaSesion(sesion(0, 'facil'), AHORA) }, avances);
  srv.validarSolicitud(s);
  assert.deepStrictEqual(s.cupos.find((c) => c.familia === 'puente').candidatos.map((k) => k.id), ['K08']);
  assert.deepStrictEqual(s.cupos.find((c) => c.familia === 'dead_bug').candidatos.map((k) => k.id), ['K12']);
  assert.deepStrictEqual(s.antecedentes.progresion, { motivo: '2 sesiones seguidas fáciles y completas',
    puente: 'pasa al puente a una pierna', dead_bug: 'pasa al dead bug con extensión' });
  assert.strictEqual(Object.keys(s.antecedentes).length, 4);
  // Sin avances, el cupo ofrece las dos variantes como siempre.
  assert.deepStrictEqual(ia.prepararSolicitudIA(BASE, PERFIL).cupos.find((c) => c.familia === 'puente').candidatos.map((k) => k.id), ['K08', 'K06']);
});

await prueba('Avance que no cabe: principiante, «evitar una pierna» o sin el cupo', () => {
  const avances = ses.progresionesListas([sesion(0, 'facil'), sesion(1, 'facil')], AHORA);
  assert.deepStrictEqual(ids(ia.avancesAplicables({ ...BASE, nivel: 'P' }, PERFIL, avances)), []);
  assert.deepStrictEqual(ids(ia.avancesAplicables({ ...BASE, excluir: { ids: [], familias: [], tags: ['apoyo_un_pie'] } }, PERFIL, avances)), ['K12']);
  assert.deepStrictEqual(ids(ia.avancesAplicables({ ...BASE, equipo: 'M1', duracion: 20 }, PERFIL, avances)), ['K12']);
});

await prueba('De punta a punta: la rutina trae K08 y K12, con los límites por peso aplicados', async () => {
  const avances = ses.progresionesListas([sesion(0, 'facil'), sesion(1, 'facil')], AHORA);
  let cuerpo;
  const claude = async (_u, init) => {
    cuerpo = JSON.parse(init.body);
    const props = cuerpo.output_config.format.schema.properties.cupos.properties; const cupos = {};
    for (const [f, p] of Object.entries(props)) cupos[f] = { ejercicio: p.properties.ejercicio.enum[0], series: 2,
      intensidad: p.properties.intensidad.enum[0], descanso: 'estandar', motivo: 'ok' };
    return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ resumen: 'r', cupos }) }],
      stop_reason: 'end_turn' }), { status: 200 });
  };
  const fetchImpl = async (u, init) => srv.manejarSolicitud(new Request(u, init), { ANTHROPIC_API_KEY: 'k' }, claude);
  const r = await ia.generarRutinaConIA(BASE, { ...PERFIL, pesoKg: 85 }, { url: 'http://x', fetchImpl }, {}, avances);
  assert.strictEqual(r.origen, 'ia', r.aviso);
  assert.deepStrictEqual(ids(r.avances), ['K08', 'K12']);
  const puente = r.rutina.principal.find((x) => x.familia === 'puente');
  assert.deepStrictEqual([puente.id, puente.dosis.cantidad], ['K08', 5]);   // IMC 31: tope «reducida» en K08 (6 → 5)
  assert.strictEqual(r.rutina.principal.find((x) => x.familia === 'dead_bug').id, 'K12');
  assert.ok(cuerpo.messages[0].content.includes('"progresion"'));
  assert.ok(cuerpo.system.includes('progresion') && cuerpo.system.includes('dosis prudente'));
  return 'puente → K08 (5 por lado por el límite de peso) · dead bug → K12';
});

await prueba('Si la IA falla, la rutina habitual no marca avances', async () => {
  const avances = ses.progresionesListas([sesion(0, 'facil'), sesion(1, 'facil')], AHORA);
  const r = await ia.generarRutinaConIA(BASE, PERFIL, { url: 'http://x', fetchImpl: async () => { throw new TypeError('x'); } }, {}, avances);
  assert.strictEqual(r.origen, 'reglas');
  assert.ok(!('avances' in r));
});

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(dir, 'resultado_prueba_progresion.json'),
  JSON.stringify({ fecha: new Date().toISOString(), pruebas: resultados.length, fallos, resultados }, null, 2) + '\n');
for (const r of resultados) console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.nombre}${r.error ? ` → ${r.error}` : ''}`);
for (const r of resultados) if (r.ok && r.detalle) console.log(`     ${[].concat(r.detalle).join('\n     ')}`);
console.log(fallos === 0 ? `\n${resultados.length}/${resultados.length} pruebas correctas.` : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos ? 1 : 0);
