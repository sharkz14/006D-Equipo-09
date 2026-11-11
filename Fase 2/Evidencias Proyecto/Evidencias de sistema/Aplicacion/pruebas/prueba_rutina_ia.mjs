/* Kinetia · pruebas de la generación de rutinas con IA (sin llamar a la API real).
 * Uso: node prueba_rutina_ia.mjs <build_app_compilada> <carpeta_servidor>
 */
import assert from 'node:assert';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const [buildDir, servidorDir] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const gen = require(path.resolve(buildDir, 'lib/generador.js'));
const ia = require(path.resolve(buildDir, 'lib/ia/rutina-ia.js'));
const srv = await import(pathToFileURL(path.resolve(servidorDir, 'kinetia-ia.mjs')).href);

const resultados = [];
let fallos = 0;
async function prueba(nombre, fn) {
  try { const d = await fn(); resultados.push({ nombre, ok: true, ...(d ? { detalle: d } : {}) }); }
  catch (e) { fallos += 1; resultados.push({ nombre, ok: false, error: e.message }); }
}

const BASE = { nivel: 'I', equipo: 'PC', duracion: 20, filtroSuperado: true, modo: 'borrador',
  excluir: { ids: [], familias: [], tags: [] } };
const PERFIL = { edad: 27, pesoKg: 62, estaturaCm: 165, nivel: 'I' };
const PERFIL_MAYOR = { edad: 58, pesoKg: 90, estaturaCm: 168, nivel: 'P' };
const cupo = (r, f) => r.principal.find((x) => x.familia === f);

// Un "fetch" que pasa por el servidor real (manejarSolicitud) con el entorno indicado.
const fetchServidor = (env, fetchClaude) => async (url, init) =>
  srv.manejarSolicitud(new Request(url, init), env, fetchClaude);
// Respuesta con la forma de la API de Claude (content[].text con el JSON).
const respuestaClaude = (salida, extra = {}) => async () => new Response(JSON.stringify({
  content: [{ type: 'text', text: JSON.stringify(salida) }], stop_reason: 'end_turn', ...extra }), { status: 200 });

await prueba('La solicitud no incluye el nombre y solo trae variantes compatibles', () => {
  const s = ia.prepararSolicitudIA({ ...BASE, excluir: { ids: [], familias: [], tags: ['piernas_sin_apoyo'] } },
    { ...PERFIL, nombre: 'Karla' });
  assert.ok(!JSON.stringify(s).includes('Karla'));
  assert.deepStrictEqual(s.cupos.map((c) => [c.familia, c.candidatos.map((k) => k.id)]),
    [['sentadilla', ['K01']], ['puente', ['K08', 'K06']], ['dead_bug', ['K11']]]);
  srv.validarSolicitud(s);
  return 'Con la exclusión «piernas sin apoyo», K12 no se ofrece a la IA.';
});

await prueba('El esquema usa solo funciones admitidas y cierra las opciones por cupo', () => {
  const s = ia.prepararSolicitudIA(BASE, PERFIL);
  const esquema = srv.construirEsquema(s);
  const texto = JSON.stringify(esquema);
  for (const prohibido of ['minimum', 'maximum', 'minLength', 'maxLength', 'multipleOf', 'pattern'])
    assert.ok(!texto.includes(`"${prohibido}"`), prohibido);
  const recorrer = (n) => { if (n && typeof n === 'object') {
    if (n.type === 'object') assert.strictEqual(n.additionalProperties, false);
    Object.values(n).forEach(recorrer); } };
  recorrer(esquema);
  assert.deepStrictEqual(esquema.properties.cupos.properties.puente.properties.ejercicio.enum, ['K08', 'K06']);
  assert.deepStrictEqual(esquema.properties.cupos.properties.puente.properties.series.enum, [1, 2]);
});

await prueba('Servidor simulado → rutina generada por IA (origen «ia»)', async () => {
  const r = await ia.generarRutinaConIA(BASE, PERFIL, { url: 'http://local/ia',
    fetchImpl: fetchServidor({ KINETIA_SIMULADO: '1' }) });
  assert.strictEqual(r.origen, 'ia', r.aviso);
  assert.ok(r.rutina.principal.every((x) => x.seleccion.origen === 'ia'));
  assert.strictEqual(r.rutina.principal.length, 3);
  return r.rutina.principal.map((x) => `${x.familia}: ${x.id} ${x.dosis.series}×${x.dosis.cantidad}`).join(' · ');
});

await prueba('Respuesta con la forma de Claude: elige, ajusta la dosis a la baja y la app la monta', async () => {
  const salida = { resumen: 'Rutina gradual por ser tu primera vez con estas variantes.', cupos: {
    sentadilla: { ejercicio: 'K01', series: 2, intensidad: 'completa', descanso: 'estandar', motivo: 'Base estable.' },
    puente: { ejercicio: 'K06', series: 2, intensidad: 'reducida', descanso: 'ampliado', motivo: 'Empiezas con dos apoyos.' },
    dead_bug: { ejercicio: 'K11', series: 1, intensidad: 'minima', descanso: 'estandar', motivo: 'Primero el control.' },
  } };
  let cuerpoEnviado;
  const claude = async (url, init) => { cuerpoEnviado = JSON.parse(init.body);
    assert.strictEqual(url, 'https://api.anthropic.com/v1/messages');
    assert.strictEqual(init.headers['anthropic-version'], '2023-06-01');
    assert.strictEqual(init.headers.authorization, 'Bearer prueba');
    assert.ok(!('anthropic-workspace-id' in init.headers));
    return respuestaClaude(salida)(); };
  const r = await ia.generarRutinaConIA(BASE, PERFIL_MAYOR.nivel === 'P' ? { ...PERFIL_MAYOR, nivel: 'I' } : PERFIL_MAYOR,
    { url: 'http://local/ia', fetchImpl: fetchServidor({ ANTHROPIC_API_KEY: 'prueba' }, claude) });
  assert.strictEqual(r.origen, 'ia', r.aviso);
  assert.strictEqual(cuerpoEnviado.model, 'claude-haiku-5-5');
  assert.strictEqual(cuerpoEnviado.output_config.format.type, 'json_schema');
  assert.ok(cuerpoEnviado.messages[0].content.includes('58 años'));
  const puente = cupo(r.rutina, 'puente'); const db = cupo(r.rutina, 'dead_bug');
  assert.deepStrictEqual([puente.id, puente.dosis.series, puente.dosis.cantidad, puente.dosis.descansoEntreSeries], ['K06', 2, 9, 120]);
  assert.deepStrictEqual([db.id, db.dosis.series, db.dosis.cantidad], ['K11', 1, 3]);
  assert.strictEqual(puente.seleccion.motivo, 'Empiezas con dos apoyos.');
  const bloque = r.rutina.secuencia.find((b) => b.tipo === 'principal' && b.id === 'K06');
  assert.strictEqual(bloque.dosis.cantidad, 9);
  return 'K06 2×9 (75 % de 12) con 120 s de descanso; K11 1×3 (50 % de 6).';
});

const fallas = [
  ['Ejercicio fuera de la lista (K99)', { puente: { ejercicio: 'K99' } }],
  ['Variante de intermedio para principiante', null],
  ['Más series que la ficha', { sentadilla: { series: 3 } }],
  ['Intensidad inventada', { sentadilla: { intensidad: 'maxima' } }],
  ['Falta un cupo', 'quitar'],
  ['Motivo vacío', { dead_bug: { motivo: '   ' } }],
];
for (const [nombre, cambio] of fallas) {
  await prueba(`Rechazo: ${nombre} → rutina por reglas con aviso`, async () => {
    let entrada = BASE;
    const respuesta = { modelo: 'prueba', resumen: 'x', cupos: [
      { familia: 'sentadilla', ejercicio: 'K01', series: 2, intensidad: 'completa', descanso: 'estandar', motivo: 'a' },
      { familia: 'puente', ejercicio: 'K08', series: 2, intensidad: 'completa', descanso: 'estandar', motivo: 'b' },
      { familia: 'dead_bug', ejercicio: 'K12', series: 2, intensidad: 'completa', descanso: 'estandar', motivo: 'c' },
    ] };
    if (cambio === null) entrada = { ...BASE, nivel: 'P' };
    else if (cambio === 'quitar') respuesta.cupos.pop();
    else for (const [f, campos] of Object.entries(cambio)) Object.assign(respuesta.cupos.find((c) => c.familia === f), campos);
    const fetchFalso = async () => new Response(JSON.stringify(respuesta), { status: 200 });
    const r = await ia.generarRutinaConIA(entrada, PERFIL, { url: 'http://x', fetchImpl: fetchFalso });
    assert.strictEqual(r.origen, 'reglas');
    // El respaldo es la rutina por reglas con los topes del mismo perfil.
    assert.deepStrictEqual(r.rutina, gen.planCupos(ia.conPerfilCarga(entrada, PERFIL)).respaldo);
    assert.ok(r.rutina.principal.every((x) => x.seleccion.origen !== 'ia'));
    return r.aviso;
  });
}

await prueba('Sin configurar, servidor caído, error HTTP o demora → rutina por reglas', async () => {
  const avisos = [];
  const casos = [
    [{}, 'sin URL'],
    [{ url: 'http://x', fetchImpl: async () => { throw new TypeError('Network request failed'); } }, 'sin conexión'],
    [{ url: 'http://x', fetchImpl: async () => new Response('{"error":"x"}', { status: 502 }) }, 'HTTP 502'],
    [{ url: 'http://x', fetchImpl: async () => new Response('no es json', { status: 200 }) }, 'JSON roto'],
    [{ url: 'http://x', timeoutMs: 50, fetchImpl: (u, init) => new Promise((_, rej) =>
      init.signal.addEventListener('abort', () => rej(new Error('abort')))) }, 'demora'],
  ];
  for (const [op, nombre] of casos) {
    const r = await ia.generarRutinaConIA(BASE, PERFIL, op);
    assert.strictEqual(r.origen, 'reglas', nombre);
    assert.strictEqual(r.rutina.principal.length, 3);
    avisos.push(`${nombre}: ${r.aviso}`);
  }
  return avisos;
});

await prueba('Servidor: token, solicitud fuera de contrato, rechazo y respuesta incompleta de Claude', async () => {
  const s = ia.prepararSolicitudIA(BASE, PERFIL);
  const req = (cuerpo, headers = {}) => new Request('http://x', { method: 'POST', body: JSON.stringify(cuerpo),
    headers: { 'content-type': 'application/json', ...headers } });
  assert.strictEqual((await srv.manejarSolicitud(req(s), { KINETIA_TOKEN: 'abc', KINETIA_SIMULADO: '1' })).status, 401);
  assert.strictEqual((await srv.manejarSolicitud(req(s, { 'x-kinetia-token': 'abc' }), { KINETIA_TOKEN: 'abc', KINETIA_SIMULADO: '1' })).status, 200);
  const menor = JSON.parse(JSON.stringify(s)); menor.perfil.edad = 16;
  assert.strictEqual((await srv.manejarSolicitud(req(menor), { KINETIA_SIMULADO: '1' })).status, 400);
  const inventado = JSON.parse(JSON.stringify(s)); inventado.cupos[0].familia = 'saltos';
  assert.strictEqual((await srv.manejarSolicitud(req(inventado), { KINETIA_SIMULADO: '1' })).status, 400);
  assert.strictEqual((await srv.manejarSolicitud(req(s), {})).status, 503);
  for (const stop of ['refusal', 'max_tokens']) {
    const r = await srv.manejarSolicitud(req(s), { ANTHROPIC_API_KEY: 'k' }, respuestaClaude({}, { stop_reason: stop }));
    assert.strictEqual(r.status, 502, stop);
  }
  const r401 = await srv.manejarSolicitud(req(s), { ANTHROPIC_API_KEY: 'k' },
    async () => new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), { status: 401 }));
  assert.strictEqual(r401.status, 502);
  assert.match((await r401.json()).error, /invalid x-api-key/);
});

await prueba('Sustituir a mano un ejercicio conserva los ajustes de la IA en los demás cupos', async () => {
  const salida = { resumen: 'r', cupos: {
    sentadilla: { ejercicio: 'K01', series: 1, intensidad: 'reducida', descanso: 'ampliado', motivo: 'm' },
    puente: { ejercicio: 'K08', series: 2, intensidad: 'completa', descanso: 'estandar', motivo: 'm' },
    dead_bug: { ejercicio: 'K12', series: 2, intensidad: 'completa', descanso: 'estandar', motivo: 'm' } } };
  const r = await ia.generarRutinaConIA(BASE, PERFIL, { url: 'http://x',
    fetchImpl: fetchServidor({ ANTHROPIC_API_KEY: 'k' }, respuestaClaude(salida)) });
  assert.strictEqual(r.origen, 'ia', r.aviso);
  assert.throws(() => gen.replaceExercise(BASE, r.rutina, 'puente', 'K06'), /configuración cambió/);
  const nueva = gen.replaceExercise(r.rutina.entrada, r.rutina, 'puente', 'K06');
  assert.strictEqual(cupo(nueva, 'puente').seleccion.origen, 'manual');
  const sent = cupo(nueva, 'sentadilla');
  assert.deepStrictEqual([sent.dosis.series, sent.dosis.cantidad, sent.dosis.descansoEntreSeries], [1, 8, 120]);
});

await prueba('Servidor local (HTTP real en modo simulado)', async () => {
  const { spawn } = await import('node:child_process');
  const hijo = spawn(process.execPath, [path.resolve(servidorDir, 'local.mjs')],
    { env: { ...process.env, KINETIA_SIMULADO: '1', PORT: '8799' } });
  try {
    await new Promise((ok, mal) => { hijo.stdout.on('data', (d) => String(d).includes('escuchando') && ok());
      setTimeout(() => mal(new Error('el servidor no inició')), 5000); });
    const r = await ia.generarRutinaConIA(BASE, PERFIL, { url: 'http://127.0.0.1:8799/' });
    assert.strictEqual(r.origen, 'ia', r.aviso);
    return `${r.modelo}: ${r.resumen}`;
  } finally { hijo.kill(); }
});

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(dir, 'resultado_prueba_rutina_ia.json'),
  JSON.stringify({ fecha: new Date().toISOString(), pruebas: resultados.length, fallos, resultados }, null, 2) + '\n');
for (const r of resultados) console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.nombre}${r.error ? ` → ${r.error}` : ''}`);
for (const r of resultados) if (r.ok && r.detalle) console.log(`     ${[].concat(r.detalle).join('\n     ')}`);
console.log(fallos === 0 ? `\n${resultados.length}/${resultados.length} pruebas correctas.` : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos ? 1 : 0);
