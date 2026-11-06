/**
 * Kinetia · prepara la versión web para publicarla en Cloudflare Pages (arrastrar y soltar).
 *
 * Uso, en la carpeta del proyecto:   node herramientas/preparar-web.mjs
 * Resultado: carpeta `dist-web/` lista para subir (o comprimida en un .zip).
 *
 * - Exporta la app web con la IA en la misma dirección del sitio (/api/rutina) y en modo demostración
 *   (muestra las fichas en borrador, como en Expo Go, con el aviso de prototipo).
 * - Agrega `_worker.js`: servidor/sitio-web.mjs + servidor/kinetia-ia.mjs en un solo archivo.
 * - No incluye ninguna clave: ANTHROPIC_API_KEY se guarda como secreto del proyecto en Cloudflare.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(raiz, 'dist-web');
const exigir = (condicion, mensaje) => { if (!condicion) { console.error(`✗ ${mensaje}`); process.exit(1); } };

// 1. Exportar la app web. Estas variables tienen prioridad sobre .env.local (que apunta al emulador).
const entorno = { ...process.env, EXPO_PUBLIC_KINETIA_IA_URL: '/api/rutina', EXPO_PUBLIC_KINETIA_DEMO: '1',
  EXPO_PUBLIC_KINETIA_IA_TOKEN: '' };
fs.rmSync(salida, { recursive: true, force: true });
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['expo', 'export', '--platform', 'web', '--output-dir', 'dist-web', '--clear'],
  { cwd: raiz, env: entorno, stdio: 'inherit', shell: process.platform === 'win32' });

// 2. Cloudflare descarta cualquier carpeta llamada node_modules al subir el sitio, y Expo deja ahí los recursos
//    de las librerías (entre ellos el .wasm de SQLite). Se renombra la carpeta y se corrigen sus referencias.
const recursos = path.join(salida, 'assets', 'node_modules');
if (fs.existsSync(recursos)) {
  fs.renameSync(recursos, path.join(salida, 'assets', 'paquetes'));
  const corregir = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) corregir(p);
      else if (/\.(js|html|json|css|map)$/.test(e.name)) {
        const texto = fs.readFileSync(p, 'utf8');
        if (texto.includes('assets/node_modules/')) fs.writeFileSync(p, texto.replaceAll('assets/node_modules/', 'assets/paquetes/'));
      }
    }
  };
  corregir(salida);
}

// Archivos que la app no usa y que coincidieron con la falla de la subida por arrastre (03-11): se quitan.
for (const sobra of ['+not-found.html', '_sitemap.html', path.join('_expo', '.routes.json')]) {
  fs.rmSync(path.join(salida, sobra), { force: true });
}

// 3. Revisar que el paquete apunte al servicio del sitio y no al emulador, y que no lleve claves.
const archivos = [];
const recorrer = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p); else archivos.push(p);
  }
};
recorrer(salida);
const js = archivos.filter((a) => a.endsWith('.js')).map((a) => fs.readFileSync(a, 'utf8')).join('\n');
exigir(js.includes('/api/rutina'), 'El paquete no apunta a /api/rutina.');
exigir(!js.includes('10.0.2.2'), 'El paquete todavía apunta al emulador (10.0.2.2).');
exigir(!/sk-ant-[A-Za-z0-9_-]{10,}/.test(js), 'El paquete contiene algo parecido a una clave de la API.');
exigir(archivos.some((a) => a.endsWith('.wasm')), 'Falta el archivo .wasm de SQLite.');
exigir(!archivos.some((a) => a.split(path.sep).includes('node_modules')), 'Quedó una carpeta node_modules (Cloudflare la ignora).');
exigir(!js.includes('assets/node_modules/'), 'Quedan referencias a assets/node_modules/.');

// 4. _worker.js: el sitio y el servicio de IA en un solo archivo (modo avanzado de Cloudflare Pages).
// El entorno de Cloudflare exige que la única exportación sea la por defecto (el manejador).
const sinExportar = (texto) => texto.replace(/^export (?=(?:async )?(?:const|let|function|class) )/gm, '');
const ia = sinExportar(fs.readFileSync(path.join(raiz, 'servidor', 'kinetia-ia.mjs'), 'utf8')
  .replace(/^export default .*$/m, ''));
const sitio = sinExportar(fs.readFileSync(path.join(raiz, 'servidor', 'sitio-web.mjs'), 'utf8')
  .replace(/^import .* from '\.\/kinetia-ia\.mjs';$/m, ''));
exigir(!/^import /m.test(ia + sitio), 'El worker quedó con importaciones externas.');
exigir((ia + sitio).match(/^export /gm)?.length === 1, 'El worker debe tener una sola exportación (default).');
fs.writeFileSync(path.join(salida, '_worker.js'),
  `// Generado por herramientas/preparar-web.mjs. No editar: cambia servidor/*.mjs.\n${ia}\n${sitio}`);

// 5. Límites de Cloudflare Pages (arrastrar y soltar): 1000 archivos y 25 MiB por archivo.
const total = archivos.length + 1;
const grande = archivos.find((a) => fs.statSync(a).size > 25 * 1024 * 1024);
exigir(total <= 1000, `Son ${total} archivos; el máximo es 1000.`);
exigir(!grande, `Archivo de más de 25 MiB: ${grande}`);
console.log(`\n✓ dist-web listo: ${total} archivos. Súbelo a Cloudflare Pages (ver herramientas/PUBLICAR_WEB.md).`);
