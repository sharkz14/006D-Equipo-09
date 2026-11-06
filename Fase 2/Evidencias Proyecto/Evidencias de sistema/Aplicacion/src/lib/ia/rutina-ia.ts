/**
 * Generación de la rutina con IA (LLM) a través del servidor de Kinetia.
 * El motor de reglas define los cupos y las variantes compatibles; la IA elige entre ellas
 * y solo puede mantener o reducir la dosis de la ficha. Todo se vuelve a validar aquí.
 * Ante cualquier problema se devuelve la rutina por reglas con un aviso: nunca se inventa una.
 */
import {
  generateRoutineFromAI,
  planCupos,
  type EleccionIA,
  type GeneratorInput,
  type Intensidad,
  type RoutineResult,
} from '../generador';
import { ORDEN_REGLAS, REGLAS_CARGA } from '../carga-perfil';
import { antecedentesProgresion, type Progresion } from '../sesion';

/** 0.2: cada variante lleva su tope por edad y peso, y se envían las reglas aplicadas. */
export const VERSION_CONTRATO_IA = 'kinetia-rutina-ia-0.2';

/** Datos del perfil que se envían. El nombre nunca sale del teléfono. */
export interface PerfilIA {
  edad: number;
  pesoKg: number;
  estaturaCm: number;
  nivel: 'P' | 'I';
}

export interface SolicitudRutinaIA {
  version: typeof VERSION_CONTRATO_IA;
  perfil: { edad: number; peso_kg: number; estatura_cm: number; nivel_perfil: 'P' | 'I' };
  sesion: { nivel: 'P' | 'I'; duracion_min: number; equipo: 'PC' | 'M1'; plantilla: string };
  antecedentes: Record<string, Record<string, string>>;
  /** Textos de las reglas de carga que alcanzan a alguna variante ofrecida. */
  ajustes_perfil: string[];
  cupos: {
    familia: string;
    candidatos: {
      id: string; nombre: string; nivel_minimo: 'P' | 'I'; lateralidad: string;
      series: number; cantidad: number; unidad: string;
      descanso_series_s: number; descanso_lados_s: number;
      tope_series: number; tope_intensidad: Intensidad; tope_descanso: 'estandar' | 'ampliado';
    }[];
  }[];
}

export interface RespuestaRutinaIA {
  modelo: string;
  resumen: string;
  cupos: { familia: string; ejercicio: string; series: number; intensidad: Intensidad;
    descanso: 'estandar' | 'ampliado'; motivo: string }[];
}

export type ResultadoRutinaIA =
  | { origen: 'ia'; rutina: RoutineResult; resumen: string; modelo: string; avances: Progresion[] }
  | { origen: 'reglas'; rutina: RoutineResult; aviso: string };

export interface OpcionesIA {
  url?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Los topes se calculan con el mismo perfil que se envía a la IA. */
export function conPerfilCarga(input: GeneratorInput, perfil: PerfilIA): GeneratorInput {
  return { ...input, perfilCarga: { edad: perfil.edad, pesoKg: perfil.pesoKg, estaturaCm: perfil.estaturaCm } };
}

/** Avances que caben en esta rutina: la variante exigente tiene que estar entre las compatibles de su cupo. */
export function avancesAplicables(entradaSesion: GeneratorInput, perfil: PerfilIA,
  avances: readonly Progresion[]): Progresion[] {
  const plan = planCupos(conPerfilCarga(entradaSesion, perfil));
  if (plan.estado !== 'ok') return [];
  return avances.filter(a => plan.cupos.some(c => c.familia === a.familia &&
    c.candidatos.some(k => k.id === a.exigente)));
}

/**
 * `avances`: con dos sesiones fáciles seguidas, en ese cupo solo se ofrece la variante exigente
 * (la IA decide la dosis y lo explica). Los límites por edad y peso se aplican igual.
 */
export function prepararSolicitudIA(entradaSesion: GeneratorInput, perfil: PerfilIA,
  extra: Record<string, Record<string, string>> = {}, avances: readonly Progresion[] = []): SolicitudRutinaIA | null {
  const input = conPerfilCarga(entradaSesion, perfil);
  const plan = planCupos(input);
  if (plan.estado !== 'ok') return null;
  const aplicables = avancesAplicables(entradaSesion, perfil, avances);
  const exigentePorCupo = new Map(aplicables.map(a => [a.familia, a.exigente]));
  const reglas = new Set(plan.cupos.flatMap(c => c.candidatos.flatMap(k => k.tope?.reglas ?? [])));
  // Respuestas del cuestionario (experiencia, estilos de baile) y, si existen, las del piloto.
  const antecedentes: Record<string, Record<string, string>> = {};
  for (const [grupo, valores] of Object.entries(extra)) antecedentes[grupo] = { ...valores };
  if (input.puenteIA?.entradas) antecedentes.puente_k08 = { ...input.puenteIA.entradas };
  if (input.deadBugIA && 'entradas' in input.deadBugIA) antecedentes.dead_bug_k12 = { ...input.deadBugIA.entradas };
  if (aplicables.length) antecedentes.progresion = antecedentesProgresion(aplicables);
  return {
    version: VERSION_CONTRATO_IA,
    perfil: { edad: perfil.edad, peso_kg: perfil.pesoKg, estatura_cm: perfil.estaturaCm, nivel_perfil: perfil.nivel },
    sesion: { nivel: input.nivel, duracion_min: input.duracion, equipo: input.equipo, plantilla: plan.plantilla },
    antecedentes,
    ajustes_perfil: ORDEN_REGLAS.filter(id => reglas.has(id)).map(id => REGLAS_CARGA[id].texto),
    cupos: plan.cupos.map(cupo => ({
      familia: cupo.familia,
      candidatos: cupo.candidatos.filter(c => !exigentePorCupo.has(cupo.familia) ||
        c.id === exigentePorCupo.get(cupo.familia)).map(c => ({
        id: c.id, nombre: c.nombre, nivel_minimo: c.nivelMinimo, lateralidad: c.lateralidad,
        series: c.dosisFicha.series, cantidad: c.dosisFicha.cantidad, unidad: c.dosisFicha.unidad,
        descanso_series_s: c.dosisFicha.descansoEntreSeries, descanso_lados_s: c.dosisFicha.descansoEntreLados,
        tope_series: Math.min(c.dosisFicha.series, c.tope?.seriesMax ?? c.dosisFicha.series),
        tope_intensidad: c.tope?.intensidadMax ?? 'completa',
        tope_descanso: c.tope?.descansoAmpliado ? 'ampliado' as const : 'estandar' as const,
      })),
    })),
  };
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Valida la forma de la respuesta del servidor. La compatibilidad la revisa después el motor. */
export function parsearRespuestaIA(datos: unknown): RespuestaRutinaIA {
  if (!esObjeto(datos) || typeof datos.modelo !== 'string' || typeof datos.resumen !== 'string' ||
      !Array.isArray(datos.cupos)) {
    throw new Error('La respuesta de la IA no tiene el formato esperado.');
  }
  const cupos = datos.cupos.map((c: unknown) => {
    if (!esObjeto(c) || typeof c.familia !== 'string' || typeof c.ejercicio !== 'string' ||
        typeof c.series !== 'number' || typeof c.motivo !== 'string' ||
        !['completa', 'reducida', 'minima'].includes(String(c.intensidad).toLowerCase()) ||
        !['estandar', 'ampliado'].includes(String(c.descanso).toLowerCase())) {
      throw new Error('Un cupo de la respuesta de la IA no tiene el formato esperado.');
    }
    return { familia: c.familia, ejercicio: c.ejercicio.toUpperCase(), series: c.series,
      intensidad: String(c.intensidad).toLowerCase() as Intensidad,
      descanso: String(c.descanso).toLowerCase() as 'estandar' | 'ampliado', motivo: c.motivo };
  });
  return { modelo: datos.modelo, resumen: datos.resumen.slice(0, 500), cupos };
}

export function aplicarRespuestaIA(input: GeneratorInput, respuesta: RespuestaRutinaIA): RoutineResult {
  const elecciones: EleccionIA[] = respuesta.cupos.map(c => ({
    familia: c.familia, id: c.ejercicio, motivo: c.motivo,
    ajuste: { series: c.series, intensidad: c.intensidad, descanso: c.descanso },
  }));
  return generateRoutineFromAI(input, elecciones, respuesta.modelo);
}

/** Pide la rutina a la IA; si no se puede usar, devuelve la rutina por reglas con el motivo. */
export async function generarRutinaConIA(entradaSesion: GeneratorInput, perfil: PerfilIA,
  opciones: OpcionesIA, antecedentes: Record<string, Record<string, string>> = {},
  avances: readonly Progresion[] = []): Promise<ResultadoRutinaIA> {
  // Con o sin IA, la rutina respeta los topes por edad y peso de este perfil.
  const input = conPerfilCarga(entradaSesion, perfil);
  const plan = planCupos(input);
  const respaldo = (aviso: string): ResultadoRutinaIA => ({ origen: 'reglas', rutina: plan.respaldo, aviso });
  if (plan.estado !== 'ok') return respaldo('La configuración no permite generar una rutina.');
  if (!opciones.url) return respaldo('La generación con IA no está configurada en esta versión.');
  const solicitud = prepararSolicitudIA(input, perfil, antecedentes, avances);
  const aplicados = avancesAplicables(input, perfil, avances);
  if (!solicitud) return respaldo('La configuración no permite generar una rutina.');

  const fetchImpl = opciones.fetchImpl ?? fetch;
  const controlador = new AbortController();
  // 45 s: la IA puede pensar antes de responder (las respuestas típicas tardan unos 10 s).
  const temporizador = setTimeout(() => controlador.abort(), opciones.timeoutMs ?? 45000);
  try {
    const res = await fetchImpl(opciones.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json',
        ...(opciones.token ? { 'x-kinetia-token': opciones.token } : {}) },
      body: JSON.stringify(solicitud),
      signal: controlador.signal,
    });
    if (!res.ok) return respaldo(`El servicio de IA respondió con un error (${res.status}).`);
    const respuesta = parsearRespuestaIA(await res.json());
    const rutina = aplicarRespuestaIA(input, respuesta);
    return { origen: 'ia', rutina, resumen: respuesta.resumen, modelo: respuesta.modelo,
      avances: aplicados.filter(a => rutina.principal.some(x => x.id === a.exigente)) };
  } catch (error) {
    const motivo = controlador.signal.aborted
      ? 'La IA tardó demasiado en responder.'
      : error instanceof SyntaxError
        ? 'El servicio de IA devolvió una respuesta ilegible.'
        : error instanceof Error && /compatible|cupo|dosis|motivo|formato|montar/.test(error.message)
          ? `La propuesta de la IA no pasó la validación: ${error.message}`
          : 'No se pudo conectar con el servicio de IA.';
    return respaldo(`${motivo} Se usó la rutina habitual.`);
  } finally {
    clearTimeout(temporizador);
  }
}
