# Pruebas automáticas de Kinetia

Las 8 suites de pruebas de la app y sus resultados (06-11-2026). Ninguna necesita la clave de la API ni internet: la IA
se reemplaza por respuestas simuladas. El detalle de cada prueba está en la sección 7 del documento técnico.

| Archivo | Qué revisa | Resultado |
|---|---|---|
| `prueba_cuestionario.mjs` | Reglas del cuestionario inicial y su conexión con el motor y la IA. | 9 de 9 |
| `prueba_carga_perfil.mjs` | Límites de carga según la edad y el IMC. | 14 de 14 |
| `prueba_sesion.mjs` | Sesión guiada, su registro, la base local (versión 3) y lo que se le informa a la IA. | 10 de 10 |
| `prueba_progresion.mjs` | Ajuste de la rutina siguiente y avance a variantes más exigentes. | 8 de 8 |
| `prueba_rutina_ia.mjs` | Solicitud sin nombre, validación de la respuesta de la IA y uso del respaldo. | 14 de 14 |
| `prueba_integracion_k11_k12.cjs` | Integración K11/K12 en el generador, comparada con el generador anterior en 6.758 configuraciones. | 7 de 7 |
| `prueba_seguridad.mjs` | Origen, contrato y token del servicio; que el nombre y la clave no se filtren. | 9 de 9 |
| `prueba_rendimiento.mjs` | Mide tiempos y tamaños (no aprueba ni reprueba). | — |

**Total: 71 de 71.** Cada suite guarda su resultado en `resultado_*.json`, en esta carpeta.

## Cómo correrlas (PowerShell)

Desde la carpeta `Aplicacion` (donde está `package.json`), con las dependencias instaladas (`npm ci`). Primero se
compila la lógica de la app (`src/lib`) en `pruebas\build`:

```powershell
npx tsc --ignoreConfig --ignoreDeprecations 6.0 --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck --rootDir src --outDir pruebas\build src/lib/generador.ts src/lib/carga-perfil.ts src/lib/cuestionario.ts src/lib/esquema.ts src/lib/sesion.ts src/lib/fichas.ts src/lib/nombres.ts src/lib/ia/rutina-ia.ts
cd pruebas
```

Luego, cada suite:

```powershell
node prueba_cuestionario.mjs build ..\servidor
node prueba_carga_perfil.mjs build ..\servidor
node prueba_sesion.mjs build ..\servidor
node prueba_progresion.mjs build ..\servidor
node prueba_rutina_ia.mjs build ..\servidor
node prueba_integracion_k11_k12.cjs build build_original paquete_integracion
node prueba_seguridad.mjs build ..\servidor ..\dist-web
node prueba_rendimiento.mjs build ..\servidor ..\assets\images\ejercicios
```

- **Seguridad:** revisa además el paquete web si existe la carpeta `dist-web` (se crea con
  `node herramientas\preparar-web.mjs`). Si no existe, se salta esa revisión y el resultado queda en 8 de 8.
- **Integración:** `build_original` es el generador anterior ya compilado, y `paquete_integracion` trae los casos de
  referencia del árbol K11/K12 de la Fase 2. La prueba los usa para comprobar que el resto del generador no cambió.
- **Rendimiento:** los tiempos dependen del computador, así que cada vez dan algo distinto.
- La carpeta `build` se puede borrar después; no se sube a GitHub.

La medición de tiempos reales de la IA (con clave) está aparte, en `herramientas\medir-tiempos-ia.mjs`; su resultado
está en `herramientas\resultado_tiempos_ia.json`.
