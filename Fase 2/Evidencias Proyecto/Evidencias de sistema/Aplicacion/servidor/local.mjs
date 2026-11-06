/**
 * Ejecuta el servicio de IA en tu computador (Node 18 o posterior), sin instalar nada.
 *
 *   PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..." ; node servidor/local.mjs
 *   Sin clave:   $env:KINETIA_SIMULADO="1" ; node servidor/local.mjs
 *
 * El emulador de Android llega a tu computador en http://10.0.2.2:8787
 */
import http from 'node:http';
import { manejarSolicitud } from './kinetia-ia.mjs';

const PUERTO = Number(process.env.PORT || 8787);

http.createServer(async (req, res) => {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  const request = new Request(`http://localhost:${PUERTO}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(partes),
  });
  const inicio = Date.now();
  const response = await manejarSolicitud(request, process.env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
  console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.url} → ${response.status} (${Date.now() - inicio} ms)`);
}).listen(PUERTO, () => {
  const modo = process.env.KINETIA_SIMULADO === '1' ? 'SIMULADO (sin llamar a Claude)'
    : process.env.ANTHROPIC_API_KEY ? `Claude (${process.env.KINETIA_MODELO || 'claude-haiku-5-5'})` : 'SIN CLAVE: definir ANTHROPIC_API_KEY';
  console.log(`Kinetia IA escuchando en http://localhost:${PUERTO} · modo ${modo}`);
  console.log('Desde el emulador de Android: http://10.0.2.2:' + PUERTO);
});
