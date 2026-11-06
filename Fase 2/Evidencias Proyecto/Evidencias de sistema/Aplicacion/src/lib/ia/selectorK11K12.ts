/**
 * Inferencia local del árbol entrenado K11/K12 v0.4.
 * Lee los nodos exportados por Python; no vuelve a entrenar ni monta la sesión.
 * `no_aplica` NO autoriza una rutina: el motor conserva sus filtros y bloqueos.
 */
import modeloExportado from './modelo_k11_k12_v0_4.json';

export type EjercicioK11K12 = 'K11' | 'K12';

export interface EntradasK11K12 {
  experiencia_k12: 'nunca' | 'practico' | 'desconocida';
  control_k12: 'controlado' | 'dificultad_control' | 'desconocido' | 'no_aplica';
  historia_core:
    | 'habitual_actual'
    | 'sin_practica_habitual'
    | 'interrumpida_mas_de_12_meses'
    | 'desconocida';
  antiguedad_k12: 'un_mes' | 'mas_de_12_meses' | 'desconocida' | 'no_aplica';
}

/** Contrato admitido, no valores predeterminados para sustituir contexto real. */
export interface ContextoK11K12 {
  familia: 'dead_bug';
  cupo: 'control_anterior';
  nivel: 'I';
  equipo: 'PC';
  duracion_referencial_min: 20;
  filtro_superado: true;
  exclusiones: readonly [];
  candidatos_compatibles: readonly ['K11', 'K12'];
  fichas_version: '0.1';
  modo: 'experimento_borrador';
  dosis: {
    K11: { series: 2; repeticiones_por_lado: 6; descanso_series_s: 60 };
    K12: { series: 2; repeticiones_por_lado: 5; descanso_series_s: 60 };
  };
}

export interface PasoK11K12 {
  nodo: number;
  variable: string;
  valor: 0 | 1;
  umbral: number;
  rama: 'izquierda' | 'derecha';
}

export type ResultadoK11K12 =
  | {
      estado: 'seleccion_ia';
      ejercicioId: EjercicioK11K12;
      modeloId: 'K11_K12_v0.4';
      traza: { hoja: number; profundidad: number; ruta: PasoK11K12[] };
    }
  | {
      estado: 'no_aplica';
      motivo: 'contexto_fuera_de_alcance' | 'entradas_invalidas' | 'modelo_invalido';
    };

const CAMPOS: readonly (keyof EntradasK11K12)[] = [
  'experiencia_k12', 'control_k12', 'historia_core', 'antiguedad_k12',
];
const CATEGORIAS: readonly (readonly string[])[] = [
  ['nunca', 'practico', 'desconocida'],
  ['controlado', 'dificultad_control', 'desconocido', 'no_aplica'],
  ['habitual_actual', 'sin_practica_habitual', 'interrumpida_mas_de_12_meses', 'desconocida'],
  ['un_mes', 'mas_de_12_meses', 'desconocida', 'no_aplica'],
];
const CONTEXTO_ADMITIDO: ContextoK11K12 = {
  familia: 'dead_bug', cupo: 'control_anterior', nivel: 'I', equipo: 'PC',
  duracion_referencial_min: 20, filtro_superado: true, exclusiones: [],
  candidatos_compatibles: ['K11', 'K12'], fichas_version: '0.1',
  modo: 'experimento_borrador',
  dosis: {
    K11: { series: 2, repeticiones_por_lado: 6, descanso_series_s: 60 },
    K12: { series: 2, repeticiones_por_lado: 5, descanso_series_s: 60 },
  },
};

type Registro = Record<string, unknown>;
type NodoHoja = Readonly<{ clase: EjercicioK11K12 }>;
type NodoRama = Readonly<{ variable: number; umbral: number; izquierda: number; derecha: number }>;
type Nodo = NodoHoja | NodoRama;
interface ModeloInterno {
  readonly nodos: readonly Nodo[];
  readonly columnas: readonly string[];
}

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function mismasClaves(objeto: Registro, claves: readonly string[]): boolean {
  const propias = Object.keys(objeto);
  return propias.length === claves.length && claves.every(clave =>
    Object.prototype.hasOwnProperty.call(objeto, clave));
}

/** Igualdad estructural: orden de objetos irrelevante; orden de listas estricto. */
function igual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!igual(a[i], b[i])) return false;
    }
    return true;
  }
  if (esRegistro(a) && esRegistro(b)) {
    return mismasClaves(a, Object.keys(b)) && Object.keys(b).every(clave => igual(a[clave], b[clave]));
  }
  return false;
}

function entradasValidas(valor: unknown): valor is EntradasK11K12 {
  if (!esRegistro(valor) || !mismasClaves(valor, CAMPOS)) return false;
  if (!CAMPOS.every((campo, i) => typeof valor[campo] === 'string'
    && CATEGORIAS[i].includes(valor[campo] as string))) return false;
  const exp = valor.experiencia_k12;
  const control = valor.control_k12;
  const fecha = valor.antiguedad_k12;
  if (valor.historia_core === 'interrumpida_mas_de_12_meses' && fecha === 'un_mes') return false;
  if (exp === 'nunca') return control === 'no_aplica' && fecha === 'no_aplica';
  if (exp === 'desconocida') return control === 'desconocido' && fecha === 'desconocida';
  return control !== 'no_aplica' && fecha !== 'no_aplica';
}

function entero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor);
}

/**
 * Valida todo el árbol y copia sus datos a una estructura privada e inmutable.
 * Otra importación del JSON no puede modificar este snapshot después de cargarlo.
 * La identidad exacta de los bytes se comprueba además al empaquetar/verificar.
 */
function cargarModelo(valor: unknown): ModeloInterno | null {
  if (!esRegistro(valor) || valor.modelo_id !== 'K11_K12_v0.4'
    || valor.formato !== 'kinetia_arbol_categorico_0.1'
    || !igual(valor.contexto, CONTEXTO_ADMITIDO)
    || !igual(valor.campos, CAMPOS) || !igual(valor.categorias, CATEGORIAS)
    || !igual(valor.clases, ['K11', 'K12'])) return null;
  const columnas: string[] = [];
  CAMPOS.forEach((campo, i) => CATEGORIAS[i].forEach(cat => columnas.push(`${campo}_${cat}`)));
  if (!igual(valor.columnas_codificadas, columnas) || !Array.isArray(valor.nodos)
    || valor.nodos.length === 0 || !entero(valor.profundidad_aprendida)
    || valor.profundidad_aprendida < 0) return null;

  const nodos: Nodo[] = [];
  for (const bruto of valor.nodos) {
    if (!esRegistro(bruto)) return null;
    if (Object.prototype.hasOwnProperty.call(bruto, 'clase')) {
      if (!mismasClaves(bruto, ['clase', 'filas_entrenamiento'])
        || (bruto.clase !== 'K11' && bruto.clase !== 'K12')
        || !entero(bruto.filas_entrenamiento) || bruto.filas_entrenamiento < 1) return null;
      nodos.push(Object.freeze({ clase: bruto.clase }));
    } else {
      if (!mismasClaves(bruto, ['variable', 'umbral', 'izquierda', 'derecha'])
        || !entero(bruto.variable) || bruto.variable < 0 || bruto.variable >= columnas.length
        || typeof bruto.umbral !== 'number' || !Number.isFinite(bruto.umbral)
        || !entero(bruto.izquierda) || !entero(bruto.derecha)
        || bruto.izquierda < 0 || bruto.izquierda >= valor.nodos.length
        || bruto.derecha < 0 || bruto.derecha >= valor.nodos.length) return null;
      nodos.push(Object.freeze({ variable: bruto.variable, umbral: bruto.umbral,
        izquierda: bruto.izquierda, derecha: bruto.derecha }));
    }
  }

  // Un árbol íntegro tiene una raíz, un único padre por nodo y ninguna rama cíclica.
  const pendientes: Array<{ indice: number; profundidad: number }> = [{ indice: 0, profundidad: 0 }];
  const visitados = new Set<number>();
  let profundidadMaxima = 0;
  while (pendientes.length > 0) {
    const actual = pendientes.pop()!;
    if (visitados.has(actual.indice)) return null;
    visitados.add(actual.indice);
    profundidadMaxima = Math.max(profundidadMaxima, actual.profundidad);
    const nodo = nodos[actual.indice];
    if (!('clase' in nodo)) {
      pendientes.push({ indice: nodo.izquierda, profundidad: actual.profundidad + 1 });
      pendientes.push({ indice: nodo.derecha, profundidad: actual.profundidad + 1 });
    }
  }
  if (visitados.size !== nodos.length || profundidadMaxima !== valor.profundidad_aprendida) return null;
  return Object.freeze({ nodos: Object.freeze(nodos), columnas: Object.freeze(columnas) });
}

const MODELO: ModeloInterno | null = cargarModelo(modeloExportado);

/**
 * Contexto y respuestas deben proceder de la app, sin completar datos inventados.
 * No transforma fechas no contempladas en `desconocida`, ni desconocida en nunca.
 * La traza es evidencia técnica de inferencia, no confianza ni explicación clínica.
 */
export function seleccionarK11K12(entradas: unknown, contexto: unknown): ResultadoK11K12 {
  try {
    if (!igual(contexto, CONTEXTO_ADMITIDO)) {
      return { estado: 'no_aplica', motivo: 'contexto_fuera_de_alcance' };
    }
  } catch {
    return { estado: 'no_aplica', motivo: 'contexto_fuera_de_alcance' };
  }
  try {
    if (!entradasValidas(entradas)) return { estado: 'no_aplica', motivo: 'entradas_invalidas' };
    if (MODELO === null) return { estado: 'no_aplica', motivo: 'modelo_invalido' };
    const vector: Array<0 | 1> = [];
    CAMPOS.forEach((campo, i) => CATEGORIAS[i].forEach(cat =>
      vector.push(entradas[campo] === cat ? 1 : 0)));
    const ruta: PasoK11K12[] = [];
    let indice = 0;
    for (let paso = 0; paso < MODELO.nodos.length; paso += 1) {
      const nodo = MODELO.nodos[indice];
      if ('clase' in nodo) {
        return { estado: 'seleccion_ia', ejercicioId: nodo.clase, modeloId: 'K11_K12_v0.4',
          traza: { hoja: indice, profundidad: ruta.length, ruta } };
      }
      const irIzquierda = vector[nodo.variable] <= nodo.umbral;
      ruta.push({ nodo: indice, variable: MODELO.columnas[nodo.variable],
        valor: vector[nodo.variable], umbral: nodo.umbral,
        rama: irIzquierda ? 'izquierda' : 'derecha' });
      indice = irIzquierda ? nodo.izquierda : nodo.derecha;
    }
    return { estado: 'no_aplica', motivo: 'modelo_invalido' };
  } catch {
    // Incluye objetos de entrada con getters que fallan; no intenta inferir datos.
    return { estado: 'no_aplica', motivo: 'entradas_invalidas' };
  }
}
