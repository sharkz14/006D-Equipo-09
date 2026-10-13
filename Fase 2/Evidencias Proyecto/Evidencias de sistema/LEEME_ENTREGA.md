# Kinetia — Evidencias de sistema, Fase 2

Karla Acuña Bravo · 13 de octubre de 2026

Esta entrega reúne el código de la app y la estructura de su base de datos local.
Corresponde a un avance para revisar con el profesor.

| Carpeta | Contenido |
|---|---|
| `Aplicacion` | Proyecto Expo, pantallas, CRUD del perfil, generador y piloto K06/K08. Su README explica cómo abrirlo. |
| `Base_de_datos` | Esquema SQL, base SQLite vacía y explicación de los campos. |

## Dónde subirlo

Extraer el ZIP y subir ambas carpetas, junto con este archivo, dentro de
`Fase 2/Evidencias Proyecto/Evidencias de sistema`.
Así el código queda visible en GitHub y se conserva la relación entre las carpetas.

## Qué se preparó

Se reemplazó el README de ejemplo por instrucciones en español y se agregó la evidencia
de SQLite. Se retiraron de esta copia los restos de Angular/Ionic sin referencias desde
la app actual: `src/assets`, `src/environments`, `src/theme`, `src/global.scss`,
`src/index.html`, `src/main.ts`, `src/polyfills.ts`, `src/test.ts` y `src/zone-flags.ts`.
`src/test.ts` era la configuración de pruebas de Angular, sin sus dependencias ni casos.

El código vigente, las pantallas, el modelo K06/K08, las versiones de dependencias y
`package-lock.json` se conservaron. La plantilla de Expo que aún utiliza la app también
se conservó. La copia original recibida en `Kinetia_revision.zip` no fue modificada.

La base incluida se generó vacía desde el esquema del código; no es una exportación del
emulador. Este paquete contiene código fuente y evidencia de datos, sin APK.
