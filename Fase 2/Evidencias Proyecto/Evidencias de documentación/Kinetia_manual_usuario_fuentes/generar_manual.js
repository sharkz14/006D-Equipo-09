// Manual de usuario de Kinetia (Fase 3). Genera manual_usuario_kinetia.docx.
// Mismo estilo que el documento técnico. Las capturas están en img/ (versión web 10, tamaño teléfono).
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
      children: [t('MANUAL DE USUARIO', { size: 22, bold: true, color: GRIS, characterSpacing: 40 })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [t('Kinetia', { size: 84, bold: true, color: NEGRO })] }),
    new Paragraph({
      spacing: { after: 0, line: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 14 } },
      children: [t('Guía para usar la aplicación: del primer cuestionario a tu sesión guiada', { size: 26, color: GRIS })],
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


// ---------- utilidades propias del manual ----------
const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const sinBordes = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde };
let instanciaPasos = 0;
/** Devuelve un generador de pasos numerados que parte en 1. */
const nuevaLista = () => { instanciaPasos += 1; const inst = instanciaPasos;
  return (contenido, opc = {}) => paso(contenido, { ...opc, numbering: { reference: 'pasos', level: 0, instance: inst } }); };
const paso = (contenido, opc = {}) => new Paragraph({
  numbering: { reference: 'pasos', level: 0 },
  children: typeof contenido === 'string' ? [t(contenido)] : contenido,
  spacing: { after: 80, line: 290 }, ...opc,
});

/** Capturas del teléfono en una fila (2 o 3), cada una con su leyenda. */
function pantallas(lista, anchoPx = 165) {
  const n = lista.length;
  const anchoCol = Math.floor(ANCHO / n);
  const celda = ([archivo, leyenda]) => {
    const datos = fs.readFileSync(path.join(DIR, 'img', archivo + '.jpg'));
    const alto = Math.round(anchoPx * 1270 / 589);
    return new TableCell({
      width: { size: anchoCol, type: WidthType.DXA }, borders: sinBordes,
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, keepNext: true,
          children: [new ImageRun({ type: 'jpg', data: datos, transformation: { width: anchoPx, height: alto } })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
          children: [t(leyenda, { italics: true, size: 18, color: GRIS })] }),
      ],
    });
  };
  return [
    new Table({
      width: { size: anchoCol * n, type: WidthType.DXA }, columnWidths: Array(n).fill(anchoCol),
      rows: [new TableRow({ cantSplit: true, children: lista.map(celda) })],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

/** Recuadro destacado: «consejo» (lila) o «importante» (rosado). */
function recuadro(tipo, titulo, contenido) {
  const fondo = tipo === 'importante' ? 'FDECEF' : 'F2EFF8';
  const linea = tipo === 'importante' ? 'B42842' : '6545D8';
  const parrafos = (Array.isArray(contenido) ? contenido : [contenido]);
  return [
    new Table({
      width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO],
      rows: [new TableRow({ cantSplit: true, children: [new TableCell({
        width: { size: ANCHO, type: WidthType.DXA },
        shading: { fill: fondo, type: ShadingType.CLEAR, color: 'auto' },
        borders: { top: sinBorde, bottom: sinBorde, right: sinBorde, left: { style: BorderStyle.SINGLE, size: 24, color: linea } },
        margins: { top: 100, bottom: 100, left: 180, right: 160 },
        children: [
          new Paragraph({ spacing: { after: 60 }, children: [t(titulo, { bold: true, color: linea })] }),
          ...parrafos.map((x) => new Paragraph({ spacing: { after: 60, line: 280 },
            children: typeof x === 'string' ? [t(x)] : x })),
        ],
      })] })],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

// ---------- 1. Antes de empezar ----------
function antesDeEmpezar() {
  return [
    h1('1. Antes de empezar'),
    h2('1.1 Qué es Kinetia'),
    p('Kinetia es una aplicación que arma rutinas de fuerza y control corporal para personas adultas que practican baile urbano. La idea es complementar tu entrenamiento de baile: fortalecer piernas, cadera, tobillos y core para que bailes con más control.'),
    p('Cada rutina se arma a tu medida. Primero respondes unas preguntas rápidas; luego, una inteligencia artificial elige los ejercicios y te explica por qué, siempre dentro de límites seguros que revisa la propia app. Después, la app te guía paso a paso durante la sesión.'),
    p('Lo que Kinetia no hace:'),
    vineta('No enseña pasos de baile ni evalúa tu técnica.'),
    vineta('No diagnostica lesiones ni reemplaza una rehabilitación o la consulta con un profesional de la salud.'),
    ...recuadro('consejo', 'Prototipo académico', 'Kinetia es un proyecto de título. Las instrucciones y las dosis de los ejercicios están en revisión con un preparador físico, por eso la app lo recuerda en varias pantallas. Si en algún momento sientes dolor, detente.'),
    h2('1.2 Cómo abrir Kinetia'),
    p([t('Abre '), negrita('https://kinetia.pages.dev'), t(' en el navegador de tu teléfono o computador (Chrome, Edge, Safari o Firefox, actualizados). No necesitas instalar nada ni crear una cuenta.')]),
    vineta('Usa una ventana normal, no de incógnito: en incógnito el navegador puede borrar tus datos al cerrarla.'),
    vineta('Tus datos (perfil, respuestas e historial) se guardan solo en ese navegador. Si cambias de teléfono o de navegador, empezarás de nuevo.'),
    vineta('Si usas un computador compartido, al terminar ve a Perfil → Eliminar perfil.'),
    h2('1.3 Qué necesitas para entrenar'),
    vineta('Un espacio despejado de unos 2 × 2 metros y, para los ejercicios en el suelo, una colchoneta o una superficie cómoda.'),
    vineta('Ropa cómoda y agua a mano.'),
    vineta('Opcional: una mancuerna. Si no tienes, Kinetia arma la rutina solo con tu peso corporal.'),
    vineta('Entre 20 y 40 minutos, según la sesión que elijas.'),
  ];
}

// ---------- 2. Primer uso: el cuestionario ----------
function cuestionario() {
  const paso = nuevaLista();
  return [
    h1('2. Primer uso: el cuestionario'),
    // (lista numerada propia de esta sección)
    p('La primera vez, Kinetia te hace unas preguntas rápidas, una por pantalla. Toma menos de un minuto. Cada respuesta cambia algo en tus rutinas; si una pregunta no cambiara nada, no estaría.'),
    ...pantallas([['01_bienvenida', '1. Bienvenida'], ['03_cuerpo', '2. Peso y estatura'], ['04_estilos', '3. Qué bailas']]),
    paso([negrita('Tu nombre. '), t('Solo sirve para saludarte. Nunca se envía a la inteligencia artificial.')]),
    paso([negrita('Tu edad. '), t('Kinetia es para personas de 18 años o más. La edad ajusta la carga de algunos ejercicios.')]),
    paso([negrita('Peso y estatura. '), t('La app los usa solo para ajustar la carga (por ejemplo, menos series o más descanso cuando corresponde).')]),
    paso([negrita('Qué bailas. '), t('Hip hop, girly, K-pop, vogue u otro estilo urbano; puedes elegir varios. La IA los usa para explicarte cómo se relaciona cada ejercicio con tu baile.')]),
    paso([negrita('Si haces ejercicios de fuerza. '), t('Con esta respuesta, Kinetia te sugiere un nivel: principiante o intermedio.')]),
    paso([negrita('Si tienes una mancuerna y cuánto tiempo sueles tener: '), t('20, 30 o 40 minutos.')]),
    ...pantallas([['05_fuerza', '4. Ejercicios de fuerza'], ['06_puente', '5. Experiencia previa'], ['09_resumen', '6. Resumen y nivel sugerido']]),
    paso([negrita('Experiencia con dos ejercicios exigentes '), t('(el puente a una pierna y el dead bug con extensión). Solo aparecen si llevas 6 meses o más haciendo fuerza, y cada uno trae una animación para que sepas cuál es.')]),
    paso([negrita('Core en el suelo. '), t('Si haces abdominales u otros ejercicios de core en el suelo.')]),
    paso([negrita('Qué prefieres evitar: '), t('ejercicios en el suelo, apoyar las rodillas o ejercicios sobre una pierna. Kinetia los saca de tus rutinas.')]),
    p('Al final verás un resumen con tu nivel sugerido, que puedes cambiar. Toca Guardar y ver mi sesión. En cualquier pregunta puedes volver con Atrás, y la barra de arriba muestra cuánto falta.', { spacing: { before: 120, after: 120 } }),
    ...recuadro('consejo', '¿Te equivocaste en algo?', 'Puedes cambiar tus respuestas cuando quieras desde el inicio, con Actualizar mis respuestas.'),
  ];
}

// ---------- 3. La pantalla de inicio ----------
function inicio() {
  return [
    h1('3. La pantalla de inicio'),
    p('Es la pantalla principal. Tienes tres pestañas: Rutina, Perfil y Cómo funciona (en la web están arriba; en la app del teléfono, abajo).'),
    ...pantallas([['10_inicio', 'Inicio la primera vez'], ['28_inicio_despues', 'Inicio después de entrenar']], 170),
    vineta([negrita('Tu sesión de hoy: '), t('los minutos, el nivel y el equipo de tu próxima sesión. El botón Preparar mi rutina empieza todo.')]),
    vineta([negrita('Tu semana: '), t('los días de lunes a domingo. Los días en que completaste una sesión aparecen con ✓, y el día de hoy tiene un borde.')]),
    vineta([negrita('Progresión: '), t('cuando estás cerca de avanzar a un ejercicio más exigente, aparece cuánto te falta (por ejemplo, «1 de 2»). Ver la sección 8.')]),
    vineta([negrita('Última sesión: '), t('cuándo fue, si la completaste y cómo te resultó.')]),
    vineta([negrita('Actualizar mis respuestas: '), t('vuelve a abrir el cuestionario para cambiar lo que respondiste.')]),
    ...recuadro('consejo', 'Sin rachas ni puntos', 'Kinetia no te pide entrenar todos los días: en la fuerza, el descanso también es parte del entrenamiento. Por eso muestra tu semana y no una racha diaria.'),
  ];
}

// ---------- 4. Preparar tu sesión ----------
function preparar() {
  const paso = nuevaLista();
  return [
    h1('4. Preparar tu sesión'),
    p('Al tocar Preparar mi rutina se abre la pantalla Prepara tu sesión. Tiene dos partes:'),
    ...pantallas([['12_preparar', 'Ajusta tu sesión'], ['14_preparar_marcadas', 'Confirmaciones marcadas']], 170),
    paso([negrita('Ajusta tu sesión. '), t('Viene con lo que respondiste en el cuestionario, pero puedes cambiarlo solo por hoy: nivel (principiante o intermedio), duración (20, 30 o 40 minutos), equipo (peso corporal o con mancuerna) y lo que prefieres evitar (con Cambiar).')]),
    paso([negrita('Antes de empezar. '), t('Marca únicamente lo que sea cierto hoy:')]),
    vineta('«No tengo dolor ni una lesión que limite el movimiento, y no estoy en recuperación clínica. Si aparece dolor durante la sesión, me comprometo a detenerla.»', { indent: { left: 1080, hanging: 360 } }),
    vineta('«Entiendo que Kinetia no enseña pasos ni evalúa mi técnica, y no ofrece diagnóstico ni rehabilitación.»', { indent: { left: 1080, hanging: 360 } }),
    p('El botón Generar rutina con IA se activa solo cuando marcas las dos. Las confirmaciones empiezan sin marcar en cada sesión, porque cómo te sientes puede cambiar de un día a otro.', { spacing: { before: 120, after: 120 } }),
    p('Al tocar el botón, la inteligencia artificial arma tu rutina. Suele tardar unos 10 segundos (entre 4 y 15 en las pruebas). Si por algún motivo tarda más de 45 segundos, Kinetia te muestra igual una rutina, armada solo con sus reglas.'),
    ...recuadro('importante', 'Si hoy tienes dolor', 'No marques la primera confirmación y no entrenes hoy. Si el dolor es intenso, no se pasa con el reposo o vuelve al moverte, consulta a un profesional de la salud.'),
  ];
}


// ---------- 5. Tu rutina ----------
function rutina() {
  return [
    h1('5. Tu rutina'),
    p('Cuando la IA termina, se abre Tu rutina. Arriba verás el recordatorio de prototipo; debajo, tus ejercicios en el orden en que los harás.'),
    ...pantallas([['16_rutina', 'Tus ejercicios'], ['17_rutina_1', 'Por qué lo eligió la IA'], ['17_rutina_4', 'Cómo la armó la IA']]),
    vineta([negrita('Cada ejercicio '), t('muestra su nombre, las series y repeticiones (o segundos) y los descansos. Si es por lado, también el descanso al cambiar de lado.')]),
    vineta([negrita('Por qué lo eligió la IA: '), t('una explicación breve de por qué ese ejercicio y esa dosis, relacionada con tu baile y tus respuestas.')]),
    vineta([negrita('Prueba suave: '), t('algunos ejercicios empiezan con unas pocas repeticiones suaves para preparar el movimiento. La rutina lo indica.')]),
    vineta([negrita('Ver la sesión completa: '), t('muestra todo en orden, en tres partes: Para empezar (calentamiento), Ejercicios y Para terminar (vuelta a la calma y estiramientos), con los cambios de posición.')]),
    vineta([negrita('Cómo la armó la IA: '), t('la duración estimada y un resumen de la IA, que eligió entre opciones que Kinetia ya había revisado.')]),
    vineta([negrita('Ajustes por tu perfil: '), t('si por tu edad o tu peso la app bajó la carga de algún ejercicio, lo verás indicado con el motivo.')]),
    ...recuadro('consejo', 'Si aparece «Se usó la rutina habitual»', [
      'La IA no respondió a tiempo o su propuesta no pasó la revisión de la app. Kinetia te muestra igual una rutina segura, armada con sus reglas, y te dice el motivo.',
      'Si dice «Modo de prueba», la app funciona sin la IA real (por ejemplo, en una demostración).',
    ]),
  ];
}

// ---------- 6. La sesión guiada ----------
function sesionGuiada() {
  return [
    h1('6. La sesión guiada'),
    p('La sesión avanza paso a paso: calentamiento, ejercicios y cierre. Arriba ves en qué parte vas («Calentamiento», «Ejercicio 2 de 5», «Cierre») y una barra con una marca por cada parte.'),
    ...pantallas([['20_sesion_calentamiento', 'Calentamiento con tiempo'], ['21_sesion_ejercicio_4', 'Técnica paso a paso'], ['24_sesion_lado', 'Ejercicio por lado']]),
    h2('6.1 Qué ves en cada ejercicio'),
    vineta([negrita('Nombre y animación: '), t('un personaje muestra el movimiento. Si tienes activada la opción «reducir movimiento» en tu teléfono o computador, verás una imagen fija.')]),
    vineta([negrita('Indicación clave: '), t('una frase corta con lo más importante (por ejemplo, «Un pie adelante y otro atrás; los pies no se mueven»).')]),
    vineta([negrita('Cambio de posición: '), t('cuando hay que cambiar de postura, aparece un aviso como «Colócate boca arriba en el suelo».')]),
    vineta([negrita('Ver técnica paso a paso: '), t('abre los pasos del ejercicio, en qué fijarte y qué evitar. La primera vez que haces un ejercicio se abre sola; después la abres solo si la necesitas.')]),
    h2('6.2 Cómo avanzar'),
    p('Abajo está la zona de acción, con lo que toca ahora en grande (por ejemplo, «Serie 1 de 2 · primer lado» y «8 repeticiones»). Según el paso, el botón dice:'),
    vineta([negrita('Terminé la serie '), t('o '), negrita('Terminé este lado: '), t('tócalo cuando termines las repeticiones.')]),
    vineta([negrita('Iniciar: '), t('en los pasos con tiempo (como la marcha o los estiramientos) empieza un cronómetro; puedes pausarlo o saltarlo.')]),
    vineta([negrita('Listo: '), t('para pasar al paso siguiente.')]),
    ...pantallas([['23_sesion_descanso', 'Descanso'], ['21_sesion_ejercicio_1', 'Técnica cerrada (ya la conoces)']], 165),
    p('Entre series viene un descanso con cuenta regresiva, que también te dice qué sigue. Al terminar, la app avanza sola; si estás lista o listo antes, toca Saltar descanso.'),
    vineta([negrita('Saltar ejercicio: '), t('si no puedes o no quieres hacer un ejercicio hoy, pasa al siguiente.')]),
    vineta([negrita('Terminar (arriba a la derecha): '), t('termina la sesión antes de tiempo y guarda lo que alcanzaste a hacer.')]),
    h2('6.3 Si sientes dolor'),
    p('El enlace Detener por dolor está siempre visible. Al tocarlo, la sesión se detiene en el momento:', { keepNext: true }),
    ...pantallas([['33_sesion_detenida', 'Sesión detenida'], ['36_detenida_fin', 'Sesión registrada'], ['38_preparar_tras_dolor', 'Aviso en la sesión siguiente']]),
    vineta('La app te recuerda que hiciste bien en parar y que no sigas hoy con el ejercicio que te causó dolor.'),
    vineta('La sesión se guarda como detenida por dolor. Con molestias, Kinetia no te hará avanzar a ejercicios más exigentes.'),
    vineta('La próxima vez, en Antes de empezar, verás un aviso que te pide confirmar que ya no tienes dolor.'),
    ...recuadro('importante', 'Cuándo consultar', 'Si el dolor es intenso, no se pasa con el reposo o vuelve al moverte, consulta a un profesional de la salud antes de tu próxima sesión.'),
  ];
}

// ---------- 7. Al terminar: ¿Cómo te fue? ----------
function comoTeFue() {
  return [
    h1('7. Al terminar: ¿Cómo te fue?'),
    p('Al final de la sesión, Kinetia te hace dos preguntas rápidas:'),
    ...pantallas([['26_como_te_fue_marcado', '¿Cómo te fue?'], ['27_celebracion', 'Sesión completada']], 170),
    vineta([negrita('¿Cómo te resultó la sesión? '), t('Fácil, Adecuada o Difícil.')]),
    vineta([negrita('¿Sentiste dolor o molestias? '), t('No o Sí.')]),
    p('Toca Guardar sesión. Si la completaste sin molestias, verás la celebración con tus minutos, ejercicios y series; si no, un resumen de lo que hiciste. Luego vuelves al inicio, donde tu semana muestra el día marcado.', { spacing: { before: 120, after: 120 } }),
    p('Tu respuesta cambia la próxima rutina:'),
    vineta([negrita('Si fue difícil, incompleta o con molestias, '), t('la IA mantiene o baja la carga y no sube de ejercicio.')]),
    vineta([negrita('Si fue fácil y completa, '), t('puede acercarte a la dosis completa y, si se repite, avanzar (sección 8).')]),
    vineta([negrita('Si fue adecuada, '), t('mantiene lo que estás haciendo.')]),
  ];
}

// ---------- 8. Cómo se avanza ----------
function avance() {
  return [
    h1('8. Cómo se avanza'),
    p('Kinetia sube la dificultad de a un paso y solo cuando estás lista o listo. Hay dos avances posibles:'),
    tabla([4513, 4513], ['Ejercicio básico', 'Avanza a'], [
      ['Puente de glúteos (con las dos piernas)', 'Puente a una pierna'],
      ['Dead bug inicial', 'Dead bug con extensión'],
    ]),
    p('Para avanzar, tus dos últimas sesiones deben cumplir todo esto:', { spacing: { before: 160, after: 80 } }),
    vineta('Las completaste y te resultaron fáciles.'),
    vineta('No sentiste dolor ni molestias.'),
    vineta('Fueron en los últimos 30 días, y en ambas hiciste completo el ejercicio básico.'),
    p('Después de la primera sesión fácil, el inicio te avisa cuánto falta («Progresión del puente y del dead bug · 1 de 2»). Con la segunda, la próxima rutina incluye el ejercicio nuevo, marcado como «Nueva variante · avance», normalmente con una dosis más suave para empezar.', { spacing: { before: 120, after: 120 } }),
    p('No se avanza si tu nivel es principiante, si elegiste evitar los ejercicios sobre una pierna (en el caso del puente) o si la sesión elegida no incluye ese ejercicio. Si después una sesión te resulta difícil o con molestias, el conteo vuelve a empezar.'),
  ];
}

// ---------- 9. Tu perfil ----------
function perfil() {
  return [
    h1('9. Tu perfil y Cómo funciona'),
    ...pantallas([['30_perfil', 'Mi perfil'], ['32_como_funciona', 'Cómo funciona']], 170),
    h2('9.1 Mi perfil'),
    p('En la pestaña Perfil ves tu nombre, edad, peso, estatura y nivel de fuerza:'),
    vineta([negrita('Configurar mi rutina: '), t('te lleva al inicio para preparar tu sesión.')]),
    vineta([negrita('Editar perfil: '), t('cambia tus datos. Los cambios se aplican a la próxima rutina.')]),
    vineta([negrita('Eliminar perfil: '), t('borra tu perfil, tus respuestas y tu historial de este dispositivo. La app te pide confirmar y no se puede deshacer.')]),
    h2('9.2 Cómo funciona'),
    p('La pestaña Cómo funciona explica en cinco pasos cómo se arma tu rutina: tus respuestas, lo que filtra Kinetia, lo que decide la IA, lo que comprueba Kinetia y cómo tu sesión cambia la siguiente.'),
  ];
}

// ---------- 10. Preguntas frecuentes ----------
function preguntas() {
  return [
    h1('10. Preguntas frecuentes'),
    tabla([3300, 5726], ['Pregunta', 'Respuesta'], [
      ['¿Por qué tarda en armar la rutina?', 'La IA suele demorar unos 10 segundos. Si pasan 45 segundos sin respuesta, Kinetia te muestra una rutina armada solo con sus reglas.'],
      ['Me apareció «Se usó la rutina habitual».', 'La IA no estuvo disponible o su propuesta no pasó la revisión. La rutina que ves es segura y válida; puedes entrenar con ella o intentarlo de nuevo más tarde.'],
      ['¿Qué significa «Modo de prueba»?', 'Que la app funciona sin la IA real, por ejemplo en una demostración. Los ejercicios son válidos, pero los motivos son de ejemplo.'],
      ['¿Dónde quedan mis datos? ¿La IA sabe mi nombre?', 'Tus datos se guardan solo en tu teléfono o navegador. A la IA solo le llegan tu edad, peso, estatura, nivel y respuestas; nunca tu nombre.'],
      ['Cambié de teléfono o de navegador y no están mis datos.', 'Es normal: no hay cuentas ni copia en la nube. Responde el cuestionario de nuevo.'],
      ['¿Puedo cambiar mis respuestas?', 'Sí, desde el inicio con Actualizar mis respuestas. Para cambiar solo la sesión de hoy, usa Ajusta tu sesión al prepararla.'],
      ['No conozco un ejercicio o no puedo hacerlo.', 'Abre Ver técnica paso a paso. Si aun así no puedes, toca Saltar ejercicio; y si es algo que prefieres evitar siempre, indícalo en tus respuestas.'],
      ['¿Por qué no avanzo a ejercicios más difíciles?', 'Necesitas dos sesiones seguidas completas, fáciles y sin molestias, en nivel intermedio (sección 8).'],
      ['La animación no se mueve.', 'Tu teléfono o computador tiene activada la opción «reducir movimiento»; en ese caso Kinetia muestra una imagen fija.'],
      ['¿Kinetia reemplaza a un entrenador?', 'No. Es un complemento para tu entrenamiento de baile: no evalúa tu técnica ni reemplaza la opinión de un profesional.'],
    ]),
  ];
}

const SECCIONES = () => [...portada(), ...indice(), ...antesDeEmpezar(), ...cuestionario(), ...inicio(), ...preparar(),
  ...rutina(), ...sesionGuiada(), ...comoTeFue(), ...avance(), ...perfil(), ...preguntas()];
// ---------- documento ----------
const documento = new Document({
  creator: 'Karla Acuña Bravo',
  title: 'Kinetia · Manual de usuario',
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
    config: [
      { reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'pasos', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } }, titlePage: true },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [t('Kinetia · Manual de usuario', { size: 18, color: GRIS })] })] }),
      first: new Header({ children: [] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [t('Página ', { size: 18, color: GRIS }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRIS })] })] }),
      first: new Footer({ children: [] }),
    },
    children: SECCIONES(),
  }],
});

Packer.toBuffer(documento).then((buffer) => {
  const salida = path.join(DIR, 'manual_usuario_kinetia.docx');
  fs.writeFileSync(salida, buffer);
  console.log('Listo:', salida, buffer.length, 'bytes');
});
