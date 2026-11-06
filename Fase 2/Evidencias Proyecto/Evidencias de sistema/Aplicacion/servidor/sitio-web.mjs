/**
 * Kinetia web: la app y el servicio de IA en un solo sitio de Cloudflare Pages.
 * `herramientas/preparar-web.mjs` copia este archivo, con kinetia-ia.mjs incluido, como `_worker.js`.
 *
 * - POST /api/rutina → el mismo servicio de IA que servidor/local.mjs. La clave se guarda como variable
 *   secreta del proyecto en Cloudflare (ANTHROPIC_API_KEY): nunca viaja en la página.
 * - GET /api/estado → indica si la clave está configurada, sin mostrarla.
 * - Todo lo demás → los archivos de la app web, con las cabeceras de aislamiento que exige expo-sqlite
 *   (SharedArrayBuffer) para guardar el perfil y las sesiones en el navegador.
 */
import { VERSION_CONTRATO, manejarSolicitud } from './kinetia-ia.mjs';

const AISLAMIENTO = {
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-embedder-policy': 'require-corp',
  'cross-origin-resource-policy': 'same-origin',
};

function json(estado, datos) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function manejarSitio(request, env = {}) {
  const url = new URL(request.url);

  if (url.pathname === '/api/estado') {
    const modo = env.KINETIA_SIMULADO === '1' ? 'simulado' : env.ANTHROPIC_API_KEY ? 'claude' : 'sin_clave';
    return json(200, {
      servicio: 'kinetia-ia', contrato: VERSION_CONTRATO, modo,
      modelo: modo === 'claude' ? env.KINETIA_MODELO || 'claude-haiku-5-5' : null,
    });
  }

  if (url.pathname === '/api/rutina') {
    // Solo la propia página puede pedir rutinas: el navegador envía siempre Origin en un POST.
    if (request.method !== 'OPTIONS' && request.headers.get('origin') !== url.origin) {
      return json(403, { error: 'Origen no permitido.' });
    }
    return manejarSolicitud(request, env);
  }

  if (url.pathname.startsWith('/api/')) return json(404, { error: 'No existe.' });

  const archivo = await env.ASSETS.fetch(request);
  const respuesta = new Response(archivo.body, archivo);
  for (const [nombre, valor] of Object.entries(AISLAMIENTO)) respuesta.headers.set(nombre, valor);
  return respuesta;
}

export default { fetch: (request, env) => manejarSitio(request, env) };
