/**
 * Kinetia · respuestas reales de la IA para las capturas del manual de usuario.
 *
 * Pide a Claude 2 rutinas para la persona ficticia de las capturas (casos_capturas_ia.json), con el MISMO servidor,
 * prompt, esquema y validación que la app, y las guarda tal como las recibe la app. La clave no se guarda ni se muestra.
 *
 * Uso (PowerShell, en la carpeta del proyecto):
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."      (si la ventana aún no la tiene)
 *   node herramientas\respuestas-para-capturas.mjs
 * Resultado: herramientas\respuestas_capturas_ia.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const srv = await import(pathToFileURL(path.join(aqui, '..', 'servidor', 'kinetia-ia.mjs')).href);
const { casos } = JSON.parse(fs.readFileSync(path.join(aqui, 'casos_capturas_ia.json'), 'utf8'));
const salida = path.join(aqui, 'respuestas_capturas_ia.json');
const VECES = 2;

if (process.env.KINETIA_SIMULADO === '1') {
  console.error('Esta ventana tiene activado el modo simulado. Abre una ventana nueva de PowerShell.');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Falta la clave. En esta ventana escribe:  $env:ANTHROPIC_API_KEY="sk-ant-..."  y vuelve a ejecutar.');
  process.exit(1);
}

const limpiar = (texto) => String(texto ?? '').replace(/sk-ant-[A-Za-z0-9_-]+/g, '[clave oculta]').slice(0, 300);
const conCorte = (url, opciones) => fetch(url, { ...opciones, signal: AbortSignal.timeout(120000) });
const respuestas = [];
for (const c of casos) {
  srv.validarSolicitud(c.solicitud);
  for (let i = 1; i <= VECES; i += 1) {
    try {
      const r = await srv.pedirAClaude(c.solicitud, process.env, conCorte);
      respuestas.push({ id: c.id, intento: i, respuesta: r });
      console.log(`[${i}/${VECES}] ${c.id} → ${r.cupos.map((x) => x.ejercicio).join(', ')} ✓`);
    } catch (error) {
      respuestas.push({ id: c.id, intento: i, error: limpiar(error?.message ?? error) });
      console.log(`[${i}/${VECES}] ${c.id} → ERROR: ${limpiar(error?.message ?? error)}`);
    }
  }
}
fs.writeFileSync(salida, JSON.stringify({ version: 'respuestas-capturas-0.1', fecha: new Date().toISOString(),
  modelo: process.env.KINETIA_MODELO || 'claude-haiku-5-5', contrato: srv.VERSION_CONTRATO, respuestas }, null, 2) + '\n');
console.log(`\nListo. Guardado en herramientas\\${path.basename(salida)}`);
