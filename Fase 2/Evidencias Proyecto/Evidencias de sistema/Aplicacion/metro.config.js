// Configuración de Metro para la versión web.
// expo-sqlite usa un archivo .wasm en el navegador y necesita aislamiento entre orígenes
// (SharedArrayBuffer). En el teléfono no cambia nada.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

// Solo para `npx expo start --web`; el sitio publicado envía estas cabeceras desde _worker.js.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
