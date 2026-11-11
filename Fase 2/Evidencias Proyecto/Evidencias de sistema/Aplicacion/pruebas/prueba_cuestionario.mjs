/* Kinetia · pruebas del cuestionario inicial (lógica pura) y su conexión con el motor y la IA.
 * Uso: node prueba_cuestionario.mjs <build_app_compilada> <carpeta_servidor>
 */
import assert from 'node:assert';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const [buildDir, servidorDir] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const gen = require(path.resolve(buildDir, 'lib/generador.js'));
const cq = require(path.resolve(buildDir, 'lib/cuestionario.js'));
const ia = require(path.resolve(buildDir, 'lib/ia/rutina-ia.js'));
const srv = await import(pathToFileURL(path.resolve(servidorDir, 'kinetia-ia.mjs')).href);

const resultados = []; let fallos = 0;
async function prueba(nombre, fn) {
  try { const d = await fn(); resultados.push({ nombre, ok: true, ...(d ? { detalle: d } : {}) }); }
  catch (e) { fallos += 1; resultados.push({ nombre, ok: false, error: e.message }); }
}
const BASE = { nivel: 'I', equipo: 'PC', duracion: 20, filtroSuperado: true, modo: 'borrador', excluir: { ids: [], familias: [], tags: [] } };
const COMPLETO = { estilos: ['hip_hop', 'girly', 'kpop', 'vogue', 'otro'], fuerza: '6_meses_o_mas', mancuerna: true,
  duracion: 30, puenteUnaPierna: 'lo_hice_hace_mucho', deadBugExtension: 'me_cuesta', coreSuelo: 'lo_deje', evitar: [] };
COMPLETO.puenteUnaPierna = 'hace_mucho';
const ids = (r) => r.principal.map((x) => x.id);

await prueba('Nivel sugerido y preguntas adaptativas', () => {
  assert.strictEqual(cq.nivelSugerido('no'), 'P');
  assert.strictEqual(cq.nivelSugerido('menos_6_meses'), 'P');
  assert.strictEqual(cq.nivelSugerido('6_meses_o_mas'), 'I');
  assert.strictEqual(cq.preguntaVariantesIntermedias('no'), false);
  assert.strictEqual(cq.preguntaVariantesIntermedias('6_meses_o_mas'), true);
  return 'Principiantes responden 2 preguntas menos (K08 y K12 no aplican a su nivel).';
});

await prueba('Cada opción de «evitar» es una característica que el motor conoce', () => {
  for (const tag of cq.etiquetasEvitar(['suelo', 'rodillas', 'una_pierna'])) assert.ok(gen.KNOWN_TAGS.has(tag), tag);
});

await prueba('«Evitar» quita exactamente lo que dice', () => {
  const con = (tags, extra = {}) => gen.generateRoutine({ ...BASE, ...extra, excluir: { ids: [], familias: [], tags } });
  assert.deepStrictEqual(ids(con([])), ['K01', 'K08', 'K12']);
  const suelo = con(cq.etiquetasEvitar(['suelo']));
  assert.deepStrictEqual(ids(suelo), ['K01']);
  assert.ok(suelo.secuencia.every((b) => !['boca_arriba', 'cuadrupedia', 'lateral'].includes(b.posicion ?? b.hacia)));
  assert.deepStrictEqual(ids(con(cq.etiquetasEvitar(['una_pierna']))), ['K01', 'K06', 'K12']);
  const rodillas = con(cq.etiquetasEvitar(['rodillas']), { duracion: 40 });
  assert.ok(!ids(rodillas).some((id) => ['K13', 'K14'].includes(id)), ids(rodillas).join(','));
  return `Suelo → solo ${ids(suelo).join(', ')} · una pierna → K06 en vez de K08 · rodillas (40 min) → sin K13 ni K14`;
});

await prueba('Sesión inicial desde las respuestas', () => {
  assert.strictEqual(cq.equipoInicial({ mancuerna: true }), 'M1');
  assert.strictEqual(cq.equipoInicial({ mancuerna: false }), 'PC');
});

await prueba('Lo enviado a la IA pasa la validación del servidor en el peor caso', () => {
  const ant = cq.antecedentesParaIA(COMPLETO);
  const s = ia.prepararSolicitudIA({ ...BASE, equipo: 'M1', duracion: 30 }, { edad: 30, pesoKg: 70, estaturaCm: 170, nivel: 'I' }, ant);
  srv.validarSolicitud(s);
  for (const grupo of Object.values(s.antecedentes)) for (const v of Object.values(grupo)) assert.ok(v.length <= 40, v);
  return JSON.stringify(s.antecedentes);
});

await prueba('Los estilos se envían en el orden de la lista, no en el orden en que se tocaron', () => {
  const ant = cq.antecedentesParaIA({ ...COMPLETO, estilos: ['kpop', 'girly', 'hip_hop'] });
  assert.strictEqual(ant.baile.estilos, 'Hip hop, Girly, K-pop');
});

await prueba('Sin preguntas de K08/K12 (principiante) no se envían como desconocidas inventadas', () => {
  const ant = cq.antecedentesParaIA({ ...COMPLETO, fuerza: 'no', puenteUnaPierna: null, deadBugExtension: null, estilos: [] });
  assert.deepStrictEqual(Object.keys(ant), ['experiencia']);
  assert.deepStrictEqual(Object.keys(ant.experiencia).sort(), ['core_en_suelo', 'entrena_fuerza']);
});

await prueba('validarRespuestas rechaza datos incompletos o inventados', () => {
  const malos = [
    { ...COMPLETO, fuerza: 'mucho' }, { ...COMPLETO, duracion: 25 }, { ...COMPLETO, estilos: ['salsa'] },
    { ...COMPLETO, estilos: ['kpop', 'kpop'] }, { ...COMPLETO, evitar: ['saltos'] }, { ...COMPLETO, mancuerna: 'si' },
    { ...COMPLETO, puenteUnaPierna: 'bien' }, { ...COMPLETO, coreSuelo: undefined }, null,
  ];
  for (const m of malos) assert.throws(() => cq.validarRespuestas(m), JSON.stringify(m));
  assert.deepStrictEqual(cq.validarRespuestas(COMPLETO), COMPLETO);
});

await prueba('De punta a punta: las respuestas y el estilo llegan al mensaje de Claude', async () => {
  let mensaje = ''; let sistema = '';
  const claude = async (_u, init) => {
    const body = JSON.parse(init.body); mensaje = body.messages[0].content; sistema = body.system;
    const props = body.output_config.format.schema.properties.cupos.properties; const cupos = {};
    for (const [f, p] of Object.entries(props)) cupos[f] = { ejercicio: p.properties.ejercicio.enum[0], series: 1,
      intensidad: 'completa', descanso: 'estandar', motivo: 'ok' };
    return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ resumen: 'r', cupos }) }],
      stop_reason: 'end_turn' }), { status: 200 });
  };
  const fetchServidor = async (url, init) => srv.manejarSolicitud(new Request(url, init), { ANTHROPIC_API_KEY: 'k' }, claude);
  const r = await ia.generarRutinaConIA({ ...BASE, excluir: { ids: [], familias: [], tags: cq.etiquetasEvitar(['una_pierna']) } },
    { edad: 27, pesoKg: 62, estaturaCm: 165, nivel: 'I' }, { url: 'http://x', fetchImpl: fetchServidor },
    cq.antecedentesParaIA(COMPLETO));
  assert.strictEqual(r.origen, 'ia', r.aviso);
  assert.ok(mensaje.includes('Hip hop, Girly, K-pop, Vogue, otro'), mensaje);
  assert.ok(mensaje.includes('me cuesta'));
  assert.ok(!mensaje.includes('K08 Puente unilateral'), 'K08 no debía ofrecerse al evitar «una pierna»');
  assert.ok(sistema.includes('sin prometer mejoras'));
  return `Rutina IA: ${ids(r.rutina).join(', ')}`;
});

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(dir, 'resultado_prueba_cuestionario.json'),
  JSON.stringify({ fecha: new Date().toISOString(), pruebas: resultados.length, fallos, resultados }, null, 2) + '\n');
for (const r of resultados) console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.nombre}${r.error ? ` → ${r.error}` : ''}`);
for (const r of resultados) if (r.ok && r.detalle) console.log(`     ${[].concat(r.detalle).join('\n     ')}`);
console.log(fallos === 0 ? `\n${resultados.length}/${resultados.length} pruebas correctas.` : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos ? 1 : 0);
