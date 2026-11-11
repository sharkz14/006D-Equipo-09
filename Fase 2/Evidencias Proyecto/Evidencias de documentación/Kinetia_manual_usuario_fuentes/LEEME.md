# Fuentes del manual de usuario

Archivos con los que se armó `Kinetia_manual_usuario_v1.0.docx` (noviembre de 2026). No hace falta abrirlos para leer
el manual: el Word y el PDF ya están en la carpeta anterior.

| Archivo | Contenido |
|---|---|
| `generar_manual.js` | Script que arma el Word. |
| `img/` | Las 25 capturas que usa el manual. |
| `capturas.cjs` | Script que tomó las capturas (registro de cómo se hicieron). |
| `logo_duoc.png` | Logo de la portada. |

## Sobre las capturas

- Son de la versión web 10, en tamaño de teléfono, con «Camila», una persona de ejemplo inventada.
- Los textos de la IA que aparecen son una respuesta real de Claude, guardada con
  `Aplicacion/herramientas/respuestas-para-capturas.mjs` (resultado en `respuestas_capturas_ia.json`, en esa misma
  carpeta).
- `capturas.cjs` necesita Playwright y la versión web servida en el computador:
  `node capturas.cjs <dirección> <carpeta_salida> [respuestas_capturas_ia.json]`.

## Cómo volver a armar el Word (opcional)

En esta carpeta, con Node.js:

```powershell
npm install docx@9
node generar_manual.js
```

Deja `manual_usuario_kinetia.docx` aquí mismo. La carpeta `node_modules` que se crea no se sube a GitHub.
