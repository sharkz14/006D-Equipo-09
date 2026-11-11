/* Kinetia · prueba de rendimiento local (sin red ni IA real).
 * Mide lo que depende del código de Kinetia: generar la rutina por reglas, preparar la solicitud a la IA, el trabajo del
 * servidor (validar y responder en modo simulado) y validar y montar la respuesta. La espera por Claude se mide aparte.
 * Uso: node prueba_rendimiento.mjs <build_app_compilada> <carpeta_servidor> [carpeta_assets]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const [buildDir, servidorDir, assetsDir] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const gen = require(path.resolve(buildDir, 'lib/generador.js'));
const ia = require(path.resolve(buildDir, 'lib/ia/rutina-ia.js'));
const srv = await import(pathToFileURL(path.resolve(servidorDir, 'kinetia-ia.mjs')).href);

const BASE = { filtroSuperado: true, modo: 'borrador' };
const EXCLUSIONES = [[], ['acceso_suelo'], ['apoyo_un_pie'], ['apoyo_rodillas'], ['elevacion_talones'], ['sujecion_carga']];
const pesoIMC = (imc, cm) => Math.round(imc * (cm / 100) ** 2 * 100) / 100;
const PERFILES = [];
for (const edad of [18, 35, 50, 64, 65, 80]) for (const imc of [17, 24, 30, 34.9, 35, 45]) {
  PERFILES.push({ edad, pesoKg: pesoIMC(imc, 165), estaturaCm: 165 });
}
const casos = [];
for (const nivel of ['P', 'I']) for (const equipo of ['PC', 'M1']) for (const duracion of [20, 30, 40]) {
  for (const tags of EXCLUSIONES) for (const p of PERFILES) {
    casos.push({ entrada: { ...BASE, nivel, equipo, duracion, excluir: { ids: [], familias: [], tags } },
      perfil: { ...p, nivel } });
  }
}

function resumen(tiempos) {
  const o = [...tiempos].sort((a, b) => a - b);
  const q = (x) => o[Math.min(o.length - 1, Math.floor(x * o.length))];
  const media = o.reduce((a, b) => a + b, 0) / o.length;
  const r = (v) => Math.round(v * 1000) / 1000;
  return { n: o.length, media_ms: r(media), p50_ms: r(q(0.5)), p95_ms: r(q(0.95)), max_ms: r(o[o.length - 1]) };
}

// Calentamiento: la primera ejecución incluye la compilación del motor de JavaScript.
for (const c of casos.slice(0, 200)) gen.generateRoutine({ ...c.entrada, perfilCarga: c.perfil });

// 1. Rutina por reglas.
const tReglas = [];
let sinRutina = 0;
for (const c of casos) {
  const t0 = performance.now();
  const r = gen.generateRoutine({ ...c.entrada, perfilCarga: c.perfil });
  tReglas.push(performance.now() - t0);
  if (r.principal.length === 0) sinRutina += 1;
}

// 2. Flujo con IA en modo simulado: preparar → validar en el servidor → responder → validar y montar en la app.
const tPreparar = []; const tServidor = []; const tMontar = []; const tamSolicitud = []; const tamRespuesta = [];
let montadas = 0; let noGenerables = 0;
for (const c of casos) {
  let t0 = performance.now();
  const solicitud = ia.prepararSolicitudIA(c.entrada, c.perfil);
  tPreparar.push(performance.now() - t0);
  if (!solicitud) { noGenerables += 1; continue; }
  const cuerpo = JSON.stringify(solicitud);
  tamSolicitud.push(Buffer.byteLength(cuerpo));

  t0 = performance.now();
  const res = await srv.manejarSolicitud(new Request('http://local/api/rutina', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: cuerpo,
  }), { KINETIA_SIMULADO: '1' });
  const texto = await res.text();
  tServidor.push(performance.now() - t0);
  tamRespuesta.push(Buffer.byteLength(texto));

  t0 = performance.now();
  const respuesta = ia.parsearRespuestaIA(JSON.parse(texto));
  const rutina = ia.aplicarRespuestaIA(ia.conPerfilCarga(c.entrada, c.perfil), respuesta);
  tMontar.push(performance.now() - t0);
  if (rutina.principal.length > 0) montadas += 1;
}

// 3. Tamaño de las animaciones (cada una se descarga solo cuando aparece su paso).
let animaciones = null;
if (assetsDir && fs.existsSync(assetsDir)) {
  const archivos = fs.readdirSync(assetsDir).filter((f) => /\.(gif|png)$/i.test(f));
  const tam = archivos.map((f) => fs.statSync(path.join(assetsDir, f)).size);
  const gif = archivos.filter((f) => f.endsWith('.gif')).map((f) => fs.statSync(path.join(assetsDir, f)).size);
  animaciones = { archivos: archivos.length, total_mb: Math.round(tam.reduce((a, b) => a + b, 0) / 1e4) / 100,
    gif_promedio_kb: Math.round(gif.reduce((a, b) => a + b, 0) / gif.length / 1000),
    gif_mayor_kb: Math.round(Math.max(...gif) / 1000) };
}

const bytes = (l) => ({ promedio: Math.round(l.reduce((a, b) => a + b, 0) / l.length), max: Math.max(...l) });
const salida = {
  version: 'rendimiento-0.1', fecha: new Date().toISOString(), node: process.version,
  configuraciones: casos.length,
  reglas: { ...resumen(tReglas), sin_rutina: sinRutina },
  ia_simulada: {
    preparar_solicitud: resumen(tPreparar),
    servidor_validar_y_responder: resumen(tServidor),
    validar_y_montar: resumen(tMontar),
    montadas, no_generables: noGenerables,
    tamano_solicitud_bytes: bytes(tamSolicitud), tamano_respuesta_bytes: bytes(tamRespuesta),
  },
  animaciones,
};
fs.writeFileSync('resultado_prueba_rendimiento.json', JSON.stringify(salida, null, 2) + '\n');
console.log(JSON.stringify(salida, null, 2));
