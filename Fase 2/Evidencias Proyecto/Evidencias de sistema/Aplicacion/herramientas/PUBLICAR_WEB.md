# Publicar Kinetia como sitio web (Cloudflare Pages, gratis)

La versión web sirve para mostrar el prototipo desde cualquier navegador sin instalar nada. El sitio incluye el servicio de
IA (`_worker.js`): la clave se guarda como **secreto** en Cloudflare y nunca viaja en la página.
Sitio actual: https://kinetia.pages.dev (proyecto `kinetia`, rama de producción `main`).

## 1. Preparar el paquete (en la carpeta del proyecto)
```powershell
node herramientas\preparar-web.mjs
```
Deja la carpeta `dist-web\` lista (unos 1,5 minutos). Si recibes un `.zip` ya preparado, extráelo en Descargas.

## 2. Publicar con Wrangler (recomendado)
La subida arrastrando archivos en el panel falló el 03-11 (se quedaba en 1/33), así que se publica desde PowerShell:
```powershell
npx wrangler@4 pages deploy .\dist-web --project-name kinetia --branch main
```
(o `.\kinetia-web-vN` si extrajiste un zip en Descargas). La primera vez Wrangler abre el navegador para iniciar sesión;
después queda iniciada. El aviso amarillo sobre `tsconfig` no importa. Si el proyecto no existe, Wrangler lo crea.

## 3. Agregar la clave de Claude como secreto (solo una vez)
1. Panel de Cloudflare → **Workers & Pages** → `kinetia` → **Settings** → **Variables and Secrets** → **Add**
   (entorno **Production**).
2. Tipo **Secret**, nombre `ANTHROPIC_API_KEY`, valor: tu clave. Guarda.
3. **No pegues la clave en la línea de comandos, en el chat, en archivos del proyecto ni en GitHub.**
4. El secreto se aplica en la **siguiente** publicación: vuelve a ejecutar el paso 2. Después se conserva en cada
   publicación.

## 4. Comprobar
- `https://kinetia.pages.dev/api/estado` debe mostrar `"modo":"claude"`. Si dice `"sin_clave"`, falta el paso 3.
- Abre `https://kinetia.pages.dev`, responde el cuestionario, toca **Preparar mi rutina** y **Generar rutina con IA**
  (unos 10 s).

## Notas
- Los datos (perfil, respuestas, sesiones) se guardan en el navegador de cada equipo. En un PC compartido, al terminar:
  **Perfil → Eliminar perfil**. No uses ventana de incógnito: puede impedir que se guarden.
- `/api/rutina` solo acepta pedidos desde la propia página y solo arma rutinas de Kinetia (no acepta texto libre).
- Para apagar la IA: borra el secreto `ANTHROPIC_API_KEY` y vuelve a publicar. La app seguirá funcionando con la rutina
  por reglas y avisará el motivo.
- Sin clave y sin gasto: agrega la variable `KINETIA_SIMULADO` = `1` (respuestas simuladas; la rutina dice «Modo de prueba»).
- Modo demostración: la web muestra las fichas en borrador (como en Expo Go), con el aviso de prototipo.
- Si una clave queda a la vista (captura, consola), bórrala en la consola de Anthropic, crea otra y repite el paso 3.
