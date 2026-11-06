/**
 * Kinetia · servicio de generación de rutinas con IA (Claude).
 * Sin dependencias. Usa la API estándar Request/Response: corre en Node 18+ (ver local.mjs)
 * y en plataformas serverless compatibles (por ejemplo Cloudflare Workers con `export default`).
 *
 * Variables de entorno:
 *   ANTHROPIC_API_KEY  clave de la API (obligatoria salvo en modo simulado)
 *   ANTHROPIC_WORKSPACE_ID  solo si la clave no está asociada a un workspace
 *   KINETIA_TOKEN      si se define, la app debe enviarla en la cabecera x-kinetia-token
 *   KINETIA_MODELO     modelo de Claude (por defecto claude-haiku-5-5)
 *   KINETIA_SIMULADO   "1" para responder sin llamar a la API (pruebas y demo sin clave)
 */

// 0.2: cada variante trae su tope por edad y peso (calculado por la app) y la lista de reglas aplicadas.
export const VERSION_CONTRATO = 'kinetia-rutina-ia-0.2';
const MODELO_POR_DEFECTO = 'claude-haiku-5-5';
const URL_API = 'https://api.anthropic.com/v1/messages';
const INTENSIDADES = ['completa', 'reducida', 'minima'];
const DESCANSOS = ['estandar', 'ampliado'];
const FACTOR_INTENSIDAD = { completa: 1, reducida: 0.75, minima: 0.5 };
const NOMBRE_INTENSIDAD = { completa: 'completa', reducida: 'reducida', minima: 'mínima' };

/** Misma cuenta que la app (generador.ts, applyAdjustment): así la IA cita las cifras que se mostrarán. */
export function cantidadSegunIntensidad(cantidad, intensidad) {
  return Math.max(1, Math.min(cantidad, Math.round(cantidad * FACTOR_INTENSIDAD[intensidad])));
}
const FAMILIAS = ['sentadilla', 'split_squat', 'bisagra', 'puente', 'pantorrilla', 'dead_bug', 'bird_dog', 'plancha_lateral'];

const PROMPT_SISTEMA = `Eres el generador de rutinas de Kinetia, una app de fuerza y control corporal que complementa
la práctica de baile urbano. Atiende a personas adultas (18 años o más), de nivel principiante o intermedio,
que ya confirmaron no tener dolor, lesión limitante ni estar en recuperación clínica. Kinetia no diagnostica
ni rehabilita.

Recibirás el perfil de la persona, la sesión y, para cada cupo de la rutina, las variantes compatibles que ya
filtró el motor de reglas, con la dosis de su ficha. Para CADA cupo debes:
1. Elegir exactamente una variante de la lista de ese cupo.
2. Elegir las series: igual o menor que las de la ficha.
3. Elegir la intensidad: "completa" (dosis de la ficha), "reducida" (~75 % de repeticiones o segundos)
   o "minima" (~50 %).
4. Elegir el descanso: "estandar" (el de la ficha) o "ampliado" (30 s más entre series).
5. Explicar la decisión en una o dos frases, en español, hablándole a la persona («tú»).

Criterios:
- Adapta la elección y la carga a la persona: nivel, edad, relación entre peso y estatura, y antecedentes con
  cada variante cuando los haya.
- Para elegir entre la variante básica y la exigente de un cupo, usa los criterios del proyecto (contrastados con
  un preparador físico):
  · Una persona intermedia sin señales en contra parte de la variante exigente.
  · «No se sabe» es neutro: no equivale a «nunca» ni a «lo domina», y por sí solo no es una señal en contra.
  · A favor de la exigente: ya la hizo (más aún si de forma habitual), la terminó con margen, la controló bien hace
    poco, hoy practica core en el suelo de forma habitual.
  · En contra: nunca la hizo (señal leve); no practica core en el suelo de forma habitual (leve); la terminó justo
    (leve); la última vez fue hace más de un año (leve); dejó el core en el suelo hace más de un año (fuerte); le
    costó controlarla (fuerte si fue reciente, leve si fue hace más de un año); paró antes por esfuerzo (muy fuerte).
  · Lo reciente pesa más que lo antiguo: un buen control de hace más de un año casi no suma.
  · Si las señales en contra pesan más, elige la básica; si se compensan o no hay señales, la exigente.
  · Si eliges la exigente con poca información, la prudencia va en la dosis (intensidad reducida), no en cambiar
    de variante.
- Kinetia ya fijó límites de carga según la edad y la relación peso/estatura; aparecen como «Límite por perfil» en
  cada variante. Respétalos: puedes quedarte en el límite o bajar más si lo justificas, nunca superarlo. Si un límite
  cambia la dosis de un ejercicio que eliges, menciónalo con naturalidad en su motivo (por ejemplo, «con más
  descanso entre series»), sin repetir la regla completa. Con la persona, di «límite», no «tope».
- Nunca superes la dosis de la ficha ni propongas ejercicios fuera de la lista.
- Si hay antecedentes de «ultima_sesion», úsalos. Si fue difícil, quedó incompleta o hubo molestias, mantén o baja
  la carga y no pases a una variante más exigente. Si fue fácil y completa, sin molestias, puedes acercarte a la dosis
  de la ficha y, si ya hizo la variante básica con facilidad y la exigente está en la lista, considerarla. Menciona la
  última sesión en una frase breve del resumen, con las mismas palabras de la persona (fácil, adecuada o difícil):
  «adecuada» no es «fácil». «ejercicios_hechos» dice qué ya hizo: no digas que agregas o introduces un ejercicio que
  ya está ahí.
- Si hay antecedentes de «progresion», Kinetia ya dejó en ese cupo solo la variante más exigente, porque las últimas
  sesiones fueron fáciles y completas y la persona dominó la básica. Esto prevalece sobre las respuestas antiguas del
  cuestionario (por ejemplo, «nunca lo he hecho»). En su motivo, explícalo como un avance; por ser una variante nueva,
  elige una dosis prudente (por ejemplo, intensidad reducida). Menciona el avance en el resumen.
- Si en un motivo das cifras (repeticiones, segundos o descanso), usa exactamente las de la lista para la intensidad
  y el descanso que elegiste. No calcules otras.
- En el resumen y los motivos no uses los códigos de los ejercicios (K01, K08, K12…) ni palabras internas como
  «ficha», «cupo» o «tope»: nombra los ejercicios como se los dirías a la persona (por ejemplo, «el puente a una
  pierna» o «el dead bug con extensión») y habla de «la dosis completa» o «la dosis habitual».
- Nombra solo los estilos de baile que la persona indicó; si no indicó ninguno, habla del baile urbano en general y
  no nombres estilos concretos.
- Si la persona indicó estilos de baile, menciónalos en el resumen y relaciona al menos dos motivos con lo que esos
  estilos le piden al cuerpo (por ejemplo: bajar y subir con control en hip hop, estabilidad de cadera en
  movimientos de girly o vogue, aguantar coreografías largas en k-pop). Hazlo con naturalidad y
  sin prometer mejoras en su baile: describe la relación, no un resultado.
- No hagas juicios sobre la salud o el cuerpo de la persona, no menciones diagnósticos ni des consejos médicos,
  ni atribuyas a un ejercicio efectos de protección o cuidado de una articulación. Habla del peso solo en términos
  de carga del ejercicio (por ejemplo, «la pierna de adelante sostiene más carga»).
- Escribe además un resumen de la rutina en una o dos frases.`;

class ErrorSolicitud extends Error {}

function exigir(condicion, mensaje) {
  if (!condicion) throw new ErrorSolicitud(mensaje);
}

const esObjeto = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const entero = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const numero = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const texto = (v, max = 80) => typeof v === 'string' && v.length > 0 && v.length <= max;

/** Comprueba la solicitud de la app. Rechaza todo lo que no esté en el contrato. */
export function validarSolicitud(s) {
  exigir(esObjeto(s) && s.version === VERSION_CONTRATO, 'Versión de contrato no reconocida.');
  const p = s.perfil;
  exigir(esObjeto(p) && entero(p.edad, 18, 100) && numero(p.peso_kg, 25, 300) &&
    numero(p.estatura_cm, 100, 250) && ['P', 'I'].includes(p.nivel_perfil), 'Perfil no válido.');
  const se = s.sesion;
  exigir(esObjeto(se) && ['P', 'I'].includes(se.nivel) && [20, 30, 40].includes(se.duracion_min) &&
    ['PC', 'M1'].includes(se.equipo) && texto(se.plantilla, 12), 'Sesión no válida.');
  exigir(esObjeto(s.antecedentes) && Object.keys(s.antecedentes).length <= 4, 'Antecedentes no válidos.');
  for (const grupo of Object.values(s.antecedentes)) {
    exigir(esObjeto(grupo) && Object.keys(grupo).length <= 6 &&
      Object.entries(grupo).every(([k, v]) => texto(k, 40) && texto(v, 40)), 'Antecedentes no válidos.');
  }
  exigir(Array.isArray(s.ajustes_perfil) && s.ajustes_perfil.length <= 5 &&
    s.ajustes_perfil.every((t) => texto(t, 200)), 'Ajustes de perfil no válidos.');
  exigir(Array.isArray(s.cupos) && s.cupos.length >= 1 && s.cupos.length <= 8, 'Cupos no válidos.');
  const vistos = new Set();
  for (const c of s.cupos) {
    exigir(esObjeto(c) && FAMILIAS.includes(c.familia) && !vistos.has(c.familia), 'Cupo no válido.');
    vistos.add(c.familia);
    exigir(Array.isArray(c.candidatos) && c.candidatos.length >= 1 && c.candidatos.length <= 4,
      `Candidatos no válidos en ${c.familia}.`);
    for (const k of c.candidatos) {
      exigir(esObjeto(k) && /^K\d{2}$/.test(k.id) && texto(k.nombre, 90) && ['P', 'I'].includes(k.nivel_minimo) &&
        texto(k.lateralidad, 20) && entero(k.series, 1, 4) && entero(k.cantidad, 1, 60) &&
        ['repeticiones', 'segundos'].includes(k.unidad) && entero(k.descanso_series_s, 0, 300) &&
        entero(k.descanso_lados_s, 0, 120) && entero(k.tope_series, 1, k.series) &&
        INTENSIDADES.includes(k.tope_intensidad) && DESCANSOS.includes(k.tope_descanso),
        `Candidato no válido en ${c.familia}.`);
    }
  }
  return s;
}

/**
 * Esquema JSON con opciones cerradas por cupo: la IA no puede salirse de la lista. Las opciones de series,
 * intensidad y descanso ya respetan el tope por perfil cuando todas las variantes del cupo lo comparten;
 * si difieren entre variantes, la app lo vuelve a aplicar al montar la rutina.
 */
export function construirEsquema(solicitud) {
  const propiedades = {};
  for (const c of solicitud.cupos) {
    const maxSeries = Math.max(...c.candidatos.map((k) => k.tope_series));
    const desde = Math.min(...c.candidatos.map((k) => INTENSIDADES.indexOf(k.tope_intensidad)));
    const soloAmpliado = c.candidatos.every((k) => k.tope_descanso === 'ampliado');
    propiedades[c.familia] = {
      type: 'object',
      properties: {
        ejercicio: { type: 'string', enum: c.candidatos.map((k) => k.id) },
        series: { type: 'integer', enum: Array.from({ length: maxSeries }, (_, i) => i + 1) },
        intensidad: { type: 'string', enum: INTENSIDADES.slice(desde) },
        descanso: { type: 'string', enum: soloAmpliado ? ['ampliado'] : DESCANSOS },
        motivo: { type: 'string', description: 'Una o dos frases para la persona, en español.' },
      },
      required: ['ejercicio', 'series', 'intensidad', 'descanso', 'motivo'],
      additionalProperties: false,
    };
  }
  return {
    type: 'object',
    properties: {
      resumen: { type: 'string', description: 'Resumen de la rutina en una o dos frases.' },
      cupos: { type: 'object', properties: propiedades, required: Object.keys(propiedades), additionalProperties: false },
    },
    required: ['resumen', 'cupos'],
    additionalProperties: false,
  };
}

export function construirMensaje(solicitud) {
  const { perfil, sesion } = solicitud;
  const imc = perfil.peso_kg / (perfil.estatura_cm / 100) ** 2;
  const lineas = [
    `Perfil: ${perfil.edad} años; ${perfil.peso_kg} kg; ${perfil.estatura_cm} cm (relación peso/estatura² ≈ ${imc.toFixed(1)}); nivel declarado en el perfil: ${perfil.nivel_perfil === 'P' ? 'principiante' : 'intermedio'}.`,
    `Sesión: nivel ${sesion.nivel === 'P' ? 'principiante' : 'intermedio'}; ${sesion.duracion_min} minutos referenciales; ${sesion.equipo === 'PC' ? 'solo peso corporal' : 'peso corporal y una mancuerna'}.`,
    `Antecedentes declarados: ${Object.keys(solicitud.antecedentes).length ? JSON.stringify(solicitud.antecedentes) : 'ninguno'}.`,
    solicitud.antecedentes.baile?.estilos ? `Estilos de baile que indicó: ${solicitud.antecedentes.baile.estilos}.`
      : 'Estilos de baile: no indicó ninguno (no nombres estilos concretos).',
    '(K08 es el puente a una pierna; K12, el dead bug con extensión. Si no hay antecedente de una variante, es desconocido.)',
    solicitud.ajustes_perfil.length
      ? 'Límites de carga que Kinetia aplica por edad y peso:'
      : 'Límites de carga por edad y peso: ninguno para esta persona.',
    ...solicitud.ajustes_perfil.map((t) => `- ${t}`),
    '',
    'Cupos y variantes compatibles (dosis de la ficha):',
  ];
  for (const c of solicitud.cupos) {
    lineas.push(`- ${c.familia}:`);
    for (const k of c.candidatos) {
      const lado = k.lateralidad === 'bilateral' ? '' : ' por lado';
      const topes = [
        ...(k.tope_series < k.series ? [`hasta ${k.tope_series} series`] : []),
        ...(k.tope_intensidad !== 'completa' ? [`intensidad máxima ${NOMBRE_INTENSIDAD[k.tope_intensidad]}`] : []),
        ...(k.tope_descanso === 'ampliado' ? ['descanso ampliado obligatorio'] : []),
      ];
      lineas.push(`  · ${k.id} ${k.nombre} (nivel mínimo ${k.nivel_minimo}; ${k.lateralidad}): ` +
        `${k.series} series de ${k.cantidad} ${k.unidad}${lado}; descanso ${k.descanso_series_s} s entre series` +
        (k.descanso_lados_s ? `, ${k.descanso_lados_s} s entre lados` : '') + '.' +
        (topes.length ? ` Límite por perfil: ${topes.join(', ')}.` : ''));
      const permitidas = INTENSIDADES.slice(INTENSIDADES.indexOf(k.tope_intensidad));
      lineas.push(`    ${k.unidad === 'segundos' ? 'Segundos' : 'Repeticiones'}${lado} según intensidad: ` +
        permitidas.map((i) => `${NOMBRE_INTENSIDAD[i]} ${cantidadSegunIntensidad(k.cantidad, i)}`).join(', ') +
        `. Descanso ampliado: ${k.descanso_series_s + 30} s.`);
    }
  }
  return lineas.join('\n');
}

/** Respuesta determinística para pruebas o para mostrar la app sin clave: primera variante, en su tope. */
export function respuestaSimulada(solicitud) {
  const cupos = solicitud.cupos.map((c) => ({
    familia: c.familia, ejercicio: c.candidatos[0].id, series: c.candidatos[0].tope_series,
    intensidad: c.candidatos[0].tope_intensidad, descanso: c.candidatos[0].tope_descanso,
    motivo: `Simulación: se eligió ${c.candidatos[0].id}, la primera variante compatible.`,
  }));
  return { modelo: 'simulado', resumen: 'Rutina simulada para pruebas, sin llamar a la IA.', cupos };
}

/** Red de seguridad para palabras internas que a veces se cuelan pese al prompt («cupo», «dosis de la ficha»). */
export function limpiarTexto(texto) {
  return String(texto ?? '')
    .replace(/\bdosis de (la|su) ficha\b/gi, 'dosis completa')
    .replace(/\bcupos\b/g, 'ejercicios').replace(/\bCupos\b/g, 'Ejercicios')
    .replace(/\bcupo\b/g, 'ejercicio').replace(/\bCupo\b/g, 'Ejercicio');
}

/** Convierte la salida estructurada de Claude al formato que espera la app. */
export function normalizarSalida(solicitud, salida, modelo) {
  exigir(esObjeto(salida) && typeof salida.resumen === 'string' && esObjeto(salida.cupos),
    'La IA no devolvió el formato esperado.');
  const cupos = solicitud.cupos.map((c) => {
    const r = salida.cupos[c.familia];
    exigir(esObjeto(r), `La IA no completó el cupo ${c.familia}.`);
    return { familia: c.familia, ejercicio: String(r.ejercicio).toUpperCase(), series: r.series,
      intensidad: String(r.intensidad).toLowerCase(), descanso: String(r.descanso).toLowerCase(),
      motivo: limpiarTexto(r.motivo).slice(0, 400) };
  });
  return { modelo, resumen: limpiarTexto(salida.resumen).slice(0, 500), cupos };
}

export async function pedirAClaude(solicitud, env, fetchImpl = fetch) {
  const modelo = env.KINETIA_MODELO || MODELO_POR_DEFECTO;
  const res = await fetchImpl(URL_API, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.ANTHROPIC_API_KEY}`,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      // Solo para claves no asociadas a un workspace.
      ...(env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : {}),
    },
    body: JSON.stringify({
      model: modelo,
      // Haiku 5.5 piensa de forma adaptativa por defecto y esos tokens cuentan en max_tokens: con 2000, el 7 % de
      // las respuestas quedaba cortado antes del JSON (evaluación del 30-10). 16000 es el valor de la guía oficial.
      max_tokens: 16000,
      system: PROMPT_SISTEMA,
      messages: [{ role: 'user', content: construirMensaje(solicitud) }],
      output_config: { format: { type: 'json_schema', schema: construirEsquema(solicitud) } },
    }),
  });
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`La API de Claude respondió ${res.status}: ${cuerpo?.error?.message ?? 'sin detalle'}`);
  }
  if (cuerpo?.stop_reason === 'refusal') throw new Error('La IA no generó la rutina (rechazo).');
  if (cuerpo?.stop_reason === 'max_tokens') throw new Error('La respuesta de la IA quedó incompleta.');
  const bloque = (cuerpo?.content ?? []).find((b) => b.type === 'text');
  if (!bloque) throw new Error('La IA no devolvió texto.');
  return normalizarSalida(solicitud, JSON.parse(bloque.text), modelo);
}

const CABECERAS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-kinetia-token',
};
const responder = (estado, datos) => new Response(JSON.stringify(datos), { status: estado, headers: CABECERAS });

export async function manejarSolicitud(request, env = {}, fetchImpl = fetch) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CABECERAS });
  if (request.method !== 'POST') return responder(405, { error: 'Usa POST.' });
  if (env.KINETIA_TOKEN && request.headers.get('x-kinetia-token') !== env.KINETIA_TOKEN) {
    return responder(401, { error: 'Token no válido.' });
  }
  let solicitud;
  try {
    const crudo = await request.text();
    exigir(crudo.length <= 20000, 'Solicitud demasiado grande.');
    solicitud = validarSolicitud(JSON.parse(crudo));
  } catch (error) {
    return responder(400, { error: error instanceof ErrorSolicitud ? error.message : 'JSON no válido.' });
  }
  if (env.KINETIA_SIMULADO === '1') return responder(200, respuestaSimulada(solicitud));
  if (!env.ANTHROPIC_API_KEY) return responder(503, { error: 'Falta ANTHROPIC_API_KEY en el servidor.' });
  try {
    return responder(200, await pedirAClaude(solicitud, env, fetchImpl));
  } catch (error) {
    return responder(502, { error: error instanceof Error ? error.message : 'Error de la IA.' });
  }
}

// Formato de Cloudflare Workers y similares.
export default { fetch: (request, env) => manejarSolicitud(request, env) };
