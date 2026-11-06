# Kinetia · Aplicación

**Autora:** Karla Acuña Bravo · Ingeniería Informática · Duoc UC, sede Maipú  
**Versión:** noviembre de 2026 (versión web 10)

Kinetia es una app que arma rutinas de fuerza y control corporal para personas adultas que practican baile urbano. La
persona responde un cuestionario breve. Un motor de reglas deja solo los ejercicios compatibles y fija límites de carga
según la edad y el IMC. Luego, una IA generativa (Claude, de Anthropic) elige un ejercicio por bloque, ajusta la dosis
dentro de esas opciones y explica por qué. La app valida la propuesta antes de mostrarla y, si la IA no responde o se
equivoca, usa la rutina por reglas.

**Pruébala en la web:** https://kinetia.pages.dev (no necesita instalación ni cuenta).

## Qué hace esta versión

- **Cuestionario inicial** adaptativo: perfil (edad, peso, estatura), estilos de baile, experiencia y lo que se prefiere
  evitar. El perfil se puede consultar, editar y eliminar (SQLite local).
- **Preparar la sesión:** ajustes del día y dos confirmaciones de seguridad obligatorias antes de generar la rutina.
- **Rutina con IA:** elección y dosis con el porqué de cada ejercicio, validada por el motor. Si la IA falla, usa la
  rutina por reglas y avisa el motivo.
- **Límites de carga por edad e IMC**, que se aplican con o sin IA.
- **Sesión guiada** paso a paso, con 18 animaciones propias, técnica paso a paso, descansos cronometrados y
  «Detener por dolor».
- **Registro y progresión:** «¿Cómo te fue?» ajusta la próxima rutina. Con dos sesiones seguidas fáciles, completas y
  sin molestias, se avanza a una variante más exigente.
- **Versión web** con el servicio de IA en la misma dirección (Cloudflare Pages).

## Cómo abrirla en el PC (Android)

**Se necesita:**
- Node.js (versión LTS) y npm.
- El emulador de Android Studio o Expo Go en un teléfono.

Versiones declaradas: Expo `~57.0.27`, React Native `0.86.3`, React `19.2.3` y TypeScript `~6.0.3`. Las versiones
exactas están en `package-lock.json`.

1. En esta carpeta (donde está `package.json`), instala las dependencias:
   ```powershell
   npm ci
   ```
2. Copia `.env.example` como `.env.local`. Ya trae la dirección con la que el emulador llega al PC:
   ```
   EXPO_PUBLIC_KINETIA_IA_URL=http://10.0.2.2:8787
   ```
   Sin este archivo, la app funciona igual, pero solo con la rutina por reglas.
3. **Ventana 1 de PowerShell: el servicio de IA.**
   - Con Claude:
     ```powershell
     $env:ANTHROPIC_API_KEY="tu clave"
     node servidor\local.mjs
     ```
   - Sin clave ni costo (modo de prueba: la rutina mostrará «Modo de prueba»):
     ```powershell
     $env:KINETIA_SIMULADO="1"
     node servidor\local.mjs
     ```
4. **Ventana 2 de PowerShell: la app.** Con el emulador abierto, ejecuta lo siguiente y presiona `a`:
   ```powershell
   npx expo start -c
   ```

La clave queda solo en la ventana del servidor: nunca va en la app, en archivos del proyecto ni en GitHub. Para revisar
una clave sin abrir la app: `node servidor\probar-clave.mjs`. Más detalles en [`servidor/LEEME.md`](servidor/LEEME.md).

## Recorrido sugerido para revisarla

1. Responde el cuestionario con datos ficticios. Si eliges «Sí, llevo 6 meses o más», aparecen las preguntas con
   animación.
2. En el inicio, toca **Preparar mi rutina**, marca las dos confirmaciones y toca **Generar rutina con IA**. La respuesta
   tarda unos 10 segundos.
3. Revisa **Por qué lo eligió la IA** en cada ejercicio y toca **Empezar sesión**.
4. Avanza la sesión guiada y, al final, responde **¿Cómo te fue?**. El inicio mostrará la semana y la progresión.
5. Para probar el respaldo, detén el servicio de IA y genera otra rutina: aparece «Se usó la rutina habitual» con el
   motivo.

El manual de usuario explica cada pantalla con capturas.

## Configuración

| Variable | Dónde | Para qué |
|---|---|---|
| `EXPO_PUBLIC_KINETIA_IA_URL` | App (`.env.local`) | Dirección del servicio de IA. Sin ella, solo reglas. |
| `EXPO_PUBLIC_KINETIA_IA_TOKEN` | App (`.env.local`) | Opcional; debe coincidir con `KINETIA_TOKEN`. No es secreto. |
| `EXPO_PUBLIC_KINETIA_DEMO` | App (web) | Modo demostración: muestra las fichas en borrador con el aviso de prototipo. |
| `ANTHROPIC_API_KEY` | Servidor (secreto) | Clave de la API de Claude. |
| `KINETIA_MODELO` | Servidor | Modelo de Claude; por defecto, `claude-haiku-5-5`. |
| `KINETIA_SIMULADO` | Servidor | `1` = modo de prueba, sin clave ni costo. |
| `KINETIA_TOKEN` | Servidor | Opcional: exige un token compartido. |
| `PORT` | Servidor local | Puerto; por defecto, 8787. |

## Publicar la versión web

```powershell
node herramientas\preparar-web.mjs
npx wrangler@4 pages deploy .\dist-web --project-name kinetia --branch main
```

La clave se guarda una sola vez como secreto `ANTHROPIC_API_KEY` en el panel de Cloudflare. Paso a paso en
[`herramientas/PUBLICAR_WEB.md`](herramientas/PUBLICAR_WEB.md).

## Cómo está organizada

| Ruta | Para qué sirve |
|---|---|
| `src/app/` | Pantallas: inicio y rutina (`index.tsx`), perfil y «Cómo funciona». |
| `src/components/` | Cuestionario, sesión guiada, vista de la rutina, animaciones, marca y movimiento. |
| `src/lib/generador.ts` | Motor de reglas: catálogo, plantillas, filtros, validación de la propuesta de la IA. |
| `src/lib/carga-perfil.ts` | Límites de carga por edad e IMC. |
| `src/lib/ia/rutina-ia.ts` | Cliente de IA: arma la solicitud sin nombre, espera hasta 45 s, valida y usa el respaldo. |
| `src/lib/perfil.ts`, `esquema.ts` | SQLite local (versión 3: perfil, cuestionario y sesiones) y sus migraciones. |
| `src/lib/cuestionario.ts`, `sesion.ts` | Reglas del cuestionario, pasos de la sesión, registro y progresión. |
| `src/lib/fichas.ts`, `nombres.ts` | Fichas técnicas y nombres amigables de los ejercicios. |
| `servidor/` | Servicio de IA (`kinetia-ia.mjs`), servidor local, sitio web de Cloudflare y prueba de la clave. |
| `herramientas/` | Preparar la web, optimizar animaciones, evaluar la IA y medir sus tiempos. |
| `evidencias/` | Animaciones originales, ficha K05 y la evaluación de la IA con el preparador físico. |
| `assets/images/ejercicios/` | Animaciones optimizadas que usa la app. |

`src/lib/ia/` conserva además los árboles de decisión de la Fase 2 (K06/K08 y K11/K12). Sirvieron de comparación
para evaluar la IA; el flujo actual no los usa.

## Pruebas

71 pruebas automáticas (unitarias, de integración y de seguridad), todas correctas al 06-11-2026, más una prueba de
rendimiento que mide tiempos.

La revisión de tipos (`npx tsc --noEmit`) no da errores. Los scripts, sus resultados y cómo correrlos están en la
documentación de la Fase 3 (ver el README principal del repositorio).

## Límites de esta versión

- Es un prototipo académico: las fichas, las dosis y los nombres de los ejercicios están en revisión con un preparador
  físico.
- Se probó en el emulador de Android y en navegadores; falta probarla en un teléfono físico y en iOS.
- Los datos se guardan solo en el dispositivo, sin cuentas ni respaldo en la nube.
