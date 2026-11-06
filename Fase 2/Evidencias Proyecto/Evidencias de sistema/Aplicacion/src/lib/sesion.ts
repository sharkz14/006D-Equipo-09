/**
 * Sesión guiada: convierte una rutina en pasos y tramos (series, lados, descansos), y define el registro
 * que se guarda al terminar y el resumen que recibe la IA para la próxima rutina.
 * Sin React ni SQLite, para poder probarlo.
 */
import type { Level, PrincipalExercise, RoutineResult, SequenceBlock } from './generador';
import { FICHAS } from './fichas';

export type Esfuerzo = 'facil' | 'adecuada' | 'dificil';
export const TEXTO_ESFUERZO: Record<Esfuerzo, string> = { facil: 'Fácil', adecuada: 'Adecuada', dificil: 'Difícil' };

/** Un tramo de trabajo con `segundos` se cronometra; sin segundos, la persona marca «Listo». */
export type Tramo =
  | { tipo: 'trabajo'; titulo: string; detalle: string; segundos: number | null; finDeSerie: number | null }
  | { tipo: 'descanso'; titulo: string; segundos: number };

export interface PasoSesion {
  clave: string;
  fase: 'preparacion' | 'principal' | 'cierre';
  id: string;
  nombre: string;
  /** «Calentamiento», «Prueba suave», «Ejercicio 2 de 5» o «Cierre». */
  etiqueta: string;
  dosis: string | null;
  /** Indicación de cambio de posición antes de empezar el paso. */
  cambioPosicion: string | null;
  pasos: string[];
  puntos: string[];
  errores: string[];
  /** Instrucciones escritas por Kinetia (sin ficha) o ausentes. */
  origenInstrucciones: 'ficha' | 'kinetia' | 'pendiente';
  tramos: Tramo[];
  /** Solo en principales: para registrar las series hechas. */
  seriesPlan: number | null;
}

const LUGAR: Record<string, string> = {
  de_pie: 'de pie',
  boca_arriba: 'boca arriba en el suelo',
  cuadrupedia: 'en cuadrupedia, con manos y rodillas en el suelo',
  lateral: 'de lado en el suelo',
};

/** Calentamiento y vuelta a la calma no tienen ficha: texto propio de Kinetia, pendiente de revisión. */
const AUXILIARES: Record<string, { nombre: string; pasos: string[] }> = {
  P01: { nombre: 'Marcha', pasos: ['Marcha en el lugar a un ritmo cómodo.', 'Mueve los brazos de forma natural y respira con normalidad.'] },
  P02: { nombre: 'Marcha y giros de hombros', pasos: ['Sigue marchando a un ritmo cómodo.', 'Haz giros suaves de hombros hacia atrás y hacia delante.'] },
  C01: { nombre: 'Caminata suave', pasos: ['Camina a ritmo suave, en el lugar o por el espacio.', 'Deja que la respiración vuelva a la normalidad.'] },
  C02: { nombre: 'Estiramiento de glúteo', pasos: [] },
  C03: { nombre: 'Estiramiento de cuádriceps', pasos: [] },
};

function textoDosis(e: PrincipalExercise): string {
  const { series, cantidad, unidad } = e.dosis;
  const medida = unidad === 'segundos' ? 'segundos de sostén' : 'repeticiones';
  return `${series} ${series === 1 ? 'serie' : 'series'} · ${cantidad} ${medida}${e.lateralidad === 'bilateral' ? '' : ' por lado'}`;
}

export function tramosEjercicio(e: PrincipalExercise): Tramo[] {
  const { series, cantidad, unidad, descansoEntreSeries, descansoEntreLados } = e.dosis;
  const cronometrado = unidad === 'segundos';
  const trabajo = (titulo: string, detalle: string, finDeSerie: number | null): Tramo =>
    ({ tipo: 'trabajo', titulo, detalle, segundos: cronometrado ? cantidad : null, finDeSerie });
  const tramos: Tramo[] = [];
  for (let s = 1; s <= series; s += 1) {
    const serie = `Serie ${s} de ${series}`;
    if (e.lateralidad === 'por_lado' || e.lateralidad === 'sosten_por_lado') {
      const detalle = cronometrado ? `Sostén ${cantidad} s` : `${cantidad} repeticiones`;
      tramos.push(trabajo(`${serie} · primer lado`, detalle, null));
      if (descansoEntreLados > 0) tramos.push({ tipo: 'descanso', titulo: 'Cambia de lado', segundos: descansoEntreLados });
      tramos.push(trabajo(`${serie} · segundo lado`, detalle, s));
    } else if (e.lateralidad === 'alternado') {
      tramos.push(trabajo(serie, `${cantidad} por lado, alternando`, s));
    } else {
      tramos.push(trabajo(serie, cronometrado ? `Sostén ${cantidad} s` : `${cantidad} repeticiones`, s));
    }
    if (s < series) tramos.push({ tipo: 'descanso', titulo: 'Descanso', segundos: descansoEntreSeries });
  }
  return tramos;
}

function instrucciones(id: string): Pick<PasoSesion, 'pasos' | 'puntos' | 'errores' | 'origenInstrucciones'> {
  const ficha = FICHAS[id];
  if (ficha) return { pasos: ficha.pasos, puntos: ficha.puntos, errores: ficha.errores, origenInstrucciones: 'ficha' };
  const aux = AUXILIARES[id];
  if (aux?.pasos.length) return { pasos: aux.pasos, puntos: [], errores: [], origenInstrucciones: 'kinetia' };
  return { pasos: [], puntos: [], errores: [], origenInstrucciones: 'pendiente' };
}

/** Pasos de la sesión en el orden de la rutina; las transiciones se convierten en indicaciones de posición. */
export function pasosDeSesion(rutina: RoutineResult): PasoSesion[] {
  const pasos: PasoSesion[] = [];
  const total = rutina.principal.length;
  let pendiente: string | null = null;
  let posicionActual = 'de_pie';
  rutina.secuencia.forEach((bloque: SequenceBlock, i) => {
    if (bloque.tipo === 'transicion') {
      if (bloque.hacia !== posicionActual) pendiente = `Colócate ${LUGAR[bloque.hacia] ?? bloque.hacia}.`;
      return;
    }
    const cambio = pendiente ?? (bloque.posicion !== posicionActual ? `Colócate ${LUGAR[bloque.posicion] ?? bloque.posicion}.` : null);
    pendiente = null;
    posicionActual = bloque.posicion;
    const clave = `${i}-${bloque.tipo}-${bloque.id}`;
    if (bloque.tipo === 'principal') {
      const n = rutina.principal.findIndex((x) => x.id === bloque.id) + 1;
      pasos.push({ clave, fase: 'principal', id: bloque.id, nombre: bloque.nombre, etiqueta: `Ejercicio ${n} de ${total}`,
        dosis: textoDosis(bloque), cambioPosicion: cambio, ...instrucciones(bloque.id), tramos: tramosEjercicio(bloque),
        seriesPlan: bloque.dosis.series });
    } else if (bloque.tipo === 'ensayo') {
      const nombre = rutina.principal.find((x) => x.id === bloque.id)?.nombre ?? bloque.id;
      const tramos: Tramo[] = [{ tipo: 'trabajo', titulo: 'Prueba suave', detalle: `${bloque.repeticiones} repeticiones suaves`,
        segundos: null, finDeSerie: null }];
      if (bloque.pausaSegundos > 0) tramos.push({ tipo: 'descanso', titulo: 'Pausa', segundos: bloque.pausaSegundos });
      pasos.push({ clave, fase: 'preparacion', id: bloque.id, nombre, etiqueta: 'Prueba suave', dosis: `${bloque.repeticiones} repeticiones suaves`,
        cambioPosicion: cambio, ...instrucciones(bloque.id), tramos, seriesPlan: null });
    } else {
      const aux = AUXILIARES[bloque.id];
      const tramos: Tramo[] = bloque.dosis
        ? Array.from({ length: bloque.dosis.lados }, (_, lado) => ({ tipo: 'trabajo' as const,
          titulo: bloque.dosis!.lados > 1 ? (lado === 0 ? 'Primer lado' : 'Segundo lado') : 'Sostén',
          detalle: `Mantén ${bloque.dosis!.cantidadPorLado} s, con tensión suave`, segundos: bloque.dosis!.cantidadPorLado, finDeSerie: null }))
        : [{ tipo: 'trabajo', titulo: aux?.nombre ?? bloque.id, detalle: 'A ritmo cómodo', segundos: bloque.segundosEstimados, finDeSerie: null }];
      const minutos = bloque.dosis ? null : `${Math.round(bloque.segundosEstimados / 60)} min`;
      pasos.push({ clave, fase: bloque.fase, id: bloque.id, nombre: aux?.nombre ?? bloque.id,
        etiqueta: bloque.fase === 'preparacion' ? 'Calentamiento' : 'Cierre',
        dosis: bloque.dosis ? `${bloque.dosis.cantidadPorLado} s por lado` : minutos,
        cambioPosicion: cambio, ...instrucciones(bloque.id), tramos, seriesPlan: null });
    }
  });
  return pasos;
}

// ---------------------------------------------------------------------------
// Registro de la sesión

export interface EjercicioRegistrado { id: string; series: number; hechas: number }

export interface RegistroSesion {
  fecha: string;
  plantilla: string;
  nivel: Level;
  duracionMin: 20 | 30 | 40;
  origen: 'ia' | 'reglas';
  ejercicios: EjercicioRegistrado[];
  completada: boolean;
  detenidaPorDolor: boolean;
  esfuerzo: Esfuerzo | null;
  dolor: boolean;
}

/**
 * Ejercicios hechos alguna vez (al menos una serie), a partir de la columna `ejercicios` de cada sesión guardada.
 * Una fila dañada se ignora. Sirve para abrir la técnica solo la primera vez que aparece un ejercicio.
 */
export function ejerciciosHechosDe(filas: readonly string[]): string[] {
  const ids = new Set<string>();
  for (const fila of filas) {
    try {
      const lista: unknown = JSON.parse(fila);
      if (!Array.isArray(lista)) continue;
      for (const e of lista) {
        if (e && typeof e.id === 'string' && typeof e.hechas === 'number' && e.hechas > 0) ids.add(e.id);
      }
    } catch {
      // Una fila dañada no impide leer las demás.
    }
  }
  return [...ids];
}

export function crearRegistro(rutina: RoutineResult, origen: 'ia' | 'reglas', hechas: Record<string, number>,
  respuestas: { detenidaPorDolor: boolean; esfuerzo: Esfuerzo | null; dolor: boolean }, ahora = new Date()): RegistroSesion {
  const ejercicios = rutina.principal.map((x) => ({ id: x.id, series: x.dosis.series,
    hechas: Math.max(0, Math.min(x.dosis.series, Math.floor(hechas[x.id] ?? 0))) }));
  return validarRegistro({
    fecha: ahora.toISOString(), plantilla: rutina.plantilla ?? '', nivel: rutina.entrada.nivel,
    duracionMin: rutina.entrada.duracion, origen, ejercicios,
    completada: !respuestas.detenidaPorDolor && ejercicios.every((x) => x.hechas >= x.series),
    detenidaPorDolor: respuestas.detenidaPorDolor, esfuerzo: respuestas.esfuerzo,
    dolor: respuestas.dolor || respuestas.detenidaPorDolor,
  });
}

export function validarRegistro(r: unknown): RegistroSesion {
  const ok = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };
  ok(typeof r === 'object' && r !== null, 'Registro de sesión no válido.');
  const v = r as Record<string, unknown>;
  ok(typeof v.fecha === 'string' && !Number.isNaN(Date.parse(v.fecha)), 'Fecha de sesión no válida.');
  ok(typeof v.plantilla === 'string' && /^[PI]\d{2}(_(PC|M1))?$/.test(v.plantilla), 'Plantilla no válida.');
  ok(v.nivel === 'P' || v.nivel === 'I', 'Nivel no válido.');
  ok([20, 30, 40].includes(v.duracionMin as number), 'Duración no válida.');
  ok(v.origen === 'ia' || v.origen === 'reglas', 'Origen no válido.');
  ok(Array.isArray(v.ejercicios) && v.ejercicios.length >= 1 && v.ejercicios.length <= 8 &&
    v.ejercicios.every((e: unknown) => {
      const x = e as Record<string, unknown>;
      return typeof x === 'object' && x !== null && typeof x.id === 'string' && /^K\d{2}$/.test(x.id) &&
        Number.isInteger(x.series) && (x.series as number) >= 1 && (x.series as number) <= 4 &&
        Number.isInteger(x.hechas) && (x.hechas as number) >= 0 && (x.hechas as number) <= (x.series as number);
    }), 'Ejercicios de la sesión no válidos.');
  ok(typeof v.completada === 'boolean' && typeof v.detenidaPorDolor === 'boolean' && typeof v.dolor === 'boolean',
    'Estado de la sesión no válido.');
  ok(v.esfuerzo === null || ['facil', 'adecuada', 'dificil'].includes(v.esfuerzo as string), 'Esfuerzo no válido.');
  const ejercicios = (v.ejercicios as EjercicioRegistrado[]).map((e) => ({ id: e.id, series: e.series, hechas: e.hechas }));
  return { fecha: v.fecha as string, plantilla: v.plantilla as string, nivel: v.nivel as Level,
    duracionMin: v.duracionMin as 20 | 30 | 40, origen: v.origen as 'ia' | 'reglas', ejercicios,
    completada: v.completada as boolean, detenidaPorDolor: v.detenidaPorDolor as boolean,
    esfuerzo: (v.esfuerzo ?? null) as Esfuerzo | null, dolor: v.dolor as boolean };
}

/** Días de calendario (hora local) entre la sesión y ahora. */
export function diasDesde(fecha: string, ahora = new Date()): number {
  const d = new Date(fecha);
  const inicio = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.max(0, Math.round((inicio(ahora) - inicio(d)) / 86400000));
}

function cuando(fecha: string, ahora: Date): string {
  const dias = diasDesde(fecha, ahora);
  return dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : dias <= 30 ? `hace ${dias} días` : 'hace más de 30 días';
}

/** Resumen para la IA: valores breves (el servidor admite hasta 6 claves de 40 caracteres). */
export function antecedentesUltimaSesion(r: RegistroSesion, ahora = new Date()): Record<string, string> {
  const terminados = r.ejercicios.filter((e) => e.hechas >= e.series).length;
  const hechos = r.ejercicios.filter((e) => e.hechas > 0).map((e) => e.id).join(', ');
  return {
    cuando: cuando(r.fecha, ahora),
    sesion: `${r.nivel === 'P' ? 'principiante' : 'intermedio'}, ${r.duracionMin} min`,
    resultado: r.completada ? 'completa' : `incompleta (${terminados} de ${r.ejercicios.length} ejercicios)`,
    // Con las palabras de la persona; «adecuada» se aclara para que no se lea como «fácil».
    le_resulto: r.esfuerzo === 'adecuada' ? 'adecuada (ni fácil ni difícil)'
      : r.esfuerzo ? TEXTO_ESFUERZO[r.esfuerzo].toLowerCase() : 'sin respuesta',
    molestias: r.dolor ? (r.detenidaPorDolor ? 'sí, la detuvo por dolor' : 'sí') : 'no',
    ejercicios_hechos: (hechos || 'ninguno').slice(0, 40),
  };
}

/** Línea para la pantalla de inicio. */
export function textoUltimaSesion(r: RegistroSesion, ahora = new Date()): string {
  const c = cuando(r.fecha, ahora);
  const partes = [c.charAt(0).toUpperCase() + c.slice(1), r.completada ? 'completa' : 'incompleta'];
  if (r.esfuerzo) partes.push(`te resultó ${TEXTO_ESFUERZO[r.esfuerzo].toLowerCase()}`);
  return partes.join(' · ');
}

// ---------------------------------------------------------------------------
// Progresión: con dos sesiones seguidas fáciles, completas y sin molestias, la variante básica se cambia
// por la exigente. Regla del proyecto (no validada): un avance a la vez, solo después de dominar la básica.

export interface Progresion { familia: string; basica: string; exigente: string; nombre: string }

/** Pares de variantes del mismo equipo: la exigente es de nivel intermedio. */
export const PROGRESIONES: readonly Progresion[] = [
  { familia: 'puente', basica: 'K06', exigente: 'K08', nombre: 'el puente a una pierna' },
  { familia: 'dead_bug', basica: 'K11', exigente: 'K12', nombre: 'el dead bug con extensión' },
];

export const SESIONES_PARA_AVANZAR = 2;
const VIGENCIA_DIAS = 30;

function facilYCompleta(r: RegistroSesion): boolean {
  return r.esfuerzo === 'facil' && r.completada && !r.dolor && !r.detenidaPorDolor;
}

/** Sesiones seguidas, desde la más reciente, que fueron fáciles, completas y sin molestias. */
export function rachaFacil(recientes: readonly RegistroSesion[]): number {
  let n = 0;
  for (const r of recientes) {
    if (!facilYCompleta(r)) break;
    n += 1;
  }
  return n;
}

/**
 * Avances listos. `recientes` va de la más reciente a la más antigua. Exige que las últimas sesiones hayan sido
 * fáciles y completas, recientes (30 días) y que en todas se completara la variante básica.
 */
export function progresionesListas(recientes: readonly RegistroSesion[], ahora = new Date()): Progresion[] {
  const ultimas = recientes.slice(0, SESIONES_PARA_AVANZAR);
  if (ultimas.length < SESIONES_PARA_AVANZAR || rachaFacil(ultimas) < SESIONES_PARA_AVANZAR) return [];
  if (ultimas.some((r) => diasDesde(r.fecha, ahora) > VIGENCIA_DIAS)) return [];
  return PROGRESIONES.filter((p) => ultimas.every((r) =>
    r.ejercicios.some((e) => e.id === p.basica && e.hechas >= e.series)));
}

/** Antecedente breve para la IA (máximo 6 claves de 40 caracteres). */
export function antecedentesProgresion(avances: readonly Progresion[]): Record<string, string> {
  const salida: Record<string, string> = { motivo: `${SESIONES_PARA_AVANZAR} sesiones seguidas fáciles y completas` };
  for (const p of avances) salida[p.familia] = `pasa al ${p.nombre.replace(/^el /, '')}`.slice(0, 40);
  return salida;
}

/** Avances a una sesión fácil de distancia: la racha va en 1 y la última completó la variante básica. */
export function progresionesProximas(recientes: readonly RegistroSesion[], ahora = new Date()): Progresion[] {
  const ultima = recientes[0];
  if (!ultima || rachaFacil(recientes) !== SESIONES_PARA_AVANZAR - 1) return [];
  if (diasDesde(ultima.fecha, ahora) > VIGENCIA_DIAS) return [];
  return PROGRESIONES.filter((p) => ultima.ejercicios.some((e) => e.id === p.basica && e.hechas >= e.series));
}
