/**
 * Kinetia · evaluación de la IA contra las elecciones reales del preparador físico.
 *
 * Envía a Claude, con el MISMO prompt, esquema y validación del servidor de la app, cada historia que el
 * preparador etiquetó (puente K06/K08 y dead bug K11/K12), varias veces, y guarda qué variante eligió la IA.
 * No usa la app ni el emulador. Se corre en el computador que tiene la clave.
 *
 * Uso (PowerShell, en la carpeta del proyecto):
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."      (si la ventana aún no la tiene)
 *   node herramientas\evaluar-ia-preparador.mjs
 * Opcional: $env:KINETIA_REPETICIONES="3"  (veces que se pregunta cada caso; por defecto 3)
 * Opcional: una etiqueta para no sobrescribir corridas anteriores, p. ej.:
 *   node herramientas\evaluar-ia-preparador.mjs calibrada   →  resultado_evaluacion_ia_calibrada.json
 *
 * Para repetir solo las consultas que fallaron en una corrida anterior (mismas historias y repeticiones):
 *   node herramientas\evaluar-ia-preparador.mjs calibrada --completar
 *
 * Resultado: herramientas\resultado_evaluacion_ia[_etiqueta].json (se guarda después de cada respuesta), con la
 * huella SHA-256 del servidor usado, para saber con qué versión del prompt se midió.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const srv = await import(pathToFileURL(path.join(aqui, '..', 'servidor', 'kinetia-ia.mjs')).href);
const { casos } = JSON.parse(fs.readFileSync(path.join(aqui, 'casos_evaluacion_ia.json'), 'utf8'));
const REPETICIONES = Math.max(1, Math.min(5, Number(process.env.KINETIA_REPETICIONES || 3)));
const SIMULTANEAS = 3;
const completar = process.argv.includes('--completar');
const etiqueta = (process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '').replace(/[^a-z0-9_-]/gi, '');
const salida = path.join(aqui, `resultado_evaluacion_ia${etiqueta ? `_${etiqueta}` : ''}.json`);
const huellaServidor = createHash('sha256')
  .update(fs.readFileSync(path.join(aqui, '..', 'servidor', 'kinetia-ia.mjs'))).digest('hex');
if (fs.existsSync(salida) && !completar) {
  console.error(`Ya existe ${path.basename(salida)}. Usa otra etiqueta, por ejemplo: node herramientas\\evaluar-ia-preparador.mjs v2`);
  process.exit(1);
}
if (completar && !fs.existsSync(salida)) {
  console.error(`No existe ${path.basename(salida)}: no hay nada que completar.`);
  process.exit(1);
}
const previo = completar ? JSON.parse(fs.readFileSync(salida, 'utf8')) : null;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Falta la clave. En esta ventana escribe:  $env:ANTHROPIC_API_KEY="sk-ant-..."  y vuelve a ejecutar.');
  process.exit(1);
}

const tareas = previo
  ? previo.resultados.filter((x) => x.error).map((x) => ({ c: casos.find((c) => c.id === x.id), rep: x.rep }))
  : casos.flatMap((c) => Array.from({ length: REPETICIONES }, (_, i) => ({ c, rep: i + 1 })));
const resultados = previo ? previo.resultados.filter((x) => !x.error) : [];
const totalPrevisto = previo ? previo.total_previsto : tareas.length;
const inicio = Date.now();
const guardar = () => fs.writeFileSync(salida, JSON.stringify({
  version: 'evaluacion-ia-preparador-0.1', fecha: previo?.fecha ?? new Date().toISOString(),
  modelo: process.env.KINETIA_MODELO || 'claude-haiku-5-5', contrato: srv.VERSION_CONTRATO, etiqueta: etiqueta || null,
  servidor_sha256: previo?.servidor_sha256 ?? huellaServidor,
  ...(previo ? { completado: { fecha: new Date().toISOString(), servidor_sha256: huellaServidor, consultas: tareas.length } } : {}),
  repeticiones: previo?.repeticiones ?? REPETICIONES, total_previsto: totalPrevisto, resultados,
}, null, 2) + '\n');

async function preguntar(c) {
  srv.validarSolicitud(c.solicitud);
  for (let intento = 1; ; intento += 1) {
    try {
      return await srv.pedirAClaude(c.solicitud, process.env);
    } catch (error) {
      const reintentable = /respondió (429|5\d\d)|fetch failed|ECONNRESET|ETIMEDOUT/.test(String(error?.message));
      if (!reintentable || intento >= 3) throw error;
      await new Promise((ok) => setTimeout(ok, 5000 * intento));
    }
  }
}

let siguiente = 0;
async function trabajador() {
  while (siguiente < tareas.length) {
    const { c, rep } = tareas[siguiente++];
    const base = { id: c.id, decision: c.decision, rep, preferencia: c.preferencia };
    try {
      const r = await preguntar(c);
      const cupo = r.cupos.find((x) => x.familia === c.cupo);
      resultados.push({ ...base, eleccion: cupo.ejercicio, series: cupo.series, intensidad: cupo.intensidad,
        descanso: cupo.descanso, motivo: cupo.motivo, resumen: r.resumen, modelo: r.modelo });
      const marca = c.preferencia === 'EMPATE' ? '·' : cupo.ejercicio === c.preferencia ? '✓' : '✗';
      console.log(`[${resultados.length}/${totalPrevisto}] ${c.id} (${rep}) → ${cupo.ejercicio} ${marca} preparador: ${c.preferencia}`);
    } catch (error) {
      resultados.push({ ...base, error: String(error?.message ?? error) });
      console.log(`[${resultados.length}/${totalPrevisto}] ${c.id} (${rep}) → ERROR: ${error?.message ?? error}`);
    }
    guardar();
  }
}

console.log(previo ? `Repitiendo ${tareas.length} consultas que habían fallado…`
  : `Evaluando ${casos.length} historias × ${REPETICIONES} = ${tareas.length} consultas a Claude…`);
await Promise.all(Array.from({ length: SIMULTANEAS }, trabajador));
guardar();

const validas = resultados.filter((r) => !r.error && r.preferencia !== 'EMPATE');
const coinciden = validas.filter((r) => r.eleccion === r.preferencia).length;
const errores = resultados.filter((r) => r.error).length;
console.log(`\nListo en ${Math.round((Date.now() - inicio) / 1000)} s. Coincide con el preparador en ${coinciden} de ${validas.length} respuestas` +
  `${errores ? ` (${errores} con error)` : ''}.`);
console.log(`Resultado guardado en ${salida}. Avísale a Claude para el análisis.`);
