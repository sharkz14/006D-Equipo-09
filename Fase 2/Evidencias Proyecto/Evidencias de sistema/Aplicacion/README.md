# Kinetia — Avance de Fase 2

**Autora:** Karla Acuña Bravo · Ingeniería Informática · Duoc UC, sede Maipú  
**Fecha de esta entrega:** 13 de octubre de 2026

Estoy desarrollando Kinetia como una app de fuerza y control corporal que complemente
el baile urbano. Está pensada para personas adultas de nivel principiante o intermedio,
usando peso corporal o una mancuerna. Esta versión permite revisar el avance y recibir
comentarios del profesor.

## Qué está implementado

- Crear, consultar, editar y eliminar un perfil local con SQLite.
- Guardar nombre, edad, peso, estatura y nivel. La edad mínima es 18 años.
- Configurar nivel, duración referencial de 20, 30 o 40 minutos, equipamiento y exclusiones por familia.
- Ver una rutina preliminar con ejercicios, dosis, descansos, secuencia y omisiones.
- Consultar un árbol experimental para elegir entre K06 y K08 cuando se cumplen las condiciones del piloto.

El nivel del perfil se usa como selección inicial y puede cambiarse para una rutina.
Peso y estatura se guardan, pero no ajustan automáticamente la intensidad ni los ejercicios.
La configuración y la rutina generada se mantienen en memoria; todavía no se guardan como historial.

## Cómo abrir la app en Android

Se necesita Node.js y npm compatibles con las dependencias del proyecto, Android Studio
con un emulador iniciado y Expo Go compatible con el SDK del proyecto. Las versiones
declaradas son Expo `~57.0.27`, React Native `0.86.3`, React `19.2.3` y TypeScript `~6.0.3`.
`package-lock.json` conserva las versiones resueltas.

1. Abrir una terminal dentro de esta carpeta `Aplicacion`, donde está `package.json`.
2. Instalar las dependencias:

   ```bash
   npm ci
   ```

3. Con el emulador abierto, iniciar Expo:

   ```bash
   npx expo start
   ```

4. Presionar `a` en esa terminal para abrir la app en Android. Mantener la terminal abierta durante la revisión.

No se requieren claves, variables de entorno ni un servidor de base de datos.
La instalación de dependencias necesita conexión a Internet. La plataforma revisada
durante el desarrollo es Android; esta entrega no acredita funcionamiento en iOS ni web.

## Recorrido para la demostración

1. En **Perfil**, crear un perfil de prueba con datos ficticios.
2. Editar un dato, guardar y comprobar el cambio. Volver a abrir la app permite revisar la persistencia.
3. En **Rutina**, elegir las opciones y completar las confirmaciones para abrir **Ver rutina**.
4. Para revisar K06/K08, usar nivel intermedio, 20 minutos, peso corporal y ninguna exclusión.
   El cuestionario del piloto aparece en desarrollo. La dosis previa debe coincidir con
   la del experimento cuando existe experiencia previa; en otro caso se usa la selección por reglas.
5. Al terminar la prueba, se puede eliminar el perfil ficticio y comprobar que la app solicita crear uno nuevo.

## Cómo está organizado

| Ruta | Para qué sirve |
|---|---|
| `src/app/index.tsx` | Configuración y apertura de la vista de rutina. |
| `src/app/perfil.tsx` | Formulario y acciones del perfil. |
| `src/app/_layout.tsx` | Navegación y estado compartido del perfil. |
| `src/components/perfil-provider.tsx` | Sincronización entre el perfil y la configuración. |
| `src/components/vista-rutina.tsx` | Vista previa de la rutina. |
| `src/lib/perfil.ts` | Validaciones, creación del esquema SQLite y operaciones CRUD. |
| `src/lib/generador.ts` | Catálogo incorporado, filtros, selección y montaje de la rutina. |
| `src/lib/ia` | Modelo K06/K08, lectura de respuestas e inferencia local. |
| `assets` | Recursos utilizados por la app y la plantilla de Expo. |

El esquema y una base vacía están en [`../Base_de_datos`](../Base_de_datos/README.md).
La app crea su propia `kinetia.db` automáticamente en el dispositivo; no hay que copiarle
el archivo de evidencia. Por ahora la única tabla es `perfil`, con un perfil por instalación.

## Lo que sigue pendiente

El contenido de ejercicios sigue en revisión. En desarrollo se muestran borradores y
el generador conserva `ejecutable: false`; en una compilación de producción todavía
no hay ejercicios habilitados. Entrenar, finalizar una sesión e historial siguen pendientes.

La selección experimental integrada es K06/K08. Los ejercicios K11 y K12 sí están en
el catálogo, pero su modelo de IA todavía no está integrado en esta copia.
La pestaña **Explore** y algunos recursos visuales siguen siendo de la plantilla Expo.

La app no evalúa técnica ni acredita eficacia física. La duración es orientativa.
Los resultados del ensayo previo del generador y los documentos del proyecto se
entregan por separado en las evidencias de documentación.

## Verificación de esta copia

El 13 de octubre de 2026 se comprobó esta entrega con Node.js 24.19.0:

- Instalación de las dependencias fijadas mediante `npm ci --ignore-scripts`.
- Revisión de tipos con `npx tsc --noEmit`, sin errores, después de que `npx expo start`
  generara los archivos de tipos que Expo crea automáticamente.
- Exportación del paquete de Android con `npx expo export --platform android`, completada correctamente.
- Integridad de la base vacía y operaciones de crear, consultar, actualizar y eliminar
  sobre su esquema en una base temporal, incluyendo sus restricciones de datos.

La exportación verifica el empaquetado; la ejecución interactiva de esta copia en un
emulador queda por comprobar. Estas comprobaciones no generan un APK ni sustituyen
las pruebas del flujo completo de la app.

## Referencias de ejecución

- [Iniciar el proyecto y abrir el emulador — Expo](https://docs.expo.dev/get-started/start-developing/)
- [Instalación con el archivo de dependencias fijadas — npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

Se conserva la licencia de la plantilla Expo en `LICENSE`.
