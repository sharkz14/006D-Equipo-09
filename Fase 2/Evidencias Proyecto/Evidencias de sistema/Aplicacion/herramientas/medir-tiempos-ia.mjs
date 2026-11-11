/**
 * Kinetia · medición del tiempo de respuesta de la IA (requisito RNF-08 del documento técnico).
 *
 * Envía a Claude 10 solicitudes distintas (casos_tiempos_ia.json, armadas con el código de la app), 2 veces cada una y
 * de a una, con el MISMO servidor, prompt, esquema y validación que la app. Mide cuánto tarda cada respuesta.
 * La clave no se guarda ni se muestra: solo se usa para llamar a la API.
 *
 * Uso (PowerShell, en la carpeta del proyecto):
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."      (si la ventana aún no la tiene)
 *   node herramientas\medir-tiempos-ia.mjs
 * Prueba sin clave ni gasto (no llama a Claude):  $env:KINETIA_SIMULADO="1" ; node herramientas\medir-tiempos-ia.mjs
 *
 * Resultado: herramientas\resultado_tiempos_ia.json (o resultado_tiempos_ia_simulado.json en la prueba sin clave).
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const rutaServidor = path.join(aqui, '..', 'servidor', 'kinetia-ia.mjs');
const srv = await import(pathToFileURL(rutaServidor).href);
const { casos } = JSON.parse(fs.readFileSync(path.join(aqui, 'casos_tiempos_ia.json'), 'utf8'));
const REPETICIONES = 2;
const LIMITE_APP_MS = 45000;     // lo que espera la app antes de usar la rutina por reglas
const CORTE_MS = 120000;         // aquí se espera más, para medir también las respuestas lentas
const simulado = process.env.KINETIA_SIMULADO === '1';
const salida = path.join(aqui, simulado ? 'resultado_tiempos_ia_simulado.json' : 'resultado_tiempos_ia.json');

if (!simulado && !process.env.ANTHROPIC_API_KEY) {
  console.error('Falta la clave. En esta ventana escribe:  $env:ANTHROPIC_API_KEY="sk-ant-..."  y vuelve a ejecutar.');
  process.exit(1);
}
if (!simulado && fs.existsSync(salida)) {
  console.error(`Ya existe ${path.basename(salida)}. Renómbralo o bórralo si quieres medir de nuevo.`);
  process.exit(1);
}

// Nunca dejar rastros de una clave en el resultado, aunque un mensaje de error la incluyera.
const limpiar = (texto) => String(texto ?? '').replace(/sk-ant-[A-Za-z0-9_-]+/g, '[clave oculta]').slice(0, 300);
const conCorte = (url, opciones) => fetch(url, { ...opciones, signal: AbortSignal.timeout(CORTE_MS) });
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function pedir(solicitud) {
  if (simulado) {
    await pausa(50);
    return srv.respuestaSimulada(solicitud);
  }
  return srv.pedirAClaude(solicitud, process.env, conCorte);
}

const tareas = casos.flatMap((c) => Array.from({ length: REPETICIONES }, (_, i) => ({ c, rep: i + 1 })));
const resultados = [];
console.log(`Midiendo ${tareas.length} respuestas de la IA (${casos.length} casos × ${REPETICIONES}), de a una…`);
for (const [i, { c, rep }] of tareas.entries()) {
  srv.validarSolicitud(c.solicitud);
  const inicio = performance.now();
  try {
    const r = await pedir(c.solicitud);
    const ms = Math.round(performance.now() - inicio);
    resultados.push({ id: c.id, rep, ok: true, ms, modelo: r.modelo,
      ejercicios: r.cupos.map((x) => `${x.ejercicio} ${x.series}s ${x.intensidad}`).join(' · ') });
    console.log(`[${i + 1}/${tareas.length}] ${c.id} (${rep}) → ${(ms / 1000).toFixed(1)} s ${ms > LIMITE_APP_MS ? '⚠ más de 45 s' : '✓'}`);
  } catch (error) {
    const ms = Math.round(performance.now() - inicio);
    resultados.push({ id: c.id, rep, ok: false, ms, error: limpiar(error?.message ?? error) });
    console.log(`[${i + 1}/${tareas.length}] ${c.id} (${rep}) → ERROR tras ${(ms / 1000).toFixed(1)} s: ${limpiar(error?.message ?? error)}`);
  }
  if (i < tareas.length - 1) await pausa(1000);
}

const ok = resultados.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
const pct = (q) => (ok.length ? ok[Math.min(ok.length - 1, Math.ceil(q * ok.length) - 1)] : null);
const resumen = {
  respuestas: resultados.length,
  correctas: ok.length,
  errores: resultados.length - ok.length,
  promedio_ms: ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : null,
  mediana_ms: pct(0.5),
  p90_ms: pct(0.9),
  minimo_ms: ok[0] ?? null,
  maximo_ms: ok[ok.length - 1] ?? null,
  sobre_45_s: ok.filter((ms) => ms > LIMITE_APP_MS).length,
};
fs.writeFileSync(salida, JSON.stringify({
  version: 'tiempos-ia-0.1', fecha: new Date().toISOString(), simulado,
  modelo: simulado ? 'simulado' : process.env.KINETIA_MODELO || 'claude-haiku-5-5', contrato: srv.VERSION_CONTRATO,
  servidor_sha256: createHash('sha256').update(fs.readFileSync(rutaServidor)).digest('hex'),
  node: process.version, repeticiones: REPETICIONES, limite_app_ms: LIMITE_APP_MS, resumen, resultados,
}, null, 2) + '\n');

const s = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`);
console.log(`\nListo. ${resumen.correctas} de ${resumen.respuestas} correctas · promedio ${s(resumen.promedio_ms)} · ` +
  `mediana ${s(resumen.mediana_ms)} · 90 % bajo ${s(resumen.p90_ms)} · máximo ${s(resumen.maximo_ms)} · ` +
  `sobre 45 s: ${resumen.sobre_45_s}.`);
console.log(`Resultado guardado en herramientas\\${path.basename(salida)}`);
