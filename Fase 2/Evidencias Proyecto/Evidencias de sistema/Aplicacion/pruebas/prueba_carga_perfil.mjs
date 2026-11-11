/* Kinetia · pruebas de los topes de carga por edad y peso (carga-0.1).
 * Uso: node prueba_carga_perfil.mjs <build_app_compilada> <carpeta_servidor>
 */
import assert from 'node:assert';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const [buildDir, servidorDir] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const gen = require(path.resolve(buildDir, 'lib/generador.js'));
const carga = require(path.resolve(buildDir, 'lib/carga-perfil.js'));
const ia = require(path.resolve(buildDir, 'lib/ia/rutina-ia.js'));
const srv = await import(pathToFileURL(path.resolve(servidorDir, 'kinetia-ia.mjs')).href);

const resultados = []; let fallos = 0;
async function prueba(nombre, fn) {
  try { const d = await fn(); resultados.push({ nombre, ok: true, ...(d ? { detalle: d } : {}) }); }
  catch (e) { fallos += 1; resultados.push({ nombre, ok: false, error: e.message }); }
}

const BASE = { nivel: 'I', equipo: 'PC', duracion: 30, filtroSuperado: true, modo: 'borrador',
  excluir: { ids: [], familias: [], tags: [] } };
// Peso para un IMC dado con 165 cm.
const pesoIMC = (imc) => Math.round(imc * 1.65 ** 2 * 100) / 100;
const perfil = (edad, imc) => ({ edad, pesoKg: pesoIMC(imc), estaturaCm: 165 });
const cupo = (r, f) => r.principal.find((x) => x.familia === f);
const dosis = (x) => [x.dosis.series, x.dosis.cantidad, x.dosis.descansoEntreSeries];

await prueba('Reglas por edad, nivel e IMC, con los límites exactos', () => {
  const casos = [
    [perfil(30, 22), 'I', []], [perfil(49, 22), 'P', []], [perfil(50, 22), 'P', ['edad_50_inicio']],
    [perfil(50, 22), 'I', []], [perfil(64, 22), 'P', ['edad_50_inicio']], [perfil(65, 22), 'I', ['edad_65']],
    [perfil(65, 22), 'P', ['edad_65', 'edad_65_inicio']], [perfil(30, 29.99), 'I', []],
    [perfil(30, 30), 'I', ['imc_30']], [perfil(30, 34.99), 'P', ['imc_30']],
    [perfil(30, 35), 'P', ['imc_30', 'imc_35']], [perfil(70, 36), 'P', ['edad_65', 'edad_65_inicio', 'imc_30', 'imc_35']],
    [perfil(30, 16), 'P', []],
  ];
  for (const [p, nivel, esperado] of casos) {
    assert.deepStrictEqual(carga.reglasDelPerfil(p, nivel), esperado, JSON.stringify([p, nivel]));
  }
  const concentrados = Object.values(gen.CATALOG).filter((e) => carga.cargaConcentrada(e)).map((e) => e.id);
  assert.deepStrictEqual(concentrados, ['K03', 'K04', 'K08', 'K09', 'K10']);
  return `IMC bajo: sin regla · ejercicios con carga concentrada: ${concentrados.join(', ')}`;
});

// Todas las configuraciones de sesión y un conjunto de exclusiones representativo.
const EXCLUSIONES = [[], ['acceso_suelo'], ['apoyo_un_pie'], ['apoyo_rodillas'], ['elevacion_talones'], ['sujecion_carga']];
const configuraciones = [];
for (const nivel of ['P', 'I']) for (const equipo of ['PC', 'M1']) for (const duracion of [20, 30, 40])
  for (const tags of EXCLUSIONES) configuraciones.push({ ...BASE, nivel, equipo, duracion, excluir: { ids: [], familias: [], tags } });
const PERFILES = [];
for (const edad of [18, 35, 50, 64, 65, 80]) for (const imc of [17, 24, 30, 34.9, 35, 45]) PERFILES.push(perfil(edad, imc));

await prueba('Un perfil sin reglas no cambia ninguna rutina', () => {
  let n = 0;
  for (const c of configuraciones) {
    const sin = gen.generateRoutine(c);
    const con = gen.generateRoutine({ ...c, perfilCarga: perfil(30, 22) });
    const limpia = (r) => { const x = JSON.parse(JSON.stringify(r)); delete x.entrada.perfilCarga; delete x.cargaPerfil; return x; };
    assert.deepStrictEqual(limpia(con), limpia(sin));
    if (con.principal.length) assert.deepStrictEqual(con.cargaPerfil.reglas, []);
    n += 1;
  }
  return `${n} configuraciones idénticas`;
});

await prueba('Los topes nunca suben la dosis: ficha ≥ sin perfil ≥ con perfil (36 perfiles × 72 configuraciones)', () => {
  let ejercicios = 0; let bajados = 0;
  for (const c of configuraciones) {
    const sin = gen.generateRoutine(c);
    for (const p of PERFILES) {
      const con = gen.generateRoutine({ ...c, perfilCarga: p });
      assert.strictEqual(con.estado, sin.estado);
      assert.deepStrictEqual(con.principal.map((x) => x.id), sin.principal.map((x) => x.id), 'los topes no cambian ejercicios');
      for (const x of con.principal) {
        const y = sin.principal.find((z) => z.id === x.id);
        assert.ok(x.dosis.series <= y.dosis.series && x.dosis.cantidad <= y.dosis.cantidad &&
          x.dosis.descansoEntreSeries >= y.dosis.descansoEntreSeries, `${x.id} ${JSON.stringify(p)}`);
        assert.ok(x.dosis.series >= 1 && x.dosis.cantidad >= 1);
        const cambio = x.dosis.series < y.dosis.series || x.dosis.cantidad < y.dosis.cantidad ||
          x.dosis.descansoEntreSeries > y.dosis.descansoEntreSeries;
        assert.strictEqual(!!x.ajustePerfil, cambio, `ajustePerfil solo si cambió (${x.id})`);
        if (x.ajustePerfil) { assert.ok(x.ajustePerfil.reglas.length > 0); bajados += 1; }
        ejercicios += 1;
      }
    }
  }
  return `${ejercicios} ejercicios revisados; ${bajados} con dosis bajada por perfil.`;
});

await prueba('IMC 31 y 36: baja split squat y talones; la sentadilla y el puente bilateral no cambian', () => {
  const r31 = gen.generateRoutine({ ...BASE, perfilCarga: perfil(30, 31) });
  assert.deepStrictEqual(dosis(cupo(r31, 'sentadilla')), [2, 10, 90]);
  assert.deepStrictEqual(dosis(cupo(r31, 'split_squat')), [2, 6, 90]);
  assert.deepStrictEqual(dosis(cupo(r31, 'pantorrilla')), [2, 9, 60]);
  assert.deepStrictEqual(cupo(r31, 'split_squat').ajustePerfil, { reglas: ['imc_30'], cambios: ['intensidad'] });
  assert.deepStrictEqual(r31.cargaPerfil.reglas, ['imc_30']);
  const r36 = gen.generateRoutine({ ...BASE, perfilCarga: perfil(30, 36) });
  assert.deepStrictEqual(dosis(cupo(r36, 'split_squat')), [2, 6, 120]);
  assert.deepStrictEqual(dosis(cupo(r36, 'pantorrilla')), [2, 9, 90]);
  assert.deepStrictEqual(cupo(r36, 'pantorrilla').ajustePerfil, { reglas: ['imc_30', 'imc_35'], cambios: ['intensidad', 'descanso'] });
  assert.ok(!cupo(r36, 'sentadilla').ajustePerfil);
  return `IMC 31 → split squat 2×6, talones 2×9 · IMC 36 → además +30 s de descanso (${r31.duracion.minutosAproximados} → ${r36.duracion.minutosAproximados} min)`;
});

await prueba('70 años, principiante, 40 min: 2 series, menos repeticiones y más descanso en todo', () => {
  const r = gen.generateRoutine({ ...BASE, nivel: 'P', duracion: 40, perfilCarga: perfil(70, 23) });
  assert.strictEqual(r.plantilla, 'P40');
  assert.deepStrictEqual(dosis(cupo(r, 'sentadilla')), [2, 6, 120]);   // ficha P40: 3×8, 90 s
  assert.deepStrictEqual(cupo(r, 'sentadilla').ajustePerfil.cambios, ['series', 'intensidad', 'descanso']);
  assert.deepStrictEqual(dosis(cupo(r, 'plancha_lateral')), [2, 8, 90]); // 10 s → 8 s (redondeo de 7,5)
  assert.deepStrictEqual(r.cargaPerfil.reglas, ['edad_65', 'edad_65_inicio']);
  const intermedio = gen.generateRoutine({ ...BASE, duracion: 40, perfilCarga: perfil(70, 23) });
  assert.deepStrictEqual(dosis(cupo(intermedio, 'sentadilla')), [2, 10, 120]);
  return 'Sentadilla P40: 3×8 · 90 s → 2×6 · 120 s; con experiencia (intermedio): 2×10 · 120 s';
});

await prueba('55 años: solo cambia si está empezando', () => {
  const p = gen.generateRoutine({ ...BASE, nivel: 'P', perfilCarga: perfil(55, 23) });
  const i = gen.generateRoutine({ ...BASE, nivel: 'I', perfilCarga: perfil(55, 23) });
  assert.ok(p.principal.every((x) => x.dosis.descansoEntreSeries === gen.CATALOG[x.id].dosis.P.descansoEntreSeries + 30));
  assert.ok(i.principal.every((x) => !x.ajustePerfil));
  assert.deepStrictEqual(p.cargaPerfil.reglas, ['edad_50_inicio']);
});

await prueba('Perfil inválido → entrada inválida (no se ignora)', () => {
  for (const malo of [{ edad: 17, pesoKg: 60, estaturaCm: 165 }, { edad: 30.5, pesoKg: 60, estaturaCm: 165 },
    { edad: 30, pesoKg: 0, estaturaCm: 165 }, { edad: 30, pesoKg: 60 }, null]) {
    assert.strictEqual(gen.generateRoutine({ ...BASE, perfilCarga: malo }).estado, 'entrada_invalida', JSON.stringify(malo));
  }
});

const PERFIL_IA = { edad: 30, pesoKg: pesoIMC(31), estaturaCm: 165, nivel: 'I' };
const respuestaClaude = (salida) => async () => new Response(JSON.stringify({
  content: [{ type: 'text', text: JSON.stringify(salida) }], stop_reason: 'end_turn' }), { status: 200 });
const fetchServidor = (fetchClaude, env = { ANTHROPIC_API_KEY: 'k' }) => async (url, init) =>
  srv.manejarSolicitud(new Request(url, init), env, fetchClaude);

await prueba('Solicitud a la IA: topes por variante, reglas en texto y esquema acotado', () => {
  const s = ia.prepararSolicitudIA(BASE, PERFIL_IA);
  srv.validarSolicitud(s);
  assert.strictEqual(s.version, 'kinetia-rutina-ia-0.2');
  assert.deepStrictEqual(s.ajustes_perfil, [carga.REGLAS_CARGA.imc_30.texto]);
  const k03 = s.cupos.find((c) => c.familia === 'split_squat').candidatos[0];
  assert.deepStrictEqual([k03.tope_series, k03.tope_intensidad, k03.tope_descanso], [2, 'reducida', 'estandar']);
  const esquema = srv.construirEsquema(s).properties.cupos.properties;
  assert.deepStrictEqual(esquema.split_squat.properties.intensidad.enum, ['reducida', 'minima']);
  assert.deepStrictEqual(esquema.sentadilla.properties.intensidad.enum, ['completa', 'reducida', 'minima']);
  // El puente ofrece K08 (con tope) y K06 (sin tope): el esquema no puede acotar; la app lo aplica al montar.
  assert.deepStrictEqual(esquema.puente.properties.intensidad.enum, ['completa', 'reducida', 'minima']);
  const mensaje = srv.construirMensaje(s);
  assert.ok(mensaje.includes('Límite por perfil: intensidad máxima reducida'), mensaje);
  assert.ok(mensaje.includes(carga.REGLAS_CARGA.imc_30.texto));

  const mayor = ia.prepararSolicitudIA({ ...BASE, nivel: 'P', duracion: 40 }, { edad: 70, pesoKg: 60, estaturaCm: 165, nivel: 'P' });
  const e2 = srv.construirEsquema(mayor).properties.cupos.properties;
  assert.deepStrictEqual(e2.sentadilla.properties.series.enum, [1, 2]);
  assert.deepStrictEqual(e2.sentadilla.properties.descanso.enum, ['ampliado']);
  assert.deepStrictEqual(e2.sentadilla.properties.intensidad.enum, ['reducida', 'minima']);
  return 'IMC 31: split squat solo admite «reducida» o «mínima» · 70 años: 1–2 series y descanso ampliado';
});

await prueba('Las cifras que recibe la IA son las que la app muestra (todas las plantillas e intensidades)', () => {
  let n = 0;
  for (const nivel of ['P', 'I']) for (const equipo of ['PC', 'M1']) for (const duracion of [20, 30, 40]) {
    const entrada = { ...BASE, nivel, equipo, duracion };
    const s = ia.prepararSolicitudIA(entrada, { edad: 30, pesoKg: 60, estaturaCm: 165, nivel });
    const mensaje = srv.construirMensaje(s);
    for (const intensidad of ['completa', 'reducida', 'minima']) {
      const elecciones = s.cupos.map((c) => ({ familia: c.familia, id: c.candidatos[0].id, motivo: 'm',
        ajuste: { series: c.candidatos[0].series, intensidad, descanso: 'estandar' } }));
      const r = gen.generateRoutineFromAI(ia.conPerfilCarga(entrada, { edad: 30, pesoKg: 60, estaturaCm: 165 }), elecciones, 'x');
      for (const c of s.cupos) {
        const k = c.candidatos[0];
        const mostrado = cupo(r, c.familia).dosis.cantidad;
        assert.strictEqual(srv.cantidadSegunIntensidad(k.cantidad, intensidad), mostrado, `${k.id} ${intensidad}`);
        const nombre = { completa: 'completa', reducida: 'reducida', minima: 'mínima' }[intensidad];
        assert.ok(mensaje.includes(`${nombre} ${mostrado}`), `${k.id}: ${nombre} ${mostrado}`);
        n += 1;
      }
    }
  }
  const k11 = srv.construirMensaje(ia.prepararSolicitudIA(BASE, { edad: 30, pesoKg: 60, estaturaCm: 165, nivel: 'I' }));
  assert.ok(k11.includes('Repeticiones por lado según intensidad: completa 6, reducida 5, mínima 3'), k11);
  return `${n} comprobaciones · K11 intermedio: 6 / 5 / 3 por lado (antes la IA escribió «unas 4»)`;
});

await prueba('Si la IA pide más que el tope, la app lo baja; si pide menos, se respeta', async () => {
  const salida = (intensidadPuente) => ({ resumen: 'r', cupos: {
    sentadilla: { ejercicio: 'K01', series: 2, intensidad: 'completa', descanso: 'estandar', motivo: 'a' },
    split_squat: { ejercicio: 'K03', series: 2, intensidad: 'reducida', descanso: 'estandar', motivo: 'b' },
    pantorrilla: { ejercicio: 'K09', series: 2, intensidad: 'minima', descanso: 'estandar', motivo: 'c' },
    puente: { ejercicio: 'K08', series: 2, intensidad: intensidadPuente, descanso: 'estandar', motivo: 'd' },
    dead_bug: { ejercicio: 'K12', series: 2, intensidad: 'completa', descanso: 'estandar', motivo: 'e' } } });
  const r = await ia.generarRutinaConIA(BASE, PERFIL_IA, { url: 'http://x', fetchImpl: fetchServidor(respuestaClaude(salida('completa'))) });
  assert.strictEqual(r.origen, 'ia', r.aviso);
  const k08 = cupo(r.rutina, 'puente');
  assert.deepStrictEqual([k08.id, k08.dosis.cantidad], ['K08', 5]);              // 6 → 4,5 → 5
  assert.deepStrictEqual(k08.ajustePerfil, { reglas: ['imc_30'], cambios: ['intensidad'] });
  assert.strictEqual(k08.seleccion.ajusteDosis.intensidad, 'completa');          // se conserva lo que pidió la IA
  assert.deepStrictEqual([cupo(r.rutina, 'pantorrilla').dosis.cantidad, !!cupo(r.rutina, 'pantorrilla').ajustePerfil], [6, false]);
  assert.ok(!cupo(r.rutina, 'split_squat').ajustePerfil);                        // la IA ya estaba en el tope
  assert.deepStrictEqual(r.rutina.entrada.perfilCarga, { edad: 30, pesoKg: PERFIL_IA.pesoKg, estaturaCm: 165 });
  return 'K08 pedido «completa» → montado reducido (5 por lado) · talones «mínima» → 6, sin tope adicional';
});

await prueba('Sin IA (servidor caído) la rutina habitual también respeta los topes', async () => {
  const r = await ia.generarRutinaConIA(BASE, PERFIL_IA, { url: 'http://x', fetchImpl: async () => { throw new TypeError('x'); } });
  assert.strictEqual(r.origen, 'reglas');
  assert.deepStrictEqual(dosis(cupo(r.rutina, 'split_squat')), [2, 6, 90]);
  assert.deepStrictEqual(r.rutina.cargaPerfil.reglas, ['imc_30']);
});

await prueba('Servidor: rechaza topes incoherentes; el modo simulado se queda en el tope', async () => {
  const s = ia.prepararSolicitudIA(BASE, PERFIL_IA);
  for (const cambiar of [(k) => { k.tope_series = 3; }, (k) => { k.tope_intensidad = 'maxima'; }, (k) => { delete k.tope_descanso; }]) {
    const malo = JSON.parse(JSON.stringify(s)); cambiar(malo.cupos[0].candidatos[0]);
    assert.throws(() => srv.validarSolicitud(malo), /Candidato no válido/);
  }
  const viejo = JSON.parse(JSON.stringify(s)); viejo.version = 'kinetia-rutina-ia-0.1';
  assert.throws(() => srv.validarSolicitud(viejo), /Versión/);
  const r = await ia.generarRutinaConIA({ ...BASE, nivel: 'P', duracion: 40 }, { edad: 70, pesoKg: 60, estaturaCm: 165, nivel: 'P' },
    { url: 'http://x', fetchImpl: fetchServidor(null, { KINETIA_SIMULADO: '1' }) });
  assert.strictEqual(r.origen, 'ia', r.aviso);
  assert.deepStrictEqual(dosis(cupo(r.rutina, 'sentadilla')), [2, 6, 120]);
});

await prueba('Sustituir un ejercicio conserva los topes; cambiar el perfil invalida la rutina', () => {
  const entrada = { ...BASE, perfilCarga: perfil(30, 31) };
  const r = gen.generateRoutine(entrada);
  const nueva = gen.replaceExercise(entrada, r, 'puente', 'K06');
  assert.deepStrictEqual(dosis(cupo(nueva, 'split_squat')), [2, 6, 90]);
  assert.throws(() => gen.replaceExercise({ ...entrada, perfilCarga: perfil(30, 22) }, r, 'puente', 'K06'), /configuración cambió/);
});

await prueba('Textos de las reglas: breves y sin cifras del cuerpo de la persona', () => {
  for (const regla of Object.values(carga.REGLAS_CARGA)) {
    assert.ok(regla.texto.length <= 200, regla.id);
    assert.ok(!/imc|índice|kg|obes|sobrepeso/i.test(regla.texto), regla.texto);
  }
});

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(dir, 'resultado_prueba_carga_perfil.json'),
  JSON.stringify({ fecha: new Date().toISOString(), pruebas: resultados.length, fallos, resultados }, null, 2) + '\n');
for (const r of resultados) console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.nombre}${r.error ? ` → ${r.error}` : ''}`);
for (const r of resultados) if (r.ok && r.detalle) console.log(`     ${[].concat(r.detalle).join('\n     ')}`);
console.log(fallos === 0 ? `\n${resultados.length}/${resultados.length} pruebas correctas.` : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos ? 1 : 0);
