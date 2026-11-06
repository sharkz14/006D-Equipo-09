/* Puerto móvil de la simulación v0.1. Sin acceso a archivos ni módulos de Node.
 * Las fichas son borradores: toda rutina mantiene ejecutable: false.
 * modo: 'borrador' es control de desarrollo; la pantalla no lo ofrece al usuario.
 */
import { predecirPuente, validarEntradasPuente } from './ia/selector-puente';
import type { PasoArbol, SolicitudPuente } from './ia/selector-puente';
import { seleccionarK11K12 } from './ia/selectorK11K12';
import type { PasoK11K12 } from './ia/selectorK11K12';
import type { SolicitudDeadBug } from './ia/formulario-dead-bug';
import {
  ORDEN_REGLAS, REGLAS_CARGA, VERSION_CARGA, menorIntensidad, perfilCargaValido, topeCarga,
  type IdReglaCarga, type PerfilCarga, type TopeCarga,
} from './carga-perfil';

export type Level = 'P' | 'I';
export type Equipment = 'PC' | 'M1';
export type GeneratorMode = 'app' | 'borrador';
export type DoseUnit = 'repeticiones' | 'segundos';
export type Laterality = 'bilateral' | 'por_lado' | 'alternado' | 'sosten_por_lado';
export type RoutineState = 'pendiente' | 'entrada_invalida' | 'filtro_no_superado' |
  'plantilla_pendiente' | 'sin_principal' | 'borrador' | 'configuracion_app';
export interface Exclusions { ids?: string[]; familias?: string[]; tags?: string[] }
export interface GeneratorInput {
  nivel: Level;
  equipo: Equipment;
  duracion: number;
  filtroSuperado: boolean;
  modo?: GeneratorMode;
  excluir?: Exclusions;
  cierreOpcional?: string[];
  puenteIA?: SolicitudPuente;
  deadBugIA?: SolicitudDeadBug;
  /** Edad, peso y estatura: fijan topes de carga (ver carga-perfil.ts). Sin perfil, no hay topes. */
  perfilCarga?: PerfilCarga;
}
export interface Dose {
  series: number;
  cantidad: number;
  unidad: DoseUnit;
  descansoEntreSeries: number;
  descansoEntreLados: number;
}
export interface SelectionMetadata {
  id: string;
  familia: string;
  posicion: string;
  tags: string[];
  habilitado: boolean;
}
export interface CatalogExercise extends SelectionMetadata {
  nombre: string;
  funcion: string;
  equipo: Equipment;
  nivelMinimo: Level;
  lateralidad: Laterality;
  versionFicha: string;
  dosis: Record<Level, Dose | null>;
}
export interface ExerciseCount {
  lados: number;
  totalRepeticiones: number | null;
  totalSostenerSegundos: number | null;
  totalSostenes: number;
  totalDescansoSegundos: number;
}
/** Ajuste que puede pedir la IA generativa: solo reduce o mantiene la dosis de la ficha. */
export type Intensidad = 'completa' | 'reducida' | 'minima';
export interface AjusteDosis {
  series: number;
  intensidad: Intensidad;
  descanso: 'estandar' | 'ampliado';
}
export const FACTOR_INTENSIDAD: Record<Intensidad, number> = { completa: 1, reducida: 0.75, minima: 0.5 };
export const DESCANSO_AMPLIADO_S = 30;
export interface DecisionMetadata {
  origen: 'modelo' | 'regla' | 'opcion_unica' | 'manual' | 'ia';
  motivo: string;
  candidatos: string[];
  modeloId?: string;
  modeloSha256?: string;
  recorrido?: PasoArbol[];
  ajusteDosis?: AjusteDosis;
}
/** Qué cambió el tope por perfil respecto de la dosis elegida, y por qué reglas. */
export interface AjustePerfil {
  reglas: IdReglaCarga[];
  cambios: ('series' | 'intensidad' | 'descanso')[];
}
export interface PrincipalExercise {
  id: string;
  nombre: string;
  familia: string;
  funcion: string;
  equipo: Equipment;
  posicion: string;
  lateralidad: Laterality;
  tags: string[];
  versionFicha: string;
  dosis: Dose;
  conteo: ExerciseCount;
  seleccion: DecisionMetadata;
  /** Solo si el tope por edad o peso bajó la dosis. */
  ajustePerfil?: AjustePerfil;
}
export interface TransitionBlock {
  tipo: 'transicion';
  desde: string;
  hacia: string;
  tags: string[];
  segundosEstimados: number;
}
export interface AuxiliaryBlock {
  tipo: 'auxiliar';
  fase: 'preparacion' | 'cierre';
  id: string;
  familia: string;
  posicion: string;
  tags: string[];
  segundosEstimados: number;
  dosis?: { unidad: 'segundos'; cantidadPorLado: number; lados: number; sostenesPorLado: number };
}
export interface TrialBlock {
  tipo: 'ensayo';
  fase: 'preparacion';
  id: string;
  familia: string;
  posicion: string;
  tags: string[];
  repeticiones: number;
  guiaSegundosEstimados: number;
  pausaSegundos: number;
  segundosEstimados: number;
}
export interface PrincipalBlock extends PrincipalExercise {
  tipo: 'principal';
  fase: 'principal';
  guiaSegundosEstimados: number;
  segundosEstimados: number;
}
export type ActivityBlock = AuxiliaryBlock | TrialBlock | PrincipalBlock;
export type SequenceBlock = TransitionBlock | ActivityBlock;
export interface DurationEstimate {
  objetivoMinutos: number;
  minutosAproximados: number | null;
  estado: 'pendiente_manejo_y_preparacion' | 'estimacion_de_escritorio';
  parcialSegundosParaCalculo: number;
}
export interface RoutineResult {
  version: string;
  entrada: GeneratorInput;
  estado: RoutineState;
  ejecutable: false;
  plantilla: string | null;
  versionPlantilla: string | null;
  principal: PrincipalExercise[];
  omitidos: string[];
  auxiliaresOmitidos: string[];
  secuencia: SequenceBlock[];
  mensajes: string[];
  duracion: DurationEstimate | null;
  /** Solo con perfil: reglas de carga que alcanzan a algún ejercicio de esta rutina. */
  cargaPerfil?: { version: string; reglas: IdReglaCarga[] };
}

// Copia explícita para Hermes; también conserva entradas inválidas para validarlas.
function copyInput(input: GeneratorInput): GeneratorInput {
  const result = { ...input };
  if (input.excluir) {
    result.excluir = { ...input.excluir };
    for (const field of ['ids', 'familias', 'tags'] as const) {
      const values = input.excluir[field];
      if (Array.isArray(values)) result.excluir[field] = [...values];
    }
  }
  if (Array.isArray(input.cierreOpcional)) result.cierreOpcional = [...input.cierreOpcional];
  if (input.puenteIA && typeof input.puenteIA === 'object') {
    result.puenteIA = { ...input.puenteIA };
    if (input.puenteIA.entradas && typeof input.puenteIA.entradas === 'object') {
      result.puenteIA.entradas = { ...input.puenteIA.entradas };
    }
  }
  if (input.deadBugIA && typeof input.deadBugIA === 'object') {
    result.deadBugIA = 'entradas' in input.deadBugIA && input.deadBugIA.entradas &&
      typeof input.deadBugIA.entradas === 'object'
      ? { entradas: { ...input.deadBugIA.entradas } }
      : { ...input.deadBugIA };
  }
  if (input.perfilCarga && typeof input.perfilCarga === 'object') result.perfilCarga = { ...input.perfilCarga };
  return result;
}

export const VERSION = `simulacion-0.2-reglas-0.6-ia-k06-k08-0.1-k11-k12-0.4-llm-0.2-${VERSION_CARGA}`;
const FLOOR = new Set(['boca_arriba', 'cuadrupedia', 'lateral']);
const dose = (value: number | null, rest: number, sideRest = 0, unit: DoseUnit = 'repeticiones'): Dose | null =>
  value === null ? null : { series: 2, cantidad: value, unidad: unit,
    descansoEntreSeries: rest, descansoEntreLados: sideRest };

function exercise(id: string, nombre: string, familia: string, funcion: string, equipo: Equipment, nivelMinimo: Level,
  posicion: string, lateralidad: Laterality, p: number | null, i: number | null, rest: number, sideRest = 0, tags: string[] = []): CatalogExercise {
  return { id, nombre, familia, funcion, equipo, nivelMinimo, posicion,
    lateralidad, tags: [posicion, ...tags], habilitado: false, versionFicha: '0.1',
    dosis: { P: dose(p, rest, sideRest), I: dose(i, rest, sideRest) } };
}

// Metadatos para selección. Las instrucciones y variantes exactas siguen en las fichas.
export const CATALOG: Record<string, CatalogExercise> = Object.fromEntries([
  exercise('K01', 'Sentadilla corporal', 'sentadilla', 'rodilla', 'PC', 'P',
    'de_pie', 'bilateral', 8, 10, 90),
  exercise('K02', 'Sentadilla goblet, una mancuerna', 'sentadilla', 'rodilla', 'M1', 'P',
    'de_pie', 'bilateral', 8, 10, 90, 0, ['sujecion_carga']),
  exercise('K03', 'Split squat corporal', 'split_squat', 'apoyo_asimetrico', 'PC', 'P',
    'de_pie', 'por_lado', 6, 8, 90, 30),
  exercise('K04', 'Split squat goblet, una mancuerna', 'split_squat', 'apoyo_asimetrico', 'M1', 'I',
    'de_pie', 'por_lado', null, 6, 90, 30, ['sujecion_carga']),
  exercise('K05', 'Rumano bilateral, una mancuerna con ambas manos', 'bisagra', 'cadera', 'M1', 'I',
    'de_pie', 'bilateral', null, 8, 90, 0, ['sujecion_carga']),
  exercise('K06', 'Puente bilateral corporal', 'puente', 'cadera', 'PC', 'P',
    'boca_arriba', 'bilateral', 10, 12, 90, 0, ['manos_en_suelo', 'brazos_en_suelo']),
  exercise('K07', 'Puente bilateral, mancuerna en pelvis', 'puente', 'cadera', 'M1', 'P',
    'boca_arriba', 'bilateral', 8, 10, 90, 0, ['sujecion_carga']),
  exercise('K08', 'Puente unilateral, pierna contraria sujeta detrás del muslo', 'puente', 'cadera', 'PC', 'I',
    'boca_arriba', 'por_lado', null, 6, 90, 30, ['sujecion_muslo', 'apoyo_un_pie']),
  exercise('K09', 'Talones bilaterales, suelo plano, sin apoyo externo', 'pantorrilla', 'pantorrilla', 'PC', 'P',
    'de_pie', 'bilateral', 10, 12, 60, 0, ['elevacion_talones']),
  exercise('K10', 'Talones bilaterales goblet, una mancuerna', 'pantorrilla', 'pantorrilla', 'M1', 'P',
    'de_pie', 'bilateral', 8, 10, 60, 0, ['elevacion_talones', 'sujecion_carga']),
  exercise('K11', 'Dead bug inicial desde apoyos', 'dead_bug', 'control_anterior', 'PC', 'P',
    'boca_arriba', 'alternado', 5, 6, 60, 0, ['manos_en_suelo', 'brazos_atras']),
  exercise('K12', 'Dead bug con extensión contralateral', 'dead_bug', 'control_anterior', 'PC', 'I',
    'boca_arriba', 'alternado', null, 5, 60, 0, ['brazos_atras', 'piernas_sin_apoyo']),
  exercise('K13', 'Bird dog contralateral', 'bird_dog', 'cuadrupedia', 'PC', 'I',
    'cuadrupedia', 'alternado', null, 5, 60, 0, ['apoyo_manos', 'apoyo_rodillas']),
  exercise('K14', 'Plancha lateral con rodillas apoyadas', 'plancha_lateral', 'control_lateral', 'PC', 'P',
    'lateral', 'sosten_por_lado', 10, 15, 60, 30, ['apoyo_antebrazo', 'apoyo_rodillas']),
].map(item => [item.id, item]));
for (const level of ['P', 'I'] as const) CATALOG.K14.dosis[level]!.unidad = 'segundos';

export const AUX: Record<string, SelectionMetadata> = {
  P01: { id: 'P01', familia: 'marcha', posicion: 'de_pie', tags: ['de_pie', 'marcha'], habilitado: false },
  P02: { id: 'P02', familia: 'marcha', posicion: 'de_pie', tags: ['de_pie', 'marcha', 'giros_hombros'], habilitado: false },
  C01: { id: 'C01', familia: 'caminata', posicion: 'de_pie', tags: ['de_pie', 'caminata'], habilitado: false },
  C02: { id: 'C02', familia: 'estiramiento_gluteo', posicion: 'boca_arriba', tags: ['boca_arriba', 'sujecion_muslo', 'pierna_cruzada'], habilitado: false },
  C03: { id: 'C03', familia: 'estiramiento_cuadriceps', posicion: 'lateral', tags: ['lateral', 'sujecion_pie', 'apoyo_brazo', 'flexion_rodilla'], habilitado: false },
};

// Cada lista tiene el mismo orden que las reglas publicadas.
export const PRIORITIES: Record<string, Record<string, string[]>> = {
  P_PC: { sentadilla: ['K01'], split_squat: ['K03'], bisagra: [], puente: ['K06'],
    pantorrilla: ['K09'], dead_bug: ['K11'], bird_dog: [], plancha_lateral: ['K14'] },
  P_M1: { sentadilla: ['K02', 'K01'], split_squat: ['K03'], bisagra: [], puente: ['K06', 'K07'],
    pantorrilla: ['K09', 'K10'], dead_bug: ['K11'], bird_dog: [], plancha_lateral: ['K14'] },
  I_PC: { sentadilla: ['K01'], split_squat: ['K03'], bisagra: [], puente: ['K08', 'K06'],
    pantorrilla: ['K09'], dead_bug: ['K12', 'K11'], bird_dog: ['K13'], plancha_lateral: ['K14'] },
  I_M1: { sentadilla: ['K02', 'K01'], split_squat: ['K04', 'K03'], bisagra: ['K05'], puente: ['K08', 'K06', 'K07'],
    pantorrilla: ['K09', 'K10'], dead_bug: ['K12', 'K11'], bird_dog: ['K13'], plancha_lateral: ['K14'] },
};
export const FAMILIES: Record<string, string> = {
  sentadilla: 'rodilla', split_squat: 'apoyo_asimetrico', bisagra: 'cadera', puente: 'cadera',
  pantorrilla: 'pantorrilla', dead_bug: 'control_anterior', bird_dog: 'cuadrupedia', plancha_lateral: 'control_lateral',
};
export const TEMPLATE_ORDERS: Record<string, string[]> = {
  P20: ['sentadilla', 'puente', 'dead_bug'],
  P30: ['sentadilla', 'split_squat', 'pantorrilla', 'puente', 'dead_bug'],
  P40: ['sentadilla', 'split_squat', 'pantorrilla', 'puente', 'dead_bug', 'plancha_lateral'],
  I20_PC: ['sentadilla', 'puente', 'dead_bug'],
  I30_PC: ['sentadilla', 'split_squat', 'pantorrilla', 'puente', 'dead_bug'],
  I40_PC: ['sentadilla', 'split_squat', 'pantorrilla', 'puente', 'dead_bug', 'bird_dog', 'plancha_lateral'],
  I20_M1: ['sentadilla', 'bisagra', 'dead_bug'],
  I30_M1: ['sentadilla', 'split_squat', 'bisagra', 'pantorrilla', 'dead_bug'],
  I40_M1: ['sentadilla', 'split_squat', 'bisagra', 'pantorrilla', 'dead_bug', 'bird_dog', 'plancha_lateral'],
};
export const KNOWN_IDS = new Set([...Object.keys(CATALOG), ...Object.keys(AUX)]);
export const KNOWN_FAMILIES = new Set([...Object.keys(FAMILIES), ...Object.values(AUX).map(x => x.familia)]);
export const KNOWN_TAGS = new Set([...Object.values(CATALOG), ...Object.values(AUX)].flatMap(x => x.tags).concat('acceso_suelo'));

function totals(exercise: CatalogExercise, d: Dose): ExerciseCount {
  const sides = exercise.lateralidad === 'bilateral' ? 1 : 2;
  const count = d.series * d.cantidad * sides;
  const rest = (d.series - 1) * d.descansoEntreSeries +
    (exercise.lateralidad === 'por_lado' || exercise.lateralidad === 'sosten_por_lado'
      ? d.series * d.descansoEntreLados : 0);
  return { lados: sides, totalRepeticiones: d.unidad === 'repeticiones' ? count : null,
    totalSostenerSegundos: d.unidad === 'segundos' ? count : null,
    totalSostenes: d.unidad === 'segundos' ? d.series * sides : 0,
    totalDescansoSegundos: rest };
}

interface SelectionOverride { id: string; seleccion: DecisionMetadata }

function copyDecision(selection: DecisionMetadata): DecisionMetadata {
  return { ...selection, candidatos: [...selection.candidatos],
    ...(selection.recorrido ? { recorrido: selection.recorrido.map(step => ({ ...step })) } : {}),
    ...(selection.ajusteDosis ? { ajusteDosis: { ...selection.ajusteDosis } } : {}) };
}

/** Dosis de la ficha para el nivel, con la única variación por plantilla vigente (P40). */
function templateDose(key: string, item: CatalogExercise, nivel: Level): Dose {
  const d: Dose = { ...item.dosis[nivel]! };
  if (key === 'P40' && ['K01', 'K06', 'K11'].includes(item.id)) d.series = 3;
  return d;
}

/** Aplica el ajuste de la IA: nunca supera las series, la cantidad ni acorta el descanso de la ficha. */
function applyAdjustment(d: Dose, ajuste: AjusteDosis | undefined): Dose {
  if (!ajuste) return d;
  return { ...d,
    series: Math.max(1, Math.min(d.series, ajuste.series)),
    cantidad: Math.max(1, Math.min(d.cantidad, Math.round(d.cantidad * FACTOR_INTENSIDAD[ajuste.intensidad]))),
    descansoEntreSeries: d.descansoEntreSeries + (ajuste.descanso === 'ampliado' ? DESCANSO_AMPLIADO_S : 0),
  };
}

/** Combina el ajuste elegido (IA, o ninguno) con el tope por perfil: gana siempre lo más conservador. */
function withProfileLimit(d: Dose, ajuste: AjusteDosis | undefined, tope: TopeCarga | null): AjusteDosis | undefined {
  if (!tope) return ajuste;
  return {
    series: Math.min(ajuste?.series ?? d.series, tope.seriesMax ?? d.series),
    intensidad: menorIntensidad(ajuste?.intensidad ?? 'completa', tope.intensidadMax),
    descanso: ajuste?.descanso === 'ampliado' || tope.descansoAmpliado ? 'ampliado' : 'estandar',
  };
}

/** Registra qué bajó el tope y qué reglas lo explican; undefined si no cambió nada. */
function describeProfileLimit(sinTope: Dose, final: Dose, tope: TopeCarga | null): AjustePerfil | undefined {
  if (!tope) return undefined;
  const cambios: AjustePerfil['cambios'] = [];
  if (final.series < sinTope.series) cambios.push('series');
  if (final.cantidad < sinTope.cantidad) cambios.push('intensidad');
  if (final.descansoEntreSeries > sinTope.descansoEntreSeries) cambios.push('descanso');
  if (!cambios.length) return undefined;
  const reglas = tope.reglas.filter((id) => {
    const efecto = REGLAS_CARGA[id].efecto;
    return (!!efecto.seriesMax && cambios.includes('series')) ||
      (!!efecto.intensidadMax && cambios.includes('intensidad')) ||
      (!!efecto.descansoAmpliado && cambios.includes('descanso'));
  });
  return { reglas, cambios };
}

/** El piloto conserva exactamente las variantes y dosis del experimento. */
function matchesPilotExercise(item: CatalogExercise): boolean {
  const unilateral = item.id === 'K08';
  if (item.id !== 'K06' && !unilateral) return false;
  const expectedTags = unilateral
    ? ['boca_arriba', 'sujecion_muslo', 'apoyo_un_pie']
    : ['boca_arriba', 'manos_en_suelo', 'brazos_en_suelo'];
  const expectedName = unilateral
    ? 'Puente unilateral, pierna contraria sujeta detrás del muslo'
    : 'Puente bilateral corporal';
  const d = item.dosis.I;
  return item.nombre === expectedName && item.familia === 'puente' && item.funcion === 'cadera' &&
    item.equipo === 'PC' && item.nivelMinimo === (unilateral ? 'I' : 'P') &&
    item.posicion === 'boca_arriba' && item.lateralidad === (unilateral ? 'por_lado' : 'bilateral') &&
    item.versionFicha === '0.1' &&
    JSON.stringify([...item.tags].sort()) === JSON.stringify(expectedTags.sort()) &&
    !!d && d.series === 2 && d.cantidad === (unilateral ? 6 : 12) &&
    d.unidad === 'repeticiones' && d.descansoEntreSeries === 90 &&
    d.descansoEntreLados === (unilateral ? 30 : 0);
}

function selectBridge(input: GeneratorInput, candidates: CatalogExercise[], allowModel: boolean):
  { selected: CatalogExercise; selection: DecisionMetadata } {
  const candidateIds = candidates.map(item => item.id);
  const fallback = (motivo: string) => ({ selected: candidates[0],
    selection: { origen: 'regla' as const, motivo, candidatos: candidateIds } });
  const noExclusions = ['ids', 'familias', 'tags'].every(
    field => !(input.excluir?.[field as keyof Exclusions]?.length));
  if (!allowModel) return fallback('Se conserva la selección compatible sin volver a consultar el modelo.');
  if (input.nivel !== 'I' || input.equipo !== 'PC' || input.duracion !== 20 ||
      input.modo !== 'borrador' || input.filtroSuperado !== true || !noExclusions ||
      candidateIds.length !== 2 || !candidateIds.includes('K06') || !candidateIds.includes('K08') ||
      !candidates.every(matchesPilotExercise)) {
    return fallback('Esta configuración queda fuera del piloto K06/K08; se aplica el orden de prioridad.');
  }
  const request = input.puenteIA;
  if (!request) return fallback('Sin respuestas del piloto K06/K08; se aplica el orden de prioridad.');
  try {
    validarEntradasPuente(request.entradas);
    const never = request.entradas.experiencia_k08 === 'nunca';
    if ((never && request.dosisPrevia !== 'no_aplica') || (!never && request.dosisPrevia !== 'coincide')) {
      return fallback('La dosis de la experiencia previa no coincide o no está confirmada; se aplica el orden de prioridad.');
    }
    const prediction = predecirPuente(request.entradas);
    const selected = candidates.find(item => item.id === prediction.id);
    if (!selected) return fallback('El modelo no devolvió una opción compatible; se aplica el orden de prioridad.');
    return { selected, selection: {
      origen: 'modelo', motivo: prediction.explicacion, candidatos: candidateIds,
      modeloId: prediction.modeloId, modeloSha256: prediction.modeloSha256,
      recorrido: prediction.recorrido.map(step => ({ ...step })),
    } };
  } catch {
    return fallback('No se pudo aplicar el modelo con estas respuestas; se aplica el orden de prioridad.');
  }
}

const MODELO_K11_K12_SHA256 = '8ac32b14710dd6baa46f3275e24bcbb3bd5bcffe237ba1be5f4fe381d626e58d';

// Texto de cada condición del árbol K11/K12: [si se cumple, si no se cumple].
const CONDICIONES_K11_K12: Record<string, [string, string]> = {
  experiencia_k12_nunca: ['nunca hiciste esta variante', 'no indicaste que nunca la hiciste'],
  experiencia_k12_practico: ['ya la practicaste', 'no indicaste que la practicaste'],
  experiencia_k12_desconocida: ['no sabes si la hiciste', 'sabes si la hiciste'],
  control_k12_controlado: ['recuerdas que la controlaste', 'no indicaste que la controlaste'],
  control_k12_dificultad_control: ['te costó mantener la espalda estable', 'no indicaste dificultad para mantener la espalda estable'],
  control_k12_desconocido: ['no recuerdas cómo te resultó', 'recuerdas cómo te resultó'],
  control_k12_no_aplica: ['no hay un intento previo que recordar', 'hay un intento previo'],
  historia_core_habitual_actual: ['hoy practicas core en el suelo', 'hoy no practicas core en el suelo de forma habitual'],
  historia_core_sin_practica_habitual: ['no practicas core de forma habitual', 'no indicaste que no practicas core'],
  historia_core_interrumpida_mas_de_12_meses: ['dejaste el core hace más de 12 meses', 'no dejaste el core hace más de 12 meses'],
  historia_core_desconocida: ['no sabes si practicas core', 'sabes si practicas core'],
  antiguedad_k12_un_mes: ['la última vez fue hace un mes', 'la última vez no fue hace un mes'],
  antiguedad_k12_mas_de_12_meses: ['la última vez fue hace más de 12 meses', 'la última vez no fue hace más de 12 meses'],
  antiguedad_k12_desconocida: ['no recuerdas cuándo fue', 'recuerdas cuándo fue'],
  antiguedad_k12_no_aplica: ['no hay una última vez', 'hay una última vez'],
};

function explicarDeadBug(id: string, ruta: PasoK11K12[]): string {
  const condiciones = ruta.map(paso => {
    const textos = CONDICIONES_K11_K12[paso.variable];
    return textos ? textos[paso.valor === 1 ? 0 : 1] : paso.variable;
  });
  return `El árbol K11/K12 eligió ${id} porque ${condiciones.join(', ')}.`;
}

/** El modelo solo interviene si el contexto REAL del cupo coincide con su contrato. */
function selectDeadBug(input: GeneratorInput, candidates: CatalogExercise[], allowModel: boolean,
  nivel: Level): { selected: CatalogExercise; selection: DecisionMetadata } {
  const candidateIds = candidates.map(item => item.id);
  const fallback = (motivo: string) => ({ selected: candidates[0],
    selection: { origen: 'regla' as const, motivo, candidatos: candidateIds } });
  if (!allowModel) return fallback('Se conserva la selección compatible sin volver a consultar el modelo.');
  const request = input.deadBugIA;
  if (!request) return fallback('Sin respuestas del piloto K11/K12; se aplica el orden de prioridad.');
  if (!('entradas' in request)) {
    return fallback('La fecha indicada no está entre las categorías del modelo K11/K12; se aplica el orden de prioridad.');
  }
  const ordenados = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  const versiones = [...new Set(candidates.map(item => item.versionFicha))];
  const dosis = Object.fromEntries(ordenados.map(item => {
    const d = item.dosis[nivel];
    return [item.id, d && d.unidad === 'repeticiones'
      ? { series: d.series, repeticiones_por_lado: d.cantidad, descanso_series_s: d.descansoEntreSeries }
      : null];
  }));
  const exclusiones = ['ids', 'familias', 'tags']
    .flatMap(field => input.excluir?.[field as keyof Exclusions] ?? []);
  const contexto = {
    familia: 'dead_bug', cupo: FAMILIES.dead_bug, nivel: input.nivel, equipo: input.equipo,
    duracion_referencial_min: input.duracion, filtro_superado: input.filtroSuperado,
    exclusiones, candidatos_compatibles: ordenados.map(item => item.id),
    fichas_version: versiones.length === 1 ? versiones[0] : versiones,
    modo: input.modo === 'borrador' ? 'experimento_borrador' : (input.modo ?? 'app'),
    dosis,
  };
  const decision = seleccionarK11K12(request.entradas, contexto);
  if (decision.estado === 'no_aplica') {
    const motivos = {
      contexto_fuera_de_alcance: 'Esta configuración queda fuera del piloto K11/K12; se aplica el orden de prioridad.',
      entradas_invalidas: 'Las respuestas del piloto K11/K12 no son coherentes; se aplica el orden de prioridad.',
      modelo_invalido: 'No se pudo cargar el modelo K11/K12; se aplica el orden de prioridad.',
    };
    return fallback(motivos[decision.motivo]);
  }
  const selected = candidates.find(item => item.id === decision.ejercicioId);
  if (!selected) return fallback('El modelo no devolvió una opción compatible; se aplica el orden de prioridad.');
  return { selected, selection: {
    origen: 'modelo', motivo: explicarDeadBug(selected.id, decision.traza.ruta), candidatos: candidateIds,
    modeloId: decision.modeloId, modeloSha256: MODELO_K11_K12_SHA256,
    recorrido: decision.traza.ruta.map(paso => ({ nodo: paso.nodo, columna: paso.variable,
      valor: paso.valor, umbral: paso.umbral, rama: paso.rama })),
  } };
}

function buildRoutine(input: GeneratorInput, catalog: Record<string, CatalogExercise> = CATALOG,
  overrides: Readonly<Record<string, SelectionOverride>> = {}, allowModel = true): RoutineResult {
  const { nivel, equipo, duracion } = input;
  const modo = input.modo ?? 'app'; // El uso de borradores requiere modo explícito.
  const exclusions = { ids: [], familias: [], tags: [], ...input.excluir };
  const optional = input.cierreOpcional ?? ['C02', 'C03'];
  const result: RoutineResult = { version: VERSION, entrada: copyInput(input), estado: 'pendiente',
    ejecutable: false, plantilla: null, versionPlantilla: null, principal: [], omitidos: [], auxiliaresOmitidos: [],
    secuencia: [], mensajes: [], duracion: null };
  const stop = (state: RoutineState, message: string): RoutineResult => { result.estado = state; result.mensajes.push(message); return result; };

  if (!['P', 'I'].includes(nivel) || !['PC', 'M1'].includes(equipo) || !['borrador', 'app'].includes(modo))
    return stop('entrada_invalida', 'Revisar nivel, equipo o modo de simulación.');
  if (!Number.isInteger(duracion))
    return stop('entrada_invalida', 'La duración debe ser un número entero de minutos.');
  for (const [field, known] of [['ids', KNOWN_IDS], ['familias', KNOWN_FAMILIES], ['tags', KNOWN_TAGS]] as const) {
    if (!Array.isArray(exclusions[field]) || exclusions[field].some(x => !known.has(x)))
      return stop('entrada_invalida', `Exclusión desconocida en ${field}; no se ignora.`);
  }
  if (!Array.isArray(optional) || optional.some(x => !['C02', 'C03'].includes(x)))
    return stop('entrada_invalida', 'Revisar las opciones de cierre.');
  if (input.perfilCarga !== undefined && !perfilCargaValido(input.perfilCarga))
    return stop('entrada_invalida', 'Revisar edad, peso y estatura del perfil.');
  if (input.filtroSuperado !== true)
    return stop('filtro_no_superado', 'No iniciar sesión; el generador no interpreta diagnósticos.');

  // 1. Elegir plantilla. P comparte estructura; I concreta el orden según equipo.
  const key = nivel === 'P' ? `P${duracion}` : `I${duracion}_${equipo}`;
  const order = TEMPLATE_ORDERS[key];
  if (!order) return stop('plantilla_pendiente', 'La plantilla solicitada está pendiente de configurar.');
  result.plantilla = key;
  result.versionPlantilla = key === 'P20' ? '0.4' : '0.1';
  const profile = PRIORITIES[`${nivel}_${equipo}`];
  const requirements = (item: SelectionMetadata): string[] => FLOOR.has(item.posicion)
    ? [...item.tags, 'acceso_suelo', 'de_pie'] : item.tags;
  // Las secuencias actuales parten/terminan de pie. Acceso al suelo y sus dos
  // extremos se filtran; la mecánica y apoyos exactos de las transiciones son pendientes.
  const compatible = (item: SelectionMetadata | undefined): boolean => !!item &&
    !exclusions.ids.includes(item.id) && !exclusions.familias.includes(item.familia) &&
    !requirements(item).some(tag => exclusions.tags.includes(tag)) &&
    (modo === 'borrador' || item.habilitado === true);

  // 2 y 3. Filtrar por cupo y seleccionar; la IA participa en los pilotos de puente y dead bug.
  const used = new Set<string>();
  for (const family of order) {
    const override = overrides[family];
    const candidateIds = override ? [override.id] : profile[family];
    const candidates = candidateIds.map(id => catalog[id]).filter(item => compatible(item) &&
      item.familia === family && item.funcion === FAMILIES[family] && !used.has(item.familia) &&
      (nivel === 'I' || item.nivelMinimo === 'P') &&
      (equipo === 'M1' || item.equipo === 'PC') && item.dosis?.[nivel]);
    let selected = candidates[0];
    if (!selected) {
      result.omitidos.push(family);
      result.mensajes.push(`Esta sesión tendrá menos ejercicios: no hay alternativa compatible para ${family}.`);
      continue;
    }
    let selection: DecisionMetadata;
    if (override) {
      selection = copyDecision(override.seleccion);
    } else if (candidates.length === 1) {
      selection = { origen: 'opcion_unica', motivo: 'Es la única variante compatible para este cupo.',
        candidatos: [selected.id] };
    } else if (family === 'puente') {
      const decision = selectBridge(input, candidates, allowModel);
      selected = decision.selected;
      selection = decision.selection;
    } else if (family === 'dead_bug') {
      const decision = selectDeadBug(input, candidates, allowModel, nivel);
      selected = decision.selected;
      selection = decision.selection;
    } else {
      selection = { origen: 'regla', motivo: 'Se aplica el orden de prioridad entre las variantes compatibles.',
        candidatos: candidates.map(item => item.id) };
    }
    used.add(selected.familia);
    // Ficha → ajuste elegido (IA o ninguno) → tope por edad y peso. Cada paso solo puede bajar la dosis.
    const fichaDose = templateDose(key, selected, nivel);
    const tope = topeCarga(input.perfilCarga, nivel, selected);
    const d = applyAdjustment(fichaDose, withProfileLimit(fichaDose, selection.ajusteDosis, tope));
    const ajustePerfil = describeProfileLimit(applyAdjustment(fichaDose, selection.ajusteDosis), d, tope);
    result.principal.push({ id: selected.id, nombre: selected.nombre, familia: selected.familia,
      funcion: selected.funcion, equipo: selected.equipo, posicion: selected.posicion,
      lateralidad: selected.lateralidad, tags: requirements(selected),
      versionFicha: selected.versionFicha, dosis: d, conteo: totals(selected, d), seleccion: selection,
      ...(ajustePerfil ? { ajustePerfil } : {}) });
  }
  if (input.perfilCarga) {
    const reglas = new Set(result.principal.flatMap(item => topeCarga(input.perfilCarga, nivel, item)?.reglas ?? []));
    result.cargaPerfil = { version: VERSION_CARGA, reglas: ORDEN_REGLAS.filter(id => reglas.has(id)) };
  }
  if (!result.principal.length)
    return stop('sin_principal', modo === 'app'
      ? 'No hay ejercicios principales compatibles y habilitados para la app.'
      : 'No queda ningún principal compatible; no generar una sesión solo con auxiliares.');

  // 4. Montar guías, ensayos propios de cada plantilla y auxiliares compatibles.
  const legacy = nivel === 'P' && duracion !== 20;
  const guidesShown = new Set<string>();
  const append = (block: ActivityBlock): void => {
    const previous = result.secuencia.filter(x => x.tipo !== 'transicion').at(-1);
    const from = previous?.posicion ?? 'de_pie';
    if (from !== block.posicion) {
      const floorChange = FLOOR.has(from) || FLOOR.has(block.posicion);
      result.secuencia.push({ tipo: 'transicion', desde: from, hacia: block.posicion,
        tags: [from, block.posicion, ...(floorChange ? ['acceso_suelo'] : [])],
        segundosEstimados: FLOOR.has(from) && FLOOR.has(block.posicion) &&
          previous?.fase !== 'principal' && block.fase !== 'principal' ? 20 : 30 });
    } else if (previous?.tipo === 'principal' && block.tipo === 'principal') {
      result.secuencia.push({ tipo: 'transicion', desde: from, hacia: from,
        tags: [from, ...(FLOOR.has(from) ? ['acceso_suelo'] : [])], segundosEstimados: 30 });
    }
    result.secuencia.push(block);
  };
  const addAux = (id: string, phase: 'preparacion' | 'cierre', seconds: number): void => {
    const aux = AUX[id];
    if (!compatible(aux)) { result.auxiliaresOmitidos.push(id); return; }
    append({ tipo: 'auxiliar', fase: phase, id, familia: aux.familia,
      posicion: aux.posicion, tags: requirements(aux), segundosEstimados: seconds,
      ...(id === 'C02' || id === 'C03'
        ? { dosis: { unidad: 'segundos', cantidadPorLado: 20, lados: 2, sostenesPorLado: 1 } } : {}) });
  };
  addAux('P01', 'preparacion', 180);
  if (legacy) addAux('P02', 'preparacion', 60);
  for (const item of result.principal) {
    const trial = item.id === 'K01' || (key === 'P20' && item.id === 'K06');
    if (trial) {
      const pause = item.id === 'K06' ? 30 : 0;
      append({ tipo: 'ensayo', fase: 'preparacion', id: item.id, familia: item.familia,
        posicion: item.posicion, tags: [...item.tags], repeticiones: 4,
        guiaSegundosEstimados: 30, pausaSegundos: pause,
        segundosEstimados: 30 + 16 + pause + (item.id === 'K01' ? 14 : 0) });
      guidesShown.add(item.id);
    }
    const movement = item.conteo.totalSostenerSegundos ??
      (item.conteo.totalRepeticiones ?? 0) * (item.lateralidad === 'alternado' ? 5 : 4);
    const guide = guidesShown.has(item.id) ? 0 : 30;
    append({ ...item, tipo: 'principal', fase: 'principal', guiaSegundosEstimados: guide,
      segundosEstimados: movement + item.conteo.totalDescansoSegundos + guide +
        (item.id === 'K14' ? item.conteo.totalSostenes * 10 : 0) });
    guidesShown.add(item.id);
  }
  addAux('C01', 'cierre', legacy ? 300 : 120);
  if (!legacy) for (const id of ['C02', 'C03']) if (optional.includes(id)) addAux(id, 'cierre', 90);
  const last = result.secuencia.filter(x => x.tipo !== 'transicion').at(-1);
  if (last && FLOOR.has(last.posicion)) result.secuencia.push({ tipo: 'transicion', desde: last.posicion,
    hacia: 'de_pie', tags: [last.posicion, 'de_pie', 'acceso_suelo'], segundosEstimados: 30 });

  const loaded = result.principal.some(x => x.equipo === 'M1');
  const estimatedSeconds = result.secuencia.reduce((sum, block) => sum + block.segundosEstimados, 0);
  result.duracion = { objetivoMinutos: duracion,
    minutosAproximados: loaded ? null : Math.round(estimatedSeconds / 60),
    estado: loaded ? 'pendiente_manejo_y_preparacion' : 'estimacion_de_escritorio',
    parcialSegundosParaCalculo: estimatedSeconds };
  if (loaded) result.mensajes.push('Estimación completa pendiente de preparación y manejo de carga.');
  result.estado = modo === 'borrador' ? 'borrador' : 'configuracion_app';
  // Mantener false: faltan medios visuales, revisión y transiciones exactas.
  return result;
}

/** Reglas de compatibilidad y montaje, con selectores K06/K08 y K11/K12 en sus contextos piloto. */
export function generateRoutine(input: GeneratorInput,
  catalog: Record<string, CatalogExercise> = CATALOG): RoutineResult {
  return buildRoutine(input, catalog);
}

function sameValues(left: string[] | undefined, right: string[] | undefined,
  defaults: string[] = []): boolean {
  const normalize = (values: string[] | undefined) => [...new Set(values ?? defaults)].sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

// Comparación por valor, independiente del orden de las propiedades JSON.
function samePilotRequest(left: unknown, right: unknown): boolean {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]));
    }
    return value;
  };
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function sameConfiguration(input: GeneratorInput, saved: GeneratorInput): boolean {
  return input.nivel === saved.nivel && input.equipo === saved.equipo &&
    input.duracion === saved.duracion && input.filtroSuperado === saved.filtroSuperado &&
    (input.modo ?? 'app') === (saved.modo ?? 'app') &&
    sameValues(input.excluir?.ids, saved.excluir?.ids) &&
    sameValues(input.excluir?.familias, saved.excluir?.familias) &&
    sameValues(input.excluir?.tags, saved.excluir?.tags) &&
    sameValues(input.cierreOpcional, saved.cierreOpcional, ['C02', 'C03']) &&
    samePilotRequest(input.puenteIA, saved.puenteIA) &&
    samePilotRequest(input.deadBugIA, saved.deadBugIA) &&
    samePilotRequest(input.perfilCarga, saved.perfilCarga);
}

function candidateAllowed(input: GeneratorInput, family: string, id: string): boolean {
  const item = CATALOG[id];
  const profile = PRIORITIES[`${input.nivel}_${input.equipo}`];
  if (!item || !profile?.[family]?.includes(id)) return false;
  const exclusions = { ids: [], familias: [], tags: [], ...input.excluir };
  const tags = FLOOR.has(item.posicion) ? [...item.tags, 'acceso_suelo', 'de_pie'] : item.tags;
  return item.familia === family && item.funcion === FAMILIES[family] &&
    (input.nivel === 'I' || item.nivelMinimo === 'P') &&
    (input.equipo === 'M1' || item.equipo === 'PC') && !!item.dosis[input.nivel] &&
    ((input.modo ?? 'app') === 'borrador' || item.habilitado) &&
    !exclusions.ids.includes(id) && !exclusions.familias.includes(family) &&
    !tags.some(tag => exclusions.tags.includes(tag));
}

/** La familia identifica un cupo único; no se modifica la exclusión global de un ID. */
function validateReplacementContext(input: GeneratorInput, routine: RoutineResult, slotId: string): void {
  const base = buildRoutine(input, CATALOG, {}, false);
  if (!sameConfiguration(input, routine.entrada) || routine.version !== VERSION ||
    base.plantilla !== routine.plantilla || base.versionPlantilla !== routine.versionPlantilla ||
    !['borrador', 'configuracion_app'].includes(base.estado) ||
    !['borrador', 'configuracion_app'].includes(routine.estado)) {
    throw new Error('La configuración cambió. Genera otra rutina antes de sustituir.');
  }
  const families = routine.principal.map(item => item.familia);
  if (JSON.stringify(families) !== JSON.stringify(base.principal.map(item => item.familia)) ||
    new Set(families).size !== families.length ||
    routine.principal.some(item => !candidateAllowed(input, item.familia, item.id))) {
    throw new Error('La rutina contiene una selección incompatible. Genera otra rutina.');
  }
  if (!routine.principal.some(item => item.familia === slotId)) {
    throw new Error('No existe ese cupo principal en esta rutina.');
  }
}

function selectedOverrides(routine: RoutineResult): Record<string, SelectionOverride> {
  return Object.fromEntries(routine.principal.map(item => [item.familia,
    { id: item.id, seleccion: copyDecision(item.seleccion) }]));
}

function manualOverride(input: GeneratorInput, family: string, id: string): SelectionOverride {
  return { id, seleccion: { origen: 'manual',
    motivo: 'Variante elegida manualmente entre las opciones compatibles.',
    candidatos: PRIORITIES[`${input.nivel}_${input.equipo}`][family]
      .filter(candidateId => candidateAllowed(input, family, candidateId)),
  } };
}

/** Opciones de la misma familia, compatibles y en el orden de prioridad existente. */
export function getCompatibleAlternatives(input: GeneratorInput, routine: RoutineResult,
  slotId: string): PrincipalExercise[] {
  validateReplacementContext(input, routine, slotId);
  const current = routine.principal.find(item => item.familia === slotId)!;
  const overrides = selectedOverrides(routine);
  return PRIORITIES[`${input.nivel}_${input.equipo}`][slotId]
    .filter(id => id !== current.id && candidateAllowed(input, slotId, id))
    .map(id => buildRoutine(input, CATALOG, { ...overrides, [slotId]: manualOverride(input, slotId, id) }, false)
      .principal.find(item => item.familia === slotId)!);
}

/** Conserva los otros cupos y vuelve a montar dosis, ensayos, cierre y estimación. */
export function replaceExercise(input: GeneratorInput, routine: RoutineResult,
  slotId: string, newId: string): RoutineResult {
  validateReplacementContext(input, routine, slotId);
  if (!candidateAllowed(input, slotId, newId)) {
    throw new Error('Esa variante no es compatible con este cupo y esta configuración.');
  }
  return buildRoutine(input, CATALOG,
    { ...selectedOverrides(routine), [slotId]: manualOverride(input, slotId, newId) }, false);
}

// ---------------------------------------------------------------------------
// Generación por IA (LLM). El motor define qué es compatible; la IA elige dentro
// de eso y el motor vuelve a validar y monta la rutina.

export interface CandidatoCupo {
  id: string;
  nombre: string;
  nivelMinimo: Level;
  lateralidad: Laterality;
  equipo: Equipment;
  dosisFicha: Dose;
  /** Tope por edad y peso para esta variante (null si no hay). */
  tope: TopeCarga | null;
}
export interface CupoPlanificado { familia: string; candidatos: CandidatoCupo[] }
export type PlanCupos =
  | { estado: 'ok'; plantilla: string; cupos: CupoPlanificado[]; respaldo: RoutineResult }
  | { estado: 'no_generable'; respaldo: RoutineResult };

/** Cupos de la plantilla y variantes compatibles con la configuración, según las reglas vigentes. */
export function planCupos(input: GeneratorInput): PlanCupos {
  const respaldo = buildRoutine(input);
  if (!['borrador', 'configuracion_app'].includes(respaldo.estado) || !respaldo.plantilla) {
    return { estado: 'no_generable', respaldo };
  }
  const key = respaldo.plantilla;
  const profile = PRIORITIES[`${input.nivel}_${input.equipo}`];
  const cupos = respaldo.principal.map(item => ({
    familia: item.familia,
    candidatos: profile[item.familia]
      .filter(id => candidateAllowed(input, item.familia, id))
      .map(id => {
        const ex = CATALOG[id];
        return { id, nombre: ex.nombre, nivelMinimo: ex.nivelMinimo, lateralidad: ex.lateralidad,
          equipo: ex.equipo, dosisFicha: templateDose(key, ex, input.nivel),
          tope: topeCarga(input.perfilCarga, input.nivel, ex) };
      }),
  }));
  return { estado: 'ok', plantilla: key, cupos, respaldo };
}

export interface EleccionIA { familia: string; id: string; ajuste: AjusteDosis; motivo: string }

/**
 * Monta la rutina con las elecciones de la IA. Lanza un error si alguna elección no es
 * válida: el llamador debe usar entonces la rutina por reglas (`planCupos(...).respaldo`).
 */
export function generateRoutineFromAI(input: GeneratorInput, elecciones: EleccionIA[],
  modeloId: string): RoutineResult {
  const plan = planCupos(input);
  if (plan.estado !== 'ok') throw new Error('La configuración no permite generar una rutina.');
  const familias = plan.cupos.map(c => c.familia);
  if (elecciones.length !== familias.length ||
      JSON.stringify([...elecciones.map(e => e.familia)].sort()) !== JSON.stringify([...familias].sort())) {
    throw new Error('La IA no entregó exactamente un ejercicio por cupo.');
  }
  const overrides: Record<string, SelectionOverride> = {};
  for (const eleccion of elecciones) {
    const cupo = plan.cupos.find(c => c.familia === eleccion.familia)!;
    const candidato = cupo.candidatos.find(c => c.id === eleccion.id);
    if (!candidato || !candidateAllowed(input, eleccion.familia, eleccion.id)) {
      throw new Error(`La IA eligió ${eleccion.id}, que no es compatible con el cupo ${eleccion.familia}.`);
    }
    const { series, intensidad, descanso } = eleccion.ajuste ?? {};
    if (!Number.isInteger(series) || series < 1 || series > candidato.dosisFicha.series ||
        !(['completa', 'reducida', 'minima'] as unknown[]).includes(intensidad) ||
        !(['estandar', 'ampliado'] as unknown[]).includes(descanso)) {
      throw new Error(`Ajuste de dosis no válido para ${eleccion.id}.`);
    }
    if (typeof eleccion.motivo !== 'string' || !eleccion.motivo.trim()) {
      throw new Error(`Falta el motivo de la IA para ${eleccion.id}.`);
    }
    overrides[eleccion.familia] = { id: eleccion.id, seleccion: {
      origen: 'ia', motivo: eleccion.motivo.trim().slice(0, 400),
      candidatos: cupo.candidatos.map(c => c.id), modeloId,
      ajusteDosis: { series, intensidad, descanso },
    } };
  }
  const result = buildRoutine(input, CATALOG, overrides, false);
  if (result.principal.length !== familias.length) {
    throw new Error('La rutina de la IA no se pudo montar completa.');
  }
  return result;
}
