/**
 * Cuestionario inicial de Kinetia: tipos y reglas puras (sin SQLite ni React), para poder probarlas.
 * Cada respuesta cambia algo: el nivel sugerido, la sesión por defecto, las exclusiones o lo que recibe la IA.
 */
import type { Equipment, Level } from './generador';

export const ESTILOS = [
  { id: 'hip_hop', texto: 'Hip hop' },
  { id: 'girly', texto: 'Girly' },
  { id: 'kpop', texto: 'K-pop' },
  { id: 'vogue', texto: 'Vogue' },
  { id: 'otro', texto: 'Otro estilo urbano' },
] as const;
export type Estilo = (typeof ESTILOS)[number]['id'];

export type Fuerza = 'no' | 'menos_6_meses' | '6_meses_o_mas';
export type Experiencia = 'nunca' | 'me_sale_bien' | 'me_cuesta' | 'hace_mucho' | 'no_se';
export type CoreSuelo = 'seguido' | 'a_veces' | 'no' | 'lo_deje';
export type Evitar = 'suelo' | 'rodillas' | 'una_pierna';
export type Duracion = 20 | 30 | 40;

export interface RespuestasCuestionario {
  estilos: Estilo[];
  fuerza: Fuerza;
  mancuerna: boolean;
  duracion: Duracion;
  /** null cuando no se preguntó (nivel sugerido principiante). */
  puenteUnaPierna: Experiencia | null;
  deadBugExtension: Experiencia | null;
  coreSuelo: CoreSuelo;
  evitar: Evitar[];
}

export const TEXTO_EXPERIENCIA: Record<Experiencia, string> = {
  nunca: 'Nunca lo he hecho',
  me_sale_bien: 'Lo hago y me sale bien',
  me_cuesta: 'Lo hago, pero me cuesta',
  hace_mucho: 'Lo hice hace mucho',
  no_se: 'No estoy seguro/a',
};
export const TEXTO_CORE: Record<CoreSuelo, string> = {
  seguido: 'Sí, seguido',
  a_veces: 'A veces',
  no: 'No',
  lo_deje: 'Lo hacía, pero lo dejé',
};
/** Texto que recibe la IA. No cambiarlo: la evaluación con el preparador se hizo con estas frases. */
export const TEXTO_FUERZA: Record<Fuerza, string> = {
  no: 'No',
  menos_6_meses: 'Sí, hace menos de 6 meses',
  '6_meses_o_mas': 'Sí, hace 6 meses o más',
};
/** Lo que ve la persona: «llevo» deja claro que se pregunta cuánto tiempo lleva entrenando. */
export const OPCION_FUERZA: Record<Fuerza, string> = {
  no: 'No',
  menos_6_meses: 'Sí, llevo menos de 6 meses',
  '6_meses_o_mas': 'Sí, llevo 6 meses o más',
};
export const TEXTO_EVITAR: Record<Evitar, string> = {
  suelo: 'Ejercicios en el suelo',
  rodillas: 'Apoyar las rodillas',
  una_pierna: 'Ejercicios sobre una pierna',
};

/** Cada opción de «evitar» se traduce a una característica que el motor ya sabe excluir. */
export const ETIQUETA_EVITAR: Record<Evitar, string> = {
  suelo: 'acceso_suelo',
  rodillas: 'apoyo_rodillas',
  una_pierna: 'apoyo_un_pie',
};

/** Regla visible y editable: solo sugiere; la persona confirma o cambia el nivel. */
export function nivelSugerido(fuerza: Fuerza): Level {
  return fuerza === '6_meses_o_mas' ? 'I' : 'P';
}

/** Las preguntas de K08 y K12 solo tienen sentido para quien podría recibir esas variantes. */
export function preguntaVariantesIntermedias(fuerza: Fuerza | null): boolean {
  return fuerza === '6_meses_o_mas';
}

export function equipoInicial(r: Pick<RespuestasCuestionario, 'mancuerna'>): Equipment {
  return r.mancuerna ? 'M1' : 'PC';
}

export function etiquetasEvitar(evitar: readonly Evitar[]): string[] {
  return [...new Set(evitar.map((e) => ETIQUETA_EVITAR[e]))];
}

/** Lo que recibe la IA: textos breves (el servidor admite hasta 40 caracteres por valor). */
export function antecedentesParaIA(r: RespuestasCuestionario): Record<string, Record<string, string>> {
  const experiencia: Record<string, string> = {
    entrena_fuerza: TEXTO_FUERZA[r.fuerza].toLowerCase(),
    core_en_suelo: TEXTO_CORE[r.coreSuelo].toLowerCase(),
  };
  if (r.puenteUnaPierna) experiencia.puente_una_pierna_K08 = TEXTO_EXPERIENCIA[r.puenteUnaPierna].toLowerCase();
  if (r.deadBugExtension) experiencia.dead_bug_extension_K12 = TEXTO_EXPERIENCIA[r.deadBugExtension].toLowerCase();
  const salida: Record<string, Record<string, string>> = { experiencia };
  if (r.estilos.length) {
    // Nombres cortos: con los cinco estilos el texto queda en 34 caracteres (límite del servidor: 40).
    const corto: Record<Estilo, string> = { hip_hop: 'Hip hop', girly: 'Girly', kpop: 'K-pop', vogue: 'Vogue', otro: 'otro' };
    const orden = ESTILOS.map((x) => x.id).filter((id) => r.estilos.includes(id));
    salida.baile = { estilos: orden.map((e) => corto[e]).join(', ') };
  }
  return salida;
}

/** Comprueba respuestas leídas de la base o del formulario; lanza un error claro si algo no calza. */
export function validarRespuestas(r: unknown): RespuestasCuestionario {
  const ok = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };
  ok(typeof r === 'object' && r !== null, 'Respuestas del cuestionario no válidas.');
  const v = r as Record<string, unknown>;
  const enLista = <T,>(x: unknown, lista: readonly T[]) => lista.includes(x as T);
  ok(Array.isArray(v.estilos) && v.estilos.every((e) => enLista(e, ESTILOS.map((x) => x.id))) &&
    new Set(v.estilos).size === v.estilos.length, 'Estilos de baile no válidos.');
  ok(enLista(v.fuerza, ['no', 'menos_6_meses', '6_meses_o_mas']), 'Falta la respuesta sobre entrenamiento de fuerza.');
  ok(typeof v.mancuerna === 'boolean', 'Falta la respuesta sobre la mancuerna.');
  ok(enLista(v.duracion, [20, 30, 40]), 'Falta la duración preferida.');
  const experiencias = ['nunca', 'me_sale_bien', 'me_cuesta', 'hace_mucho', 'no_se'];
  ok(v.puenteUnaPierna === null || enLista(v.puenteUnaPierna, experiencias), 'Respuesta del puente no válida.');
  ok(v.deadBugExtension === null || enLista(v.deadBugExtension, experiencias), 'Respuesta del dead bug no válida.');
  ok(enLista(v.coreSuelo, ['seguido', 'a_veces', 'no', 'lo_deje']), 'Falta la respuesta sobre core en el suelo.');
  ok(Array.isArray(v.evitar) && v.evitar.every((e) => enLista(e, ['suelo', 'rodillas', 'una_pierna'])) &&
    new Set(v.evitar).size === v.evitar.length, 'Opciones para evitar no válidas.');
  return {
    estilos: [...(v.estilos as Estilo[])], fuerza: v.fuerza as Fuerza, mancuerna: v.mancuerna as boolean,
    duracion: v.duracion as Duracion, puenteUnaPierna: (v.puenteUnaPierna ?? null) as Experiencia | null,
    deadBugExtension: (v.deadBugExtension ?? null) as Experiencia | null, coreSuelo: v.coreSuelo as CoreSuelo,
    evitar: [...(v.evitar as Evitar[])],
  };
}
