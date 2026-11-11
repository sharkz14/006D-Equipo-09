// Documento técnico de Kinetia (Fase 3). Genera documento_tecnico_kinetia.docx.
// Se arma por secciones: cada sección es una función que devuelve párrafos y tablas.
const fs = require('fs');
const path = require('path');
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat, Packer, PageBreak,
  PageNumber, Paragraph, ShadingType, Table, TableCell, TableOfContents, TableRow, Tab, TabStopType, TextRun, WidthType,
} = require('docx');

const DIR = __dirname;
const AZUL = '00263A';
const GRIS = '5A6270';
const NEGRO = '1A1A1A';
const ANCHO = 9026; // A4 con márgenes de 2,5 cm (1418 DXA por lado)

// ---------- utilidades ----------
const t = (texto, opc = {}) => new TextRun({ text: texto, ...opc });
const p = (contenido, opc = {}) => new Paragraph({
  children: typeof contenido === 'string' ? [t(contenido)] : contenido,
  spacing: { after: 120, line: 300 }, ...opc,
});
const h1 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [t(texto)] });
const h2 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(texto)] });
const vineta = (contenido, opc = {}) => new Paragraph({
  numbering: { reference: 'vinetas', level: 0 },
  children: typeof contenido === 'string' ? [t(contenido)] : contenido,
  spacing: { after: 80, line: 290 }, ...opc,
});
// El párrafo justo antes de una figura viaja con ella a la página siguiente si no cabe.
const conFigura = { keepNext: true };
const negrita = (texto) => t(texto, { bold: true });
const codigo = (texto) => t(texto, { font: 'Consolas', size: 20 });
const codigoT = (texto) => t(texto, { font: 'Consolas', size: 17 }); // código dentro de tablas
const salto = () => new Paragraph({ children: [new PageBreak()] });

function imagen(archivo, anchoPx, leyenda) {
  const ruta = path.join(DIR, archivo);
  const datos = fs.readFileSync(ruta);
  // Proporción real del PNG (ancho y alto en la cabecera IHDR).
  const w = datos.readUInt32BE(16);
  const hgt = datos.readUInt32BE(20);
  const alto = Math.round(anchoPx * hgt / w);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
      children: [new ImageRun({ type: 'png', data: datos, transformation: { width: anchoPx, height: alto } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [t(leyenda, { italics: true, size: 19, color: GRIS })],
    }),
  ];
}

const borde = { style: BorderStyle.SINGLE, size: 4, color: 'C9CED6' };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

function tabla(anchos, encabezado, filas) {
  const celda = (contenido, ancho, esEncabezado) => new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    borders: bordes,
    shading: esEncabezado ? { fill: 'E6ECF2', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: (Array.isArray(contenido) ? contenido : [contenido]).map((c) => new Paragraph({
      spacing: { after: 40, line: 264 },
      children: typeof c === 'string' ? [t(c, { bold: esEncabezado, size: 19 })] : c,
    })),
  });
  return new Table({
    width: { size: anchos.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: anchos,
    rows: [
      new TableRow({ tableHeader: true, children: encabezado.map((e, i) => celda(e, anchos[i], true)) }),
      ...filas.map((fila) => new TableRow({ cantSplit: true, children: fila.map((c, i) => celda(c, anchos[i], false)) })),
    ],
  });
}
const pequeno = (texto, opc = {}) => t(texto, { size: 19, ...opc });

// ---------- portada ----------
// Sobria: logo arriba a la izquierda, título a la izquierda con una línea fina y los datos al pie de la página.
function portada() {
  const logo = fs.readFileSync(path.join(DIR, 'logo_duoc.png'));
  const dato = (etiqueta, valor, primero) => new Paragraph({
    spacing: { before: primero ? 0 : 0, after: 90 },
    tabStops: [{ type: TabStopType.LEFT, position: 2000 }],
    children: [t(etiqueta, { size: 21, color: GRIS }), new TextRun({ children: [new Tab()] }), t(valor, { size: 21, color: NEGRO })],
  });
  return [
    new Paragraph({
      spacing: { after: 0 },
      children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 190, height: Math.round(190 * 315 / 1280) } })],
    }),
    new Paragraph({ spacing: { before: 3600, after: 120 },
      children: [t('DOCUMENTO TÉCNICO', { size: 22, bold: true, color: GRIS, characterSpacing: 40 })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [t('Kinetia', { size: 84, bold: true, color: NEGRO })] }),
    new Paragraph({
      spacing: { after: 0, line: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 14 } },
      children: [t('Aplicación de rutinas de fuerza y control corporal generadas con inteligencia artificial para adultos que practican baile urbano', { size: 26, color: GRIS })],
    }),
    new Paragraph({ spacing: { before: 4300, after: 0 }, children: [] }),
    dato('Asignatura', 'Capstone (PTY4614)', true),
    dato('Equipo', '09 · trabajo individual'),
    dato('Autora', 'Karla Acuña Bravo'),
    dato('Docente', 'Aldo Alberto Martínez Órdenes'),
    dato('Fase', 'Fase 3'),
    dato('Fecha', 'Noviembre de 2026'),
    salto(),
  ];
}

// ---------- índice ----------
function indice() {
  return [
    new Paragraph({ spacing: { after: 200 }, children: [t('Índice', { size: 32, bold: true, color: AZUL })] }),
    new TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-2' }),
  ];
}

// ---------- 1. Introducción ----------
function introduccion() {
  return [
    h1('1. Introducción'),
    h2('1.1 Propósito del documento'),
    p('Este documento describe la solución técnica de Kinetia: su arquitectura, el modelo de datos, los diagramas UML de la funcionalidad principal, los requisitos no funcionales, el despliegue, las pruebas realizadas y lo que la hace innovadora. Corresponde a la versión de noviembre de 2026, publicada como versión web 10 y registrada en el repositorio del proyecto.'),
    h2('1.2 Qué es Kinetia'),
    p('Kinetia es una aplicación móvil que arma rutinas de fuerza y control corporal para adultos que practican baile urbano, como complemento a su entrenamiento de baile. No enseña pasos ni evalúa la técnica, y no ofrece diagnóstico ni rehabilitación.'),
    p('La personalización ocurre en tres capas:'),
    vineta([negrita('Lo que la persona cuenta: '), t('un cuestionario inicial recoge su nivel, experiencia, tiempo disponible, equipamiento, estilos de baile y lo que prefiere evitar; el perfil guarda su edad, peso y estatura.')]),
    vineta([negrita('Lo que las reglas permiten: '), t('un motor de reglas deja solo los ejercicios compatibles con su sesión y fija límites de carga según su edad y su índice de masa corporal.')]),
    vineta([negrita('Lo que decide la IA: '), t('un modelo de lenguaje (Claude, de Anthropic) elige un ejercicio por bloque y ajusta series, intensidad y descanso dentro de esas opciones cerradas, y explica por qué. La app vuelve a validar la propuesta antes de mostrarla.')]),
    p('Después, la persona sigue una sesión guiada paso a paso y responde cómo le fue. La siguiente rutina tiene en cuenta esa respuesta y, con dos sesiones seguidas fáciles, completas y sin molestias, avanza a una variante más exigente.'),
    h2('1.3 Alcance de la versión actual'),
    tabla([2600, 6426], ['Aspecto', 'Alcance'], [
      ['Catálogo', '14 ejercicios principales (K01 a K14) con ficha técnica y 5 de calentamiento y cierre con indicaciones paso a paso; 18 de los 19 tienen una animación de referencia.'],
      ['Equipamiento', 'Peso corporal o una mancuerna.'],
      ['Sesiones', '20, 30 o 40 minutos; niveles principiante e intermedio.'],
      ['Datos', 'Se guardan solo en el dispositivo (SQLite). El nombre nunca se envía a la IA.'],
      ['Plataformas', 'Android mediante Expo Go y versión web publicada en https://kinetia.pages.dev.'],
      ['Fuera de alcance', 'Planificación semanal, registro de cargas, cuentas de usuario o sincronización en la nube, y la validación profesional definitiva de fichas y dosis (pendiente con el preparador físico).'],
    ]),
    h2('1.4 Metodología de trabajo'),
    p('El trabajo se organizó con un enfoque Kanban, dentro de las fases que fija la asignatura: flujo continuo de tareas, un cambio a la vez y entregas incrementales. Cada cambio siguió la misma política: primero se planteaba la propuesta, luego se revisaba una vista previa, se aprobaba y solo entonces se aplicaba en la aplicación. Esto permitió publicar versiones funcionales sucesivas (de la versión web 2 a la 10) sin perder estabilidad.'),
    p('La evidencia de ese flujo es el historial de versiones, los commits del repositorio y los documentos de cada cambio (decisiones, evaluaciones y revisiones), no un tablero formal.'),
  ];
}

// ---------- 2. Arquitectura ----------
function arquitectura() {
  return [
    h1('2. Arquitectura'),
    h2('2.1 Vista general'),
    p('Kinetia usa una arquitectura cliente-servidor liviana con un servicio de IA externo. La lógica que protege a la persona (qué ejercicios son compatibles y cuánta carga se permite) vive en el dispositivo; el servidor solo media con la API de Claude y resguarda la clave de acceso.'),
    ...imagen('arquitectura.png', 540, 'Figura 1. Diagrama de arquitectura de Kinetia.'),
    h2('2.2 Componentes'),
    tabla([2300, 2400, 4326], ['Componente', 'Tecnología', 'Responsabilidad'], [
      ['Interfaz de usuario', 'React Native 0.86, Expo SDK 57, Expo Router, TypeScript', 'Pantallas de cuestionario, inicio, preparación de la sesión, vista de la rutina, sesión guiada, perfil y «Cómo funciona».'],
      ['Motor de reglas', 'TypeScript (generador.ts, carga-perfil.ts)', 'Arma la estructura según la duración, filtra ejercicios por nivel, equipo y exclusiones, fija topes de carga por edad e IMC y valida toda propuesta.'],
      ['Cliente de IA', 'TypeScript (rutina-ia.ts)', 'Envía la solicitud al servidor, espera como máximo 45 segundos, valida la respuesta y la convierte en rutina. Ante cualquier problema, entrega la rutina por reglas con el motivo.'],
      ['Sesión guiada y registro', 'TypeScript (sesion.ts) y componente de sesión', 'Divide la rutina en pasos, series, lados y descansos; registra lo realizado, el esfuerzo y si hubo dolor; calcula la progresión.'],
      ['Base de datos local', 'SQLite con expo-sqlite (esquema v3)', 'Guarda perfil, respuestas del cuestionario e historial de sesiones en el dispositivo, con migraciones de versión.'],
      ['Servidor de IA', 'Node.js 18 o superior, sin dependencias (kinetia-ia.mjs)', 'Construye la petición a Claude con un esquema JSON cerrado (solo ejercicios y dosis permitidos), normaliza la salida y oculta la clave.'],
      ['Sitio web', 'Cloudflare Pages (_worker.js = sitio-web.mjs + kinetia-ia.mjs)', 'Sirve la versión web y expone el servicio de IA en la misma dirección; solo acepta pedidos desde la propia página.'],
      ['Modelo de lenguaje', 'API de Claude (Anthropic), modelo claude-haiku-5-5', 'Elige un ejercicio por bloque y ajusta la dosis dentro de las opciones recibidas; redacta el resumen y los motivos.'],
    ]),
    h2('2.3 Comunicación entre servicios'),
    p('Toda la comunicación usa HTTPS y JSON. La app no conoce la clave de la API: solo habla con el servidor de IA.'),
    tabla([2200, 2000, 4826], ['Comunicación', 'Origen → destino', 'Contenido'], [
      [[[codigo('POST /api/rutina')]], 'App → servidor de IA', [[pequeno('Contrato '), codigo('kinetia-rutina-ia-0.2'), pequeno('. Envía el perfil sin nombre (edad, peso, estatura y nivel), la sesión elegida, los bloques con sus ejercicios compatibles y topes de carga, y antecedentes breves (respuestas del cuestionario y cómo le fue en la última sesión). Recibe el modelo usado, un resumen y, por bloque, el ejercicio elegido con su dosis y motivo.')]]],
      [[[codigo('GET /api/estado')]], 'Navegador → sitio web', 'Informa si el servicio funciona con Claude, en modo simulado o sin clave. Sirve para comprobar la publicación.'],
      ['Messages API', 'Servidor de IA → Anthropic', 'Petición a https://api.anthropic.com/v1/messages con la clave guardada como secreto del servidor y un esquema JSON que enumera las opciones válidas.'],
    ]),
    p([negrita('Restricciones de la respuesta. '), t('La IA solo puede elegir ejercicios de la lista de cada bloque; las series deben ser iguales o menores que las de la ficha; la intensidad puede ser completa, reducida (cerca del 75 %) o mínima (cerca del 50 %), y el descanso, estándar o ampliado en 30 segundos. La IA nunca puede subir la dosis, y la app vuelve a aplicar los topes de carga al montar la rutina.')]),
    p([negrita('Protecciones del canal. '), t('En la versión web, el servicio rechaza (error 403) cualquier pedido que no venga de la propia página. En la ejecución local se puede exigir además un token compartido (KINETIA_TOKEN).')]),
    h2('2.4 Manejo de fallas'),
    p('La aplicación funciona aunque la IA no esté disponible. Usa la rutina generada solo con reglas, y avisa a la persona con el motivo («Se usó la rutina habitual»), en estos casos:'),
    vineta('No hay un servicio de IA configurado.'),
    vineta('El servidor no responde en 45 segundos o devuelve un error.'),
    vineta('La respuesta no es válida, está incompleta, elige un ejercicio fuera de la lista o intenta superar la dosis permitida.'),
    p('Así, la IA aporta la personalización y la explicación, pero nunca es un punto único de falla ni puede saltarse las reglas de seguridad.'),
  ];
}

// ---------- 3. Modelo de datos ----------
function modeloDatos() {
  const anchos = [2500, 1150, 2550, 2826];
  const enc = ['Campo', 'Tipo', 'Valores permitidos', 'Para qué se usa'];
  const c = (texto) => [[codigo(texto)]];
  const tituloTabla = (texto) => p([negrita(texto)], { spacing: { before: 200, after: 100 }, keepNext: true });
  return [
    h1('3. Modelo de datos'),
    h2('3.1 Dónde se guardan los datos'),
    p('Kinetia guarda sus datos en una base SQLite local (archivo kinetia.db), mediante la librería expo-sqlite. En el teléfono, la base vive en el almacenamiento de la aplicación; en la versión web, la misma base funciona dentro del navegador. No hay una base de datos en un servidor: el servidor de IA no guarda las solicitudes, solo las procesa.'),
    p('El modelo es relacional y tiene tres tablas, por eso se presenta como un diagrama entidad-relación clásico.'),
    h2('3.2 Diagrama entidad-relación'),
    ...imagen('er.png', 470, 'Figura 2. Modelo entidad-relación de la base local (esquema versión 3).'),
    p('Las relaciones son dos:'),
    vineta([negrita('Perfil – cuestionario (uno a uno): '), t('el cuestionario usa el mismo identificador que el perfil, como clave primaria y foránea a la vez, con borrado en cascada.')]),
    vineta([negrita('Perfil – sesión (uno a muchos): '), t('es una relación lógica. Como cada dispositivo tiene un único perfil (id = 1), todas las sesiones le pertenecen y la tabla sesion no necesita repetir esa clave. Al eliminar el perfil, la aplicación borra también el historial, en la misma transacción.')]),
    h2('3.3 Diccionario de datos'),
    tituloTabla('Tabla perfil: datos de la persona'),
    tabla(anchos, enc, [
      [c('id'), 'INTEGER', 'Clave primaria; siempre 1', 'Hay un solo perfil por dispositivo.'],
      [c('nombre'), 'TEXT', 'De 1 a 80 caracteres', 'Saludar a la persona. Nunca se envía a la IA.'],
      [c('edad'), 'INTEGER', 'Número entero, 18 o más', 'Fijar topes de carga según la edad.'],
      [c('peso_kg'), 'REAL', 'Mayor que 0', 'Calcular el IMC junto con la estatura.'],
      [c('estatura_cm'), 'REAL', 'Mayor que 0', 'Calcular el IMC junto con el peso.'],
      [c('nivel'), 'TEXT', 'P (principiante) o I (intermedio)', 'Elegir la plantilla y los ejercicios.'],
      [c('creado_en'), 'TEXT', 'Fecha y hora ISO 8601', 'Registro de creación.'],
      [c('actualizado_en'), 'TEXT', 'Fecha y hora ISO 8601', 'Registro del último cambio.'],
    ]),
    tituloTabla('Tabla cuestionario: respuestas del cuestionario inicial'),
    tabla(anchos, enc, [
      [c('id'), 'INTEGER', 'Clave primaria y foránea a perfil.id; siempre 1', 'Una respuesta por perfil; se borra con él.'],
      [c('estilos'), 'TEXT', 'Lista JSON: hip_hop, girly, kpop, vogue, otro', 'Contexto para la IA.'],
      [c('fuerza'), 'TEXT', 'no, menos_6_meses, 6_meses_o_mas', 'Experiencia en ejercicios de fuerza; sugiere el nivel (6 meses o más: intermedio).'],
      [c('mancuerna'), 'INTEGER', '0 o 1', 'Si tiene una mancuerna; define el equipamiento.'],
      [c('duracion'), 'INTEGER', '20, 30 o 40', 'Duración preferida de la sesión, en minutos.'],
      [c('puente_una_pierna'), 'TEXT', 'Opcional: nunca, me_sale_bien, me_cuesta, hace_mucho, no_se', 'Experiencia con el puente a una pierna. Solo se pregunta a quien entrena fuerza hace 6 meses o más; es un antecedente para la IA.'],
      [c('dead_bug_extension'), 'TEXT', 'Opcional: mismos valores', 'Lo mismo para el dead bug con extensión.'],
      [c('core_suelo'), 'TEXT', 'seguido, a_veces, no, lo_deje', 'Frecuencia de trabajo de core en el suelo; antecedente para la IA.'],
      [c('evitar'), 'TEXT', 'Lista JSON: suelo, rodillas, una_pierna', 'Ejercicios que el motor de reglas excluye.'],
      [c('actualizado_en'), 'TEXT', 'Fecha y hora ISO 8601', 'Registro del último cambio.'],
    ]),
    tituloTabla('Tabla sesion: historial de sesiones realizadas'),
    tabla(anchos, enc, [
      [c('id'), 'INTEGER', 'Clave primaria autoincremental', 'Orden de las sesiones.'],
      [c('fecha'), 'TEXT', 'Fecha y hora ISO 8601', 'Cuándo terminó; sirve para la semana y los días sin entrenar.'],
      [c('plantilla'), 'TEXT', 'Nivel + minutos + equipo; p. ej. P20, I30_PC, I40_M1', 'Estructura de sesión usada.'],
      [c('nivel'), 'TEXT', 'P o I', 'Nivel con que se generó la rutina.'],
      [c('duracion'), 'INTEGER', '20, 30 o 40', 'Duración de la sesión.'],
      [c('origen'), 'TEXT', 'ia o reglas', 'Quién eligió los ejercicios.'],
      [c('ejercicios'), 'TEXT', 'Lista JSON de 1 a 8 elementos {id, series, hechas}', 'Lo planificado y lo realizado por ejercicio.'],
      [c('completada'), 'INTEGER', '0 o 1', 'Todas las series hechas y sin detener por dolor.'],
      [c('detenida_por_dolor'), 'INTEGER', '0 o 1', 'Si la persona detuvo la sesión por dolor.'],
      [c('esfuerzo'), 'TEXT', 'Opcional: facil, adecuada, dificil', 'Respuesta a «¿Cómo te fue?».'],
      [c('dolor'), 'INTEGER', '0 o 1', 'Si hubo molestias; impide avanzar de variante.'],
    ]),
    h2('3.4 Integridad y versiones'),
    vineta([negrita('Reglas en la propia base: '), t('cada columna tiene una restricción CHECK (rangos, listas de valores o formato de lista), además de la validación que hace la aplicación antes de guardar. Así, un dato inválido no llega a la base aunque falle una de las dos.')]),
    vineta([negrita('Transacciones: '), t('crear, actualizar y eliminar el perfil se hacen dentro de una transacción (exclusiva en el teléfono). Si algo falla, no queda nada a medias.')]),
    vineta([negrita('Versiones del esquema: '), t('la versión se guarda en la propia base (PRAGMA user_version). La versión 1 tenía el perfil, la 2 sumó el cuestionario y la 3, el historial de sesiones. Al abrir, la aplicación aplica la migración que falte y conserva los datos existentes; si la base es de una versión más nueva, no la abre y lo avisa.')]),
    vineta([negrita('Rendimiento en el teléfono: '), t('la base usa el modo WAL, que mejora la escritura.')]),
    vineta([negrita('Listas en JSON: '), t('estilos, evitar y ejercicios se guardan como listas JSON en texto. La lista de ejercicios de cada sesión alimenta la progresión (dos sesiones seguidas fáciles, completas y sin molestias) y permite saber qué ejercicio es nuevo para abrir su técnica la primera vez.')]),
    h2('3.5 Datos que no están en la base'),
    p('El catálogo de ejercicios (características y variantes), las 16 fichas técnicas, las indicaciones de calentamiento y cierre y las plantillas de sesión son parte del código de la aplicación (generador.ts, fichas.ts y sesion.ts). Son iguales para todas las personas, se revisan con el preparador físico y se versionan junto con la aplicación, por lo que no necesitan una tabla.'),
  ];
}

// ---------- 4. Diagramas UML ----------
function diagramasUML() {
  return [
    h1('4. Diagramas UML'),
    p('Los diagramas siguen la notación UML 2 y se dibujaron con PlantUML a partir del código de la versión actual. Sus archivos fuente (.puml) se entregan junto a este documento en el repositorio.'),
    h2('4.1 Casos de uso'),
    p('Hay dos actores: la persona usuaria, que inicia todos los casos, y el servicio de IA (Claude), un actor externo que participa al generar la rutina.', conFigura),
    ...imagen('uml/casos_uso.png', 470, 'Figura 3. Diagrama de casos de uso de Kinetia.'),
    tabla([2900, 6126], ['Caso de uso', 'Descripción'], [
      ['Completar perfil y cuestionario', 'La primera vez, la persona ingresa nombre, edad, peso y estatura, y responde el cuestionario inicial. Todo queda guardado en el dispositivo.'],
      ['Preparar la sesión', 'Ajusta nivel, duración, equipo y lo que quiere evitar, y marca dos confirmaciones: que no tiene dolor ni una lesión que limite el movimiento, y que entiende el alcance de la app. Sin ellas no se genera la rutina.'],
      ['Generar rutina con IA', 'La IA elige un ejercicio por bloque entre los compatibles y ajusta la dosis dentro de lo permitido.'],
      ['Usar la rutina por reglas', 'Extiende el caso anterior: si la IA no responde a tiempo o su propuesta no es válida, se usa la rutina por reglas y se avisa el motivo.'],
      ['Ver la rutina y sus motivos', 'Muestra los ejercicios con su dosis y, si la armó la IA, por qué eligió cada uno.'],
      ['Realizar la sesión guiada', 'Acompaña paso a paso: animación de referencia, series, lados y descansos.'],
      ['Ver la técnica paso a paso', 'Extiende la sesión: la técnica se abre sola la primera vez que aparece un ejercicio; después, solo si la persona la pide.'],
      ['Detener por dolor', 'Extiende la sesión: la termina en el momento y la registra como detenida por dolor.'],
      ['Registrar cómo le fue', 'Incluido en la sesión: al terminar, la persona indica el esfuerzo y si tuvo molestias, y se guarda en el historial.'],
      ['Ver semana y progresión', 'El inicio muestra las sesiones de la semana y cuánto falta para avanzar a la variante más exigente.'],
      ['Editar o eliminar perfil', 'Cambia sus datos o borra todo lo guardado en el dispositivo.'],
    ]),
    h2('4.2 Diagrama de clases (modelo de dominio)'),
    p('El código de Kinetia no usa clases: está organizado en módulos con funciones e interfaces de TypeScript, lo que permite probar cada regla por separado. Por eso, la Figura 4 muestra las interfaces principales del dominio, con sus nombres reales en el código, y cómo se relacionan:'),
    vineta([negrita('Entrada: '), t('el perfil y las respuestas del cuestionario forman la entrada del generador (GeneratorInput).')]),
    vineta([negrita('Con IA: '), t('la entrada se traduce a una solicitud sin nombre (SolicitudRutinaIA). La respuesta de la IA (RespuestaRutinaIA) se valida y se convierte en una rutina (RoutineResult).')]),
    vineta([negrita('Rutina: '), t('contiene los ejercicios principales (PrincipalExercise), cada uno con su dosis (Dose) y la explicación de por qué se eligió (DecisionMetadata).')]),
    vineta([negrita('Registro: '), t('al terminar, RegistroSesion guarda lo realizado; por cada ejercicio, las series planificadas y las hechas (EjercicioRegistrado).')], conFigura),
    ...imagen('uml/clases.png', 490, 'Figura 4. Interfaces principales del dominio y sus relaciones.'),
    h2('4.3 Diagrama de secuencia: generar rutina con IA'),
    p('Es la funcionalidad principal de Kinetia. La Figura 5 sigue el pedido desde que la persona toca el botón hasta que ve su rutina:'),
    vineta([negrita('Pasos 1 a 5: '), t('la persona prepara la sesión y pide la rutina. El cliente de IA pide al motor los bloques de la plantilla, con los ejercicios compatibles y los topes de carga de su perfil. El motor arma además la rutina por reglas, que queda de respaldo.')]),
    vineta([negrita('Pasos 6 a 11: '), t('el servidor valida el pedido y consulta a Claude con un esquema JSON que solo admite las opciones recibidas. Luego normaliza la respuesta y la devuelve.')]),
    vineta([negrita('Pasos 12 a 16: '), t('la app valida el formato y el motor revisa cada elección (ejercicio permitido, dosis igual o menor y topes por edad e IMC) antes de mostrar la rutina con sus motivos.')]),
    vineta([negrita('Pasos 17 y 18: '), t('si no hay servicio, hay un error, la respuesta tarda más de 45 segundos o la propuesta no es válida, se muestra la rutina por reglas con el motivo.')], conFigura),
    ...imagen('uml/secuencia.png', 500, 'Figura 5. Secuencia de «Generar rutina con IA».'),
    h2('4.4 Diagrama de componentes'),
    p('La Figura 6 muestra los módulos de la aplicación y del servidor. Las flechas continuas indican qué módulo usa a cuál; las punteadas, las llamadas por red. Destacan tres decisiones:'),
    vineta([negrita('Las reglas no dependen de la IA: '), t('el cliente de IA usa al motor de reglas, nunca al revés. Así, la rutina por reglas funciona siempre, con o sin conexión.')]),
    vineta([negrita('La clave queda en el servidor: '), t('solo kinetia-ia.mjs habla con la API de Claude; la aplicación nunca la conoce.')]),
    vineta([negrita('Lo que se conserva de la Fase 2: '), t('el código guarda los árboles de decisión entrenados en la Fase 2 (carpeta ia/), que sirvieron de comparación para evaluar a la IA. El flujo actual no los usa, por eso no aparecen en el diagrama.')], conFigura),
    ...imagen('uml/componentes.png', 560, 'Figura 6. Diagrama de componentes de Kinetia.'),
  ];
}

// ---------- 5. Requisitos no funcionales ----------
function requisitosNoFuncionales() {
  const anchos = [1000, 3200, 4826];
  const enc = ['ID', 'Requisito', 'Cómo se cumple'];
  return [
    h1('5. Requisitos no funcionales'),
    p('Esta sección define los requisitos de calidad de Kinetia y cómo se cumplen en la versión actual. Cada uno tiene un identificador (RNF) para relacionarlo con las pruebas de la sección 7. Los tiempos de la sección 5.2 son medidos: los locales, sobre todas las combinaciones posibles de sesión, exclusiones y perfil (2.592 casos), y los de la IA, con 20 consultas reales a Claude (detalle en la sección 7.4).'),
    h2('5.1 Seguridad y privacidad'),
    tabla(anchos, enc, [
      ['RNF-01', 'La clave de la API nunca está en la aplicación ni en el repositorio.', 'Se guarda como secreto del servidor (en Cloudflare o como variable de entorno en el PC). La app solo conoce la dirección del servicio. El script que prepara la web se detiene si el paquete contiene algo parecido a una clave, y el historial del repositorio no contiene claves.'],
      ['RNF-02', 'Los datos personales se quedan en el dispositivo.', 'Perfil, respuestas e historial se guardan solo en SQLite local; no hay cuentas ni base de datos en la nube. El nombre nunca se envía a la IA: el contrato solo incluye edad, peso, estatura y nivel.'],
      ['RNF-03', 'El servicio de IA solo acepta pedidos válidos de la propia app.', 'En la web rechaza con error 403 los pedidos de otro origen; en local puede exigir un token. Valida cada campo del contrato (rangos, listas cerradas y un máximo de 20.000 caracteres) y rechaza el resto con error 400. No acepta texto libre.'],
      ['RNF-04', 'La IA no puede proponer nada fuera de lo permitido.', 'El esquema JSON solo admite las opciones de cada bloque. Después, la app vuelve a validar ejercicio, dosis (igual o menor que la ficha) y topes por edad e IMC; si algo no cumple, descarta la propuesta.'],
      ['RNF-05', 'La persona controla sus datos.', '«Eliminar perfil» borra perfil, cuestionario e historial en una sola transacción.'],
      ['RNF-06', 'El entrenamiento es seguro para la persona.', 'No se genera una rutina sin las dos confirmaciones (sin dolor ni lesión; entiende el alcance). «Detener por dolor» está disponible en todo momento, y una sesión con molestias impide avanzar de variante.'],
    ]),
    h2('5.2 Rendimiento'),
    tabla(anchos, enc, [
      ['RNF-07', 'La rutina por reglas se genera al instante.', 'En las 2.592 combinaciones: 0,03 ms en promedio y menos de 4 ms en el peor caso (computador de desarrollo). En un teléfono puede tardar varias veces más y sigue siendo imperceptible.'],
      ['RNF-08', 'La rutina con IA responde en un tiempo razonable y nunca deja esperando sin fin.', 'Con 20 consultas reales a Claude: 9,7 segundos en promedio, 9 de cada 10 bajo 13,8 segundos y un máximo de 15,1; ninguna superó los 45 segundos que espera la app antes de usar la rutina por reglas. El trabajo propio de Kinetia (preparar, validar en el servidor y montar) suma unos 0,2 ms.'],
      ['RNF-09', 'Los mensajes entre app y servidor son livianos.', 'Solicitud: 2 KB en promedio (máximo 3,7 KB). Respuesta: 0,8 KB en promedio (máximo 1,3 KB).'],
      ['RNF-10', 'Las animaciones no hacen lenta la app.', '18 GIF optimizados (620 KB en promedio; el mayor, 840 KB). Cada uno se descarga solo cuando aparece su paso. Con «reducir movimiento» activado se muestra una imagen fija.'],
    ]),
    h2('5.3 Disponibilidad'),
    tabla(anchos, enc, [
      ['RNF-11', 'La app funciona aunque la IA no esté disponible.', 'Usa la rutina por reglas y avisa el motivo cuando no hay servicio, hay un error, la respuesta tarda más de 45 segundos o la propuesta no es válida.'],
      ['RNF-12', 'Solo la IA necesita internet.', 'La lógica y los datos están en el dispositivo: sin conexión, la app genera la rutina por reglas, guía la sesión y guarda el historial. La versión web necesita conexión para cargar la página.'],
      ['RNF-13', 'El servicio se publica en infraestructura administrada.', 'Cloudflare Pages, sin servidor propio que mantener. Como alternativa, el mismo servicio corre en el PC (node servidor/local.mjs).'],
    ]),
    h2('5.4 Escalabilidad'),
    tabla(anchos, enc, [
      ['RNF-14', 'El servidor no guarda estado.', 'Cada pedido se resuelve por separado, sin base de datos ni sesiones, así que Cloudflare puede atender muchos en paralelo. Los datos de cada persona viven en su dispositivo: sumar usuarios no hace crecer una base central.'],
      ['RNF-15', 'Los límites y costos son conocidos.', 'El plan gratuito de Cloudflare permite 100.000 solicitudes al día y 10 ms de CPU por solicitud; el servidor usa unos 0,1 ms (la espera a Claude no cuenta como CPU). Todas las solicitudes del sitio pasan por el servicio, porque agrega las cabeceras que exige SQLite en el navegador: es suficiente para un prototipo y, con más uso, se pueden servir los archivos estáticos aparte. Cada rutina con IA tiene un costo por uso de la API de Claude.'],
    ]),
    h2('5.5 Portabilidad'),
    tabla(anchos, enc, [
      ['RNF-16', 'Una sola base de código para teléfono y web.', 'Expo y React Native: Android mediante Expo Go (probado en emulador) y versión web publicada. iOS es posible con el mismo código, pero no se probó.'],
      ['RNF-17', 'El servidor corre en distintos entornos sin cambios.', 'kinetia-ia.mjs usa solo funciones estándar (fetch, Request y Response) y ninguna dependencia: corre en Cloudflare y en Node.js 18 o superior. Se configura con variables de entorno (ANTHROPIC_API_KEY, KINETIA_MODELO, KINETIA_SIMULADO y KINETIA_TOKEN). La sección 6 explica por qué no se usa Docker.'],
    ]),
    h2('5.6 Usabilidad y mantenibilidad'),
    tabla(anchos, enc, [
      ['RNF-18', 'La app es fácil de entender y accesible.', 'Textos revisados para que sean simples; nombres amigables de los ejercicios; etiquetas para lectores de pantalla en botones y animaciones; respeta la opción «reducir movimiento» del teléfono o navegador.'],
      ['RNF-19', 'El código se puede verificar y cambiar con seguridad.', 'TypeScript en modo estricto; la lógica está en funciones separadas de la interfaz; 6 suites de pruebas automáticas (62 pruebas) y revisión de tipos sin errores. Cada cambio siguió el flujo planteamiento, vista previa y aprobación.'],
    ]),
  ];
}

// ---------- 6. Despliegue y portabilidad ----------
function despliegue() {
  return [
    h1('6. Despliegue y portabilidad'),
    p('Kinetia tiene dos piezas que se despliegan por separado: la aplicación, que corre en el teléfono o en el navegador, y el servicio de IA, que corre en Cloudflare o en el PC. Ninguna necesita una base de datos de servidor.'),
    h2('6.1 Entornos'),
    tabla([2100, 3500, 3426], ['Entorno', 'Qué se ejecuta', 'Cómo se levanta'], [
      ['Desarrollo (PC y Android)', 'La app en Expo Go o en el emulador de Android Studio, y el servicio de IA en el PC (puerto 8787). El emulador llega al PC en http://10.0.2.2:8787.', [[pequeno('Dos ventanas de PowerShell: '), codigoT('node servidor/local.mjs'), pequeno(' (con la clave en esa ventana) y '), codigoT('npx expo start'), pequeno('.')]]],
      ['Web publicada', 'La app web y el servicio de IA en un solo sitio de Cloudflare Pages: https://kinetia.pages.dev. El archivo _worker.js une sitio-web.mjs y kinetia-ia.mjs.', [[codigoT('node herramientas/preparar-web.mjs'), pequeno(' y luego Wrangler (ver 6.3).')]]],
    ]),
    h2('6.2 Variables de configuración'),
    p('Toda la configuración se hace con variables de entorno; no hay valores escritos en el código. Las que empiezan con EXPO_PUBLIC_ quedan dentro de la app y por eso nunca llevan secretos.'),
    tabla([3500, 1700, 3826], ['Variable', 'Dónde', 'Para qué'], [
      [[[codigoT('EXPO_PUBLIC_KINETIA_IA_URL')]], 'App (.env.local)', 'Dirección del servicio de IA. Sin ella, la app genera la rutina solo con reglas.'],
      [[[codigoT('EXPO_PUBLIC_KINETIA_IA_TOKEN')]], 'App (.env.local)', 'Opcional; debe coincidir con KINETIA_TOKEN. No es secreto.'],
      [[[codigoT('EXPO_PUBLIC_KINETIA_DEMO')]], 'App (web)', 'Modo demostración: muestra las fichas en borrador con el aviso de prototipo.'],
      [[[codigoT('ANTHROPIC_API_KEY')]], 'Servidor (secreto)', 'Clave de la API de Claude. Solo en el secreto de Cloudflare o en la ventana del servidor local.'],
      [[[codigoT('KINETIA_MODELO')]], 'Servidor', 'Modelo de Claude; por defecto, claude-haiku-5-5.'],
      [[[codigoT('KINETIA_SIMULADO')]], 'Servidor', 'Con valor 1, modo de prueba: respuestas simuladas, sin clave ni costo; la rutina lo indica.'],
      [[[codigoT('KINETIA_TOKEN')]], 'Servidor', 'Opcional: exige un token compartido en cada pedido.'],
      [[[codigoT('PORT')]], 'Servidor local', 'Puerto del servicio en el PC; por defecto, 8787.'],
    ]),
    h2('6.3 Publicación de la versión web'),
    vineta([negrita('Preparar: '), codigo('node herramientas/preparar-web.mjs'), t(' exporta la app web apuntando al servicio del propio sitio (/api/rutina), agrega _worker.js y revisa que el paquete no apunte al emulador ni contenga nada parecido a una clave.')]),
    vineta([negrita('Publicar: '), codigo('npx wrangler@4 pages deploy .\\dist-web --project-name kinetia --branch main'), t('. La versión de Wrangler queda fija (4) para que el resultado sea repetible.')]),
    vineta([negrita('Clave (una sola vez): '), t('se agrega en el panel de Cloudflare como secreto ANTHROPIC_API_KEY y se conserva en las publicaciones siguientes.')]),
    vineta([negrita('Comprobar: '), t('https://kinetia.pages.dev/api/estado debe indicar el modo «claude». Las instrucciones completas están en herramientas/PUBLICAR_WEB.md.')]),
    h2('6.4 Por qué no se usa Docker'),
    p('El anexo de la asignatura menciona Docker como parte del despliegue, y el docente indicó que se usa solo si el proyecto lo necesita. En Kinetia no aporta, por cuatro razones:'),
    vineta([negrita('La app no corre en un servidor: '), t('se ejecuta en el teléfono o en el navegador de cada persona, donde un contenedor no aplica.')]),
    vineta([negrita('El servicio de IA no tiene dependencias: '), t('es un archivo de JavaScript estándar que corre con Node.js o en Cloudflare con un solo comando. Un contenedor agregaría pasos sin simplificar nada.')]),
    vineta([negrita('La plataforma de publicación no usa contenedores: '), t('Cloudflare Pages ejecuta el servicio directamente, sin servidor que administrar.')]),
    vineta([negrita('No hay servicios que coordinar: '), t('sin base de datos de servidor ni otros procesos, un docker-compose no tendría nada que orquestar.')]),
    p('La portabilidad se logra de otra forma: código estándar y sin dependencias en el servidor, configuración por variables de entorno, scripts que preparan la publicación de manera repetible y la misma base de código para Android y web. Si en el futuro se quisiera desplegar el servicio en un servidor propio, bastaría una imagen oficial de Node.js con la carpeta servidor/ y el comando node servidor/local.mjs, recibiendo la clave como variable de entorno.'),
    h2('6.5 Requisitos para ejecutar el proyecto'),
    tabla([3000, 6026], ['Para', 'Se necesita'], [
      ['Probar la versión web', 'Solo un navegador actualizado (no en modo incógnito, porque impide guardar los datos).'],
      ['Ejecutar la app en el PC', 'Node.js (versión LTS) y las dependencias del proyecto (npm install). Para Android: Expo Go en el teléfono o el emulador de Android Studio.'],
      ['Ejecutar el servicio de IA', 'Node.js 18 o superior y, para usar Claude, una clave de la API. Sin clave, funciona en modo de prueba.'],
      ['Publicar la web', 'Una cuenta de Cloudflare (plan gratuito) y Wrangler, que se ejecuta con npx sin instalarlo.'],
    ]),
  ];
}

// ---------- 7. Pruebas ----------
function pruebas() {
  const c = (texto) => [[codigoT(texto)]];
  return [
    h1('7. Pruebas'),
    p('Kinetia se verificó de cuatro formas: pruebas automáticas sobre el código de la app y del servidor, mediciones de rendimiento, una evaluación de las decisiones de la IA frente a un preparador físico y pruebas manuales en el emulador de Android y en la web publicada. Las pruebas automáticas usan solo Node.js (módulo assert), sin librerías externas, y se ejecutan sobre el mismo código TypeScript de la app, compilado. Los scripts y sus resultados se entregan en la carpeta pruebas/ del repositorio.'),
    h2('7.1 Resumen'),
    tabla([2300, 4226, 2500], ['Tipo', 'Qué se probó', 'Resultado'], [
      ['Unitarias', 'Cuestionario, topes de carga por edad e IMC, sesión guiada y registro, progresión de variante.', '41 de 41 correctas'],
      ['Integración', 'Rutina con IA de punta a punta (servidor simulado y respuestas con la forma de Claude) e integración con el generador.', '21 de 21 correctas'],
      ['Seguridad', 'Control de origen, contrato, token, privacidad del nombre, errores y paquete web.', '9 de 9 correctas'],
      ['Rendimiento', 'Tiempos locales en 2.592 combinaciones y 20 consultas reales a Claude.', 'Promedio de la IA: 9,7 s; ninguna sobre 45 s'],
      ['Evaluación de la IA', '31 historias etiquetadas por el preparador físico, 3 veces cada una.', '30 de 30 coincidencias (antes del ajuste, 18 de 30)'],
      ['Manuales', 'Recorridos completos en el emulador de Android y en la web publicada.', 'Sin errores bloqueantes'],
    ]),
    p('Todas las suites se volvieron a ejecutar el 06-11-2026 con la versión documentada: 71 de 71 pruebas correctas, además de la revisión de tipos de TypeScript sin errores.', { spacing: { before: 120, after: 120 } }),
    h2('7.2 Pruebas unitarias y de integración'),
    tabla([3150, 1000, 4876], ['Suite', 'Pruebas', 'Qué verifica (principales)'], [
      [c('prueba_cuestionario.mjs'), '9', 'Nivel sugerido y preguntas adaptativas; «evitar» quita exactamente lo indicado; lo que se envía a la IA pasa la validación del servidor; se rechazan datos incompletos o inventados.'],
      [c('prueba_carga_perfil.mjs'), '14', 'Límites exactos por edad e IMC; los topes nunca suben la dosis (10.944 ejercicios revisados en 36 perfiles y 72 configuraciones); si la IA pide más que el tope, la app lo baja.'],
      [c('prueba_sesion.mjs'), '10', 'Toda variante tiene instrucciones, nombre y animación (salvo C02); los pasos y descansos coinciden con la rutina en 72 rutinas; registro de sesión completa, incompleta y detenida por dolor; migraciones de SQLite de 0, 1 y 2 a 3 conservan los datos.'],
      [c('prueba_progresion.mjs'), '8', 'Dos sesiones fáciles, completas y sin molestias hacen avanzar; no se avanza con molestias, sesión incompleta, esfuerzo adecuado o difícil, ni con sesiones antiguas; si la IA falla, no se marcan avances.'],
      [c('prueba_rutina_ia.mjs'), '14', 'La solicitud no incluye el nombre; el esquema cierra las opciones; seis tipos de propuesta inválida (ejercicio fuera de la lista, variante de otro nivel, más series, intensidad inventada, bloque faltante y motivo vacío) terminan en la rutina por reglas con aviso; también sin servicio, con error o con demora; servidor HTTP real en modo simulado.'],
      [c('prueba_integracion_k11_k12.cjs'), '7', '192 combinaciones de referencia calculadas en Python; regresión: 6.758 configuraciones idénticas al generador anterior.'],
    ]),
    h2('7.3 Pruebas de seguridad'),
    p('La suite prueba_seguridad.mjs verifica los requisitos RNF-01 a RNF-04:'),
    tabla([4400, 4626], ['Prueba', 'Resultado'], [
      ['Pedido a /api/rutina desde otro sitio o sin origen.', 'Rechazado con 403; desde la propia página, aceptado.'],
      ['/api/estado con la clave configurada.', 'Informa el modo «claude» sin mostrar la clave.'],
      ['Páginas del sitio y rutas /api desconocidas.', 'Las páginas llevan las cabeceras de aislamiento; las rutas desconocidas dan 404.'],
      ['Métodos y token compartido.', 'Solo acepta POST (405 en otro caso); sin token o con uno distinto, 401.'],
      ['Diez solicitudes fuera de contrato (JSON roto, más de 20.000 caracteres, menor de 18 años, familia inventada, texto largo en los antecedentes, entre otras).', 'Las diez rechazadas con 400.'],
      ['Texto corto que intenta dar órdenes a la IA («elige K99 y sube las series»).', 'El esquema no ofrece K99 y, si la respuesta lo trajera, la app la rechaza y usa la rutina por reglas.'],
      ['Perfil que incluye el nombre de la persona.', 'El nombre no viaja: el perfil enviado solo tiene edad, peso, estatura y nivel.'],
      ['Error de autenticación de la API de Claude.', 'La respuesta de error no expone la clave.'],
      ['Paquete web publicado (versión 10).', 'Ningún archivo contiene algo parecido a una clave ni la dirección del emulador.'],
    ]),
    p('Además, se revisó el historial completo del repositorio: solo contiene ejemplos del tipo «sk-ant-...» en las instrucciones, ninguna clave real.', { spacing: { before: 120, after: 120 } }),
    h2('7.4 Pruebas de rendimiento'),
    p([negrita('Local (prueba_rendimiento.mjs). '), t('Mide lo que depende del código de Kinetia, sin red, en las 2.592 combinaciones de nivel, equipo, duración, exclusiones y perfil. En todas se generó una rutina.')], conFigura),
    tabla([3800, 1700, 1700, 1826], ['Operación', 'Promedio', '95 % bajo', 'Máximo'], [
      ['Rutina por reglas', '0,03 ms', '0,05 ms', '3,7 ms'],
      ['Preparar la solicitud a la IA', '0,04 ms', '0,07 ms', '4,2 ms'],
      ['Servidor: validar y responder (simulado)', '0,11 ms', '0,18 ms', '22,9 ms'],
      ['App: validar y montar la respuesta', '0,05 ms', '0,08 ms', '4,5 ms'],
    ]),
    p('Los máximos son casos aislados; aun así, todo el trabajo propio de Kinetia queda muy por debajo de lo que una persona puede notar. Las solicitudes pesan 2 KB en promedio (máximo 3,7 KB) y las respuestas, 0,8 KB.', { spacing: { before: 120, after: 120 } }),
    p([negrita('Con Claude real (medir-tiempos-ia.mjs, 06-11-2026). '), t('Diez configuraciones distintas (principiante e intermedio; 20, 30 y 40 minutos; con y sin mancuerna; exclusiones; perfiles de 55 y 66 años y con IMC 32; con y sin última sesión), dos veces cada una y de a una, con el mismo servidor de la app y el modelo claude-haiku-5-5. Se midió desde el PC, sin la app de por medio.')], conFigura),
    tabla([4500, 4526], ['Medida', 'Resultado'], [
      ['Respuestas correctas', '20 de 20'],
      ['Promedio / mediana', '9,7 s / 9,4 s'],
      ['9 de cada 10 respuestas, bajo', '13,8 s'],
      ['Mínimo / máximo', '4,0 s / 15,1 s'],
      ['Sesiones de 20 min (3 bloques) / de 40 min (7 bloques)', '7,6 s / 11,9 s en promedio'],
      ['Respuestas sobre el límite de 45 s de la app', 'Ninguna'],
    ]),
    vineta([negrita('Dentro de lo permitido: '), t('las 94 elecciones de ejercicio, series e intensidad quedaron dentro de las opciones y topes recibidos. Con IMC 32, todos los ejercicios se propusieron con intensidad reducida; con 66 años, con intensidad mínima o reducida.')], { spacing: { before: 120, after: 80, line: 290 } }),
    vineta([negrita('Variabilidad: '), t('en 6 de los 10 casos la IA propuso exactamente la misma rutina las dos veces; en los otros 4 cambió una variante o una intensidad, siempre dentro de lo permitido.')]),
    h2('7.5 Evaluación de la IA con el preparador físico'),
    p('Para comprobar que la IA decide con criterio profesional, se le enviaron, igual que en producción, las 31 historias que el preparador físico había etiquetado (14 del puente y 17 del dead bug; una es empate), tres veces cada una. Se comparó la variante elegida por la IA con la preferida por el preparador.'),
    tabla([4500, 2263, 2263], ['Medida', 'Versión inicial', 'Versión ajustada'], [
      ['Coincide con la preferida (voto de 3)', '18 de 30 (60 %)', '30 de 30 (100 %)'],
      ['Coincide por respuesta', '54 de 90', '87 de 90 (97 %)'],
      ['Dentro de lo aceptable para el preparador', '90 de 90', '90 de 90'],
      ['Desacuerdos: más conservadora / más exigente', '11 / 1', '0 / 0'],
    ]),
    p('El ajuste reemplazó la regla «si dudas, elige la opción más conservadora» por los criterios escritos del proyecto: la IA ahora traslada la prudencia a la dosis (intensidad reducida) en vez de a la variante. Como referencia, los árboles de decisión de la Fase 2 coincidían en 23 de 30.', { spacing: { before: 120, after: 120 } }),
    p([negrita('Límites. '), t('El 30 de 30 es optimista: los criterios del dead bug se calibraron con esas mismas etiquetas. Hay un solo revisor, historias hipotéticas y 30 casos, y se mide acuerdo con un profesional, no eficacia física. Queda pendiente una prueba a ciegas con 18 casos que el preparador debe etiquetar sin ver las propuestas.')]),
    h2('7.6 Pruebas manuales'),
    tabla([1300, 2000, 5726], ['Fecha', 'Entorno', 'Qué se probó y resultado'], [
      ['30-10-2026', 'Emulador Android, Claude real', 'Cuestionario completo y rutina con IA (respuesta en unos 8 s): el resumen nombra los estilos de baile. Seis sesiones guiadas seguidas: retroalimentación según «¿cómo te fue?» y avance a las variantes exigentes tras dos sesiones fáciles. En el camino se corrigieron cuatro detalles: tres de redacción de la IA y un aviso de progreso.'],
      ['04-11-2026', 'Web publicada, en clase', 'Demostración al docente: conforme; valoró la progresión según los entrenamientos realizados.'],
      ['05-11-2026', 'Navegador (390 × 844) y web publicada', 'Versión 10: cuestionario, inicio, preparación, rutina, dos sesiones completas (técnica abierta solo la primera vez), celebración, perfil y «Cómo funciona», sin errores en la consola. Probada en producción por la autora.'],
      ['06-11-2026', 'PC con emulador Android', 'Versión 10 sincronizada en el PC, con el servidor local y Expo: funcionó sin errores.'],
    ]),
    p([negrita('No probado todavía: '), t('un teléfono físico (Expo Go) y Safari en iPhone.')], { spacing: { before: 120, after: 120 } }),
  ];
}

// ---------- 8. Innovación ----------
function innovacion() {
  return [
    h1('8. Innovación'),
    h2('8.1 ¿Qué problema resuelve?'),
    p('Quienes practican baile urbano (hip hop, girly, K-pop, vogue, entre otros) exigen a su cuerpo saltos, cambios de nivel, apoyos en una pierna y trabajo en el suelo. El trabajo de fuerza y control corporal complementa ese entrenamiento, pero las opciones a mano no se ajustan bien:'),
    vineta([negrita('Las rutinas fijas o genéricas '), t('no consideran la experiencia, la edad, el peso ni cómo le fue a la persona en su última sesión.')]),
    vineta([negrita('Pedirle una rutina a un chat de IA general '), t('entrega algo personalizado, pero nadie verifica que respete límites de carga seguros, y cada respuesta puede ser distinta.')]),
    vineta([negrita('Un entrenador personal '), t('resuelve ambas cosas, pero no está al alcance de todas las personas ni disponible en cada sesión.')]),
    p('Kinetia arma, en segundos, una rutina de fuerza y control corporal pensada para quien baila, adaptada a su perfil, explicada en lenguaje simple y siempre dentro de límites seguros.'),
    h2('8.2 ¿Qué la hace diferente?'),
    p('La diferencia principal es cómo se combina la IA con reglas de seguridad: la IA decide y explica, pero solo dentro de las opciones que las reglas permiten, y la app verifica su propuesta antes de mostrarla.'),
    tabla([2900, 2042, 2042, 2042], ['Característica', 'Rutina fija o genérica', 'Chat de IA general', 'Kinetia'], [
      ['Se adapta al perfil y a la última sesión', 'No', 'Sí', 'Sí'],
      ['Respeta límites de carga por edad e IMC', 'No', 'Sin verificar', 'Sí, verificado por la app'],
      ['Explica por qué elige cada ejercicio', 'No', 'Sí', 'Sí'],
      ['Propone ejercicios de un catálogo definido', 'Sí', 'No', 'Sí: 14 ejercicios, cada uno con su ficha'],
      ['Funciona si la IA falla', 'Sí', 'No', 'Sí, con la rutina por reglas'],
      ['Guía la sesión paso a paso', 'A veces', 'No', 'Sí, con animaciones propias'],
      ['Datos personales', 'Variable', 'En la nube', 'Solo en el dispositivo; el nombre no se envía'],
    ]),
    p('Además:', { spacing: { before: 160, after: 80 }, keepNext: true }),
    vineta([negrita('La IA se evaluó contra un profesional: '), t('sus decisiones coincidieron con las del preparador físico en 30 de 30 historias, frente a 23 de 30 de los árboles de decisión entrenados en la Fase 2 (sección 7.5).')]),
    vineta([negrita('Progresa con la persona: '), t('con dos sesiones seguidas fáciles, completas y sin molestias, avanza a una variante más exigente; con molestias, no avanza. Fue lo que el docente destacó en la demostración.')]),
    vineta([negrita('Pensada para quien baila: '), t('el cuestionario pregunta por los estilos de baile y la IA relaciona los ejercicios con ellos, sin prometer mejoras en el rendimiento.')]),
    h2('8.3 ¿Qué valor agrega?'),
    vineta([negrita('Para la persona usuaria: '), t('una rutina segura y explicada en segundos, sin crear una cuenta y sin entregar datos personales, que se ajusta a cómo le fue y la acompaña paso a paso.')]),
    vineta([negrita('Para profesionales del entrenamiento: '), t('los criterios de selección y los límites de carga están escritos y se pueden revisar, y la IA los aplica de forma consistente. Las reglas las define el proyecto junto con el preparador; la IA no las reemplaza.')]),
    vineta([negrita('Como solución técnica: '), t('el patrón «reglas que filtran, IA que elige con opciones cerradas, validación y respaldo» se puede reutilizar en otros dominios donde la IA debe ser útil sin salirse de límites. Además es económico: todo el uso de la IA en el proyecto hasta el 06-11-2026 (la evaluación con 193 consultas, las pruebas manuales y la demostración web) costó 0,24 USD, menos de 0,2 centavos de dólar por rutina.')]),
  ];
}

// ---------- 9. Límites y trabajo futuro ----------
function limites() {
  return [
    h1('9. Límites y trabajo futuro'),
    h2('9.1 Límites de la versión actual'),
    vineta([negrita('Contenido en revisión: '), t('las fichas, las dosis, los nombres amigables y las indicaciones están pendientes de la validación definitiva del preparador físico. Por eso la versión web funciona en modo demostración, con el aviso de prototipo.')]),
    vineta([negrita('Reglas de diseño, no umbrales validados: '), t('los límites por edad e IMC se basan en guías (ACSM, NSCA y OMS), pero sus valores exactos y el umbral de dos sesiones para avanzar son decisiones del proyecto.')]),
    vineta([negrita('Evaluación de la IA acotada: '), t('un solo revisor, historias hipotéticas y 30 casos; mide acuerdo con un profesional, no eficacia física ni prevención de lesiones. Falta la prueba a ciegas.')]),
    vineta([negrita('Textos de la IA no verificados al detalle: '), t('la app comprueba ejercicios y dosis, pero no el contenido de los motivos. En una prueba del 06-11-2026, la IA nombró una vez un estilo de baile que la persona no había elegido (en 1 de 2 respuestas); en la evaluación con el preparador no ocurrió en ninguna de las 93 respuestas.')]),
    vineta([negrita('No reemplaza a un profesional: '), t('Kinetia no enseña pasos, no evalúa la técnica, no diagnostica ni rehabilita.')]),
    vineta([negrita('Dependencia de un proveedor externo: '), t('la IA depende de la API de Claude, con costo por uso. Sin conexión o sin servicio, la app usa la rutina por reglas.')]),
    vineta([negrita('Protección del servicio web: '), t('el control de origen impide que otras páginas usen el servicio desde el navegador, pero no es una autenticación: un programa podría imitar ese dato. El contrato cerrado y los límites de tamaño acotan el posible abuso, pero no hay un límite de pedidos por persona.')]),
    vineta([negrita('Datos en un solo dispositivo: '), t('no hay respaldo ni sincronización; si se borra la app o los datos del navegador, se pierde el historial.')]),
    vineta([negrita('Alcance acotado: '), t('14 ejercicios principales, peso corporal o una mancuerna, dos niveles y rutinas por sesión, sin planificación semanal.')]),
    vineta([negrita('Pendientes técnicos: '), t('no se ha probado en un teléfono físico ni en iOS; el código conserva los árboles de la Fase 2 sin uso, y queda pendiente actualizar Expo después de la entrega.')]),
    h2('9.2 Trabajo futuro'),
    tabla([700, 3700, 4626], ['N.º', 'Mejora', 'Por qué'], [
      ['1', 'Validación profesional de fichas, dosis, nombres e indicaciones.', 'Es la condición para dejar el modo demostración y habilitar los ejercicios en una versión publicada.'],
      ['2', 'Prueba a ciegas de la IA con los 18 casos pendientes y más revisores.', 'Da una medida sin sesgo de la calidad de sus decisiones.'],
      ['3', 'Pruebas en teléfonos físicos (Android e iOS) y una versión instalable.', 'Confirma el diseño y el rendimiento fuera del emulador.'],
      ['4', 'Límite de pedidos por persona y verificación contra bots en el servicio web.', 'Protege el costo de la API si la app se abre a más personas.'],
      ['5', 'Prueba de usabilidad con 3 a 5 personas que bailen.', 'Valida con usuarios reales que la app se entiende y se usa sin ayuda.'],
      ['6', 'Respaldo opcional del historial, con consentimiento.', 'Evita perder el progreso al cambiar de teléfono.'],
      ['7', 'Más ejercicios y equipamiento, nivel avanzado y planificación semanal.', 'Amplía el público y acompaña un entrenamiento más largo.'],
      ['8', 'Limpieza técnica: quitar el código sin uso, servir los archivos estáticos fuera del servicio y actualizar Expo.', 'Facilita el mantenimiento y el crecimiento.'],
    ]),
    p('En síntesis, Kinetia muestra que una IA generativa puede personalizar y explicar rutinas de ejercicio sin salirse de límites seguros, siempre que las reglas filtren, la IA elija entre opciones cerradas y la app verifique el resultado. El paso siguiente más importante es la validación profesional del contenido.', { spacing: { before: 200, after: 120 } }),
  ];
}

// ---------- documento ----------
const documento = new Document({
  creator: 'Karla Acuña Bravo',
  title: 'Kinetia · Documento técnico',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 32, bold: true, color: AZUL },
        paragraph: { spacing: { before: 240, after: 160 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 26, bold: true, color: AZUL },
        paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [{ reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }],
  },
  sections: [{
    properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } }, titlePage: true },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [t('Kinetia · Documento técnico', { size: 18, color: GRIS })] })] }),
      first: new Header({ children: [] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [t('Página ', { size: 18, color: GRIS }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRIS })] })] }),
      first: new Footer({ children: [] }),
    },
    children: [...portada(), ...indice(), ...introduccion(), ...arquitectura(), ...modeloDatos(), ...diagramasUML(), ...requisitosNoFuncionales(), ...despliegue(), ...pruebas(), ...innovacion(), ...limites()],
  }],
});

Packer.toBuffer(documento).then((buffer) => {
  const salida = path.join(DIR, 'documento_tecnico_kinetia.docx');
  fs.writeFileSync(salida, buffer);
  console.log('Listo:', salida, buffer.length, 'bytes');
});
