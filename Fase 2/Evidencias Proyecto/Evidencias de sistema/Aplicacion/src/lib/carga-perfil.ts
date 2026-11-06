/**
 * Kinetia · topes de carga según la edad y la relación peso/estatura (IMC).
 *
 * Son criterios conservadores del proyecto, basados en guías publicadas (ACSM, NSCA, OMS y la relación
 * entre peso corporal y carga en la rodilla). No son umbrales validados clínicamente.
 * - Solo mantienen o bajan la dosis de la ficha; nunca la suben.
 * - No quitan ejercicios: qué evitar lo decide la persona en el cuestionario.
 * - Se aplican siempre, con o sin IA. La IA puede bajar más, pero no superar el tope.
 * Sin dependencias de React ni SQLite, para poder probarlo.
 */
import type { Intensidad, Level } from './generador';

export const VERSION_CARGA = 'carga-0.1';

export interface PerfilCarga {
  edad: number;
  pesoKg: number;
  estaturaCm: number;
}

export type IdReglaCarga = 'edad_50_inicio' | 'edad_65' | 'edad_65_inicio' | 'imc_30' | 'imc_35';

interface EfectoCarga {
  intensidadMax?: Intensidad;
  descansoAmpliado?: true;
  seriesMax?: number;
}

export interface ReglaCarga {
  id: IdReglaCarga;
  /** Texto para la persona; también se envía a la IA para que pueda explicarlo. */
  texto: string;
  /** «carga_concentrada»: ejercicios que cargan el cuerpo sobre una pierna o la punta de los pies. */
  alcance: 'todos' | 'carga_concentrada';
  efecto: EfectoCarga;
}

export const REGLAS_CARGA: Record<IdReglaCarga, ReglaCarga> = {
  edad_50_inicio: {
    id: 'edad_50_inicio', alcance: 'todos', efecto: { descansoAmpliado: true },
    texto: 'Desde los 50 años, si estás empezando: más descanso entre series.',
  },
  edad_65: {
    id: 'edad_65', alcance: 'todos', efecto: { descansoAmpliado: true, seriesMax: 2 },
    texto: 'Desde los 65 años: más descanso entre series y hasta 2 series por ejercicio.',
  },
  edad_65_inicio: {
    id: 'edad_65_inicio', alcance: 'todos', efecto: { intensidadMax: 'reducida' },
    texto: 'Desde los 65 años, si estás empezando: menos repeticiones.',
  },
  imc_30: {
    id: 'imc_30', alcance: 'carga_concentrada', efecto: { intensidadMax: 'reducida' },
    texto: 'Según tu peso y estatura: menos repeticiones en los ejercicios que cargan el cuerpo sobre una pierna o la punta de los pies.',
  },
  imc_35: {
    id: 'imc_35', alcance: 'carga_concentrada', efecto: { descansoAmpliado: true },
    texto: 'Según tu peso y estatura: además, más descanso en esos ejercicios.',
  },
};

/** Orden en que se muestran. */
export const ORDEN_REGLAS: readonly IdReglaCarga[] = ['edad_50_inicio', 'edad_65', 'edad_65_inicio', 'imc_30', 'imc_35'];

const ORDEN_INTENSIDAD: readonly Intensidad[] = ['completa', 'reducida', 'minima'];

/** La más conservadora de dos intensidades. */
export function menorIntensidad(a: Intensidad, b: Intensidad): Intensidad {
  return ORDEN_INTENSIDAD.indexOf(a) >= ORDEN_INTENSIDAD.indexOf(b) ? a : b;
}

export function perfilCargaValido(p: unknown): p is PerfilCarga {
  if (typeof p !== 'object' || p === null) return false;
  const v = p as Record<string, unknown>;
  return Number.isInteger(v.edad) && (v.edad as number) >= 18 &&
    typeof v.pesoKg === 'number' && Number.isFinite(v.pesoKg) && v.pesoKg > 0 &&
    typeof v.estaturaCm === 'number' && Number.isFinite(v.estaturaCm) && v.estaturaCm > 0;
}

/** Índice de masa corporal. Solo se usa por dentro: la app no lo muestra ni lo comenta. */
export function imc(p: PerfilCarga): number {
  return p.pesoKg / (p.estaturaCm / 100) ** 2;
}

/** Reglas que corresponden a la persona. «Empezando» = nivel principiante en la sesión. */
export function reglasDelPerfil(p: PerfilCarga, nivel: Level): IdReglaCarga[] {
  const reglas: IdReglaCarga[] = [];
  const empezando = nivel === 'P';
  if (p.edad >= 65) {
    reglas.push('edad_65');
    if (empezando) reglas.push('edad_65_inicio');
  } else if (p.edad >= 50 && empezando) {
    reglas.push('edad_50_inicio');
  }
  const indice = imc(p);
  if (indice >= 30) reglas.push('imc_30');
  if (indice >= 35) reglas.push('imc_35');
  return ORDEN_REGLAS.filter((id) => reglas.includes(id));
}

/** Split squat (apoyo asimétrico), puente a una pierna y elevación de talones. */
export function cargaConcentrada(ejercicio: { funcion: string; tags: readonly string[] }): boolean {
  return ejercicio.funcion === 'apoyo_asimetrico' || ejercicio.tags.includes('apoyo_un_pie') ||
    ejercicio.tags.includes('elevacion_talones');
}

export interface TopeCarga {
  intensidadMax: Intensidad;
  descansoAmpliado: boolean;
  seriesMax: number | null;
  reglas: IdReglaCarga[];
}

/** Tope para un ejercicio concreto, o null si ninguna regla lo afecta. */
export function topeCarga(p: PerfilCarga | undefined, nivel: Level,
  ejercicio: { funcion: string; tags: readonly string[] }): TopeCarga | null {
  if (!p) return null;
  const reglas = reglasDelPerfil(p, nivel)
    .filter((id) => REGLAS_CARGA[id].alcance === 'todos' || cargaConcentrada(ejercicio));
  if (!reglas.length) return null;
  const tope: TopeCarga = { intensidadMax: 'completa', descansoAmpliado: false, seriesMax: null, reglas };
  for (const id of reglas) {
    const efecto = REGLAS_CARGA[id].efecto;
    if (efecto.intensidadMax) tope.intensidadMax = menorIntensidad(tope.intensidadMax, efecto.intensidadMax);
    if (efecto.descansoAmpliado) tope.descansoAmpliado = true;
    if (efecto.seriesMax) tope.seriesMax = Math.min(tope.seriesMax ?? efecto.seriesMax, efecto.seriesMax);
  }
  return tope;
}
