import arbolCongelado from './arbol-k06-k08.json';

export type EntradasPuente = {
  experiencia_k08: 'nunca' | 'alguna_vez' | 'habitual' | 'desconocida';
  recencia_k08:
    | 'menos_3_meses'
    | 'entre_3_y_12_meses'
    | 'mas_12_meses'
    | 'desconocida'
    | 'no_aplica';
  fin_ultima_k08:
    | 'con_margen'
    | 'justo'
    | 'paro_antes_por_esfuerzo'
    | 'desconocido'
    | 'no_aplica';
};

export type SolicitudPuente = {
  entradas: EntradasPuente;
  dosisPrevia: 'coincide' | 'otra_o_desconocida' | 'no_aplica';
};

export interface PasoArbol {
  nodo: number;
  columna: string;
  valor: number;
  umbral: number;
  rama: 'izquierda' | 'derecha';
}

export interface PrediccionPuente {
  id: 'K06' | 'K08';
  modeloId: string;
  modeloSha256: string;
  recorrido: PasoArbol[];
  explicacion: string;
}

const MODELO_ID = 'k06-k08-arbol-0.1';
// Huella del archivo original, comprobada al empaquetar esta integración.
const MODELO_SHA256 =
  '35daa4fb80e679ccde6b37e518e942f962445f18b2addb84a89651b0ea8276b5';
const CAMPOS: (keyof EntradasPuente)[] = [
  'experiencia_k08',
  'recencia_k08',
  'fin_ultima_k08',
];
const CATEGORIAS: readonly (readonly string[])[] = [
  ['nunca', 'alguna_vez', 'habitual', 'desconocida'],
  ['menos_3_meses', 'entre_3_y_12_meses', 'mas_12_meses', 'desconocida', 'no_aplica'],
  ['con_margen', 'justo', 'paro_antes_por_esfuerzo', 'desconocido', 'no_aplica'],
];

type Hoja = { clase: 'K06' | 'K08'; filas_entrenamiento: number };
type Rama = { variable: number; umbral: number; izquierda: number; derecha: number };
type Modelo = { columnas: string[]; nodos: (Hoja | Rama)[] };

function exigir(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function esObjeto(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mismasClaves(value: Record<string, unknown>, claves: readonly string[]): boolean {
  const recibidas = Object.keys(value);
  return recibidas.length === claves.length && claves.every((clave) =>
    Object.prototype.hasOwnProperty.call(value, clave));
}

function mismaLista(value: unknown, esperada: readonly string[]): boolean {
  return Array.isArray(value) && value.length === esperada.length &&
    value.every((item, indice) => item === esperada[indice]);
}

export function validarEntradasPuente(value: unknown): asserts value is EntradasPuente {
  exigir(esObjeto(value) && mismasClaves(value, CAMPOS),
    'Se necesitan exactamente las tres respuestas del piloto K06/K08.');
  CAMPOS.forEach((campo, indice) => {
    const respuesta = value[campo];
    exigir(typeof respuesta === 'string' && CATEGORIAS[indice].includes(respuesta),
      `Respuesta no reconocida en ${campo}.`);
  });
  const nunca = value.experiencia_k08 === 'nunca';
  exigir(
    nunca
      ? value.recencia_k08 === 'no_aplica' && value.fin_ultima_k08 === 'no_aplica'
      : value.recencia_k08 !== 'no_aplica' && value.fin_ultima_k08 !== 'no_aplica',
    'No aplica corresponde únicamente a quien nunca hizo K08, en recencia y final.');
}

function leerModelo(): Modelo {
  const fuente: unknown = arbolCongelado;
  exigir(esObjeto(fuente), 'El modelo debe ser un objeto.');
  exigir(fuente.formato === 'kinetia_arbol_categorico_0.1', 'Formato de modelo no reconocido.');
  exigir(mismaLista(fuente.campos, CAMPOS), 'Orden de entradas del modelo no reconocido.');
  const categorias = fuente.categorias;
  exigir(Array.isArray(categorias) && categorias.length === CATEGORIAS.length &&
    categorias.every((grupo, indice) => mismaLista(grupo, CATEGORIAS[indice])),
    'Las categorías del modelo no corresponden al piloto.');
  const columnas = CAMPOS.flatMap((campo, indice) =>
    CATEGORIAS[indice].map((categoria) => `${campo}_${categoria}`));
  exigir(mismaLista(fuente.columnas_codificadas, columnas), 'Columnas codificadas incoherentes.');
  exigir(mismaLista(fuente.clases, ['K06', 'K08']), 'Clases del modelo no reconocidas.');
  exigir(fuente.profundidad_aprendida === 2, 'Profundidad del modelo no reconocida.');
  const recibidos = fuente.nodos;
  exigir(Array.isArray(recibidos) && recibidos.length > 0 && recibidos.length <= 7,
    'Cantidad de nodos incompatible con el árbol del piloto.');

  const nodos: (Hoja | Rama)[] = recibidos.map((value: unknown) => {
    exigir(esObjeto(value), 'Nodo del árbol no válido.');
    if ('clase' in value) {
      exigir(mismasClaves(value, ['clase', 'filas_entrenamiento']) &&
        (value.clase === 'K06' || value.clase === 'K08') &&
        typeof value.filas_entrenamiento === 'number' &&
        Number.isInteger(value.filas_entrenamiento) && value.filas_entrenamiento > 0,
        'Hoja del árbol no válida.');
      return { clase: value.clase, filas_entrenamiento: value.filas_entrenamiento };
    }
    exigir(mismasClaves(value, ['variable', 'umbral', 'izquierda', 'derecha']),
      'Rama del árbol incompleta.');
    const { variable, umbral, izquierda, derecha } = value;
    exigir(typeof variable === 'number' && Number.isInteger(variable) &&
      variable >= 0 && variable < columnas.length, 'Índice de variable no válido.');
    exigir(typeof umbral === 'number' && Number.isFinite(umbral), 'Umbral no válido.');
    exigir(typeof izquierda === 'number' && Number.isInteger(izquierda) &&
      izquierda >= 0 && izquierda < recibidos.length, 'Hijo izquierdo no válido.');
    exigir(typeof derecha === 'number' && Number.isInteger(derecha) &&
      derecha >= 0 && derecha < recibidos.length && derecha !== izquierda,
      'Hijo derecho no válido.');
    return { variable, umbral, izquierda, derecha };
  });

  const visitados = new Set<number>();
  const pendientes = [{ indice: 0, profundidad: 0 }];
  let profundidadMaxima = 0;
  while (pendientes.length > 0) {
    const actual = pendientes.pop()!;
    exigir(!visitados.has(actual.indice), 'El árbol contiene un ciclo o un nodo repetido.');
    exigir(actual.profundidad <= 2, 'El árbol supera la profundidad prevista.');
    visitados.add(actual.indice);
    profundidadMaxima = Math.max(profundidadMaxima, actual.profundidad);
    const nodo = nodos[actual.indice];
    if (!('clase' in nodo)) {
      pendientes.push({ indice: nodo.izquierda, profundidad: actual.profundidad + 1 });
      pendientes.push({ indice: nodo.derecha, profundidad: actual.profundidad + 1 });
    }
  }
  exigir(visitados.size === nodos.length && profundidadMaxima === fuente.profundidad_aprendida,
    'La estructura del árbol no coincide con sus metadatos.');
  return { columnas, nodos };
}

function explicar(id: 'K06' | 'K08', recorrido: PasoArbol[], entradas: EntradasPuente): string {
  const afirmado = (columna: string) => recorrido.some((paso) =>
    paso.columna === columna && paso.valor === 1 && paso.rama === 'derecha');
  if (id === 'K06' && afirmado('fin_ultima_k08_paro_antes_por_esfuerzo')) {
    return 'El árbol eligió K06 porque indicaste que no completaste la dosis previa de K08 por cansancio.';
  }
  if (id === 'K06' && afirmado('experiencia_k08_nunca')) {
    return 'El árbol eligió K06 porque indicaste que nunca hiciste esta variante de K08.';
  }
  if (id === 'K08') {
    const hayDesconocidos = entradas.experiencia_k08 === 'desconocida' ||
      entradas.recencia_k08 === 'desconocida' || entradas.fin_ultima_k08 === 'desconocido';
    return 'El árbol eligió K08 con las respuestas disponibles: en su recorrido no apareció una respuesta «nunca» ni «paró antes por esfuerzo».' +
      (hayDesconocidos ? ' Las respuestas desconocidas se mantuvieron como desconocidas.' : '');
  }
  throw new Error('No se pudo explicar el recorrido del modelo congelado.');
}

/** Inferencia local. El generador debe comprobar antes contexto, dosis y candidatos. */
export function predecirPuente(entradas: unknown): PrediccionPuente {
  validarEntradasPuente(entradas);
  // La validación ocurre al pedir inferencia: un error puede activar el respaldo del generador.
  const modelo = leerModelo();
  const vector = CAMPOS.flatMap((campo, indice) =>
    CATEGORIAS[indice].map((categoria) => Number(entradas[campo] === categoria)));
  const recorrido: PasoArbol[] = [];
  let indice = 0;
  for (let paso = 0; paso < modelo.nodos.length; paso += 1) {
    const nodo = modelo.nodos[indice];
    if ('clase' in nodo) {
      return {
        id: nodo.clase,
        modeloId: MODELO_ID,
        modeloSha256: MODELO_SHA256,
        recorrido,
        explicacion: explicar(nodo.clase, recorrido, entradas),
      };
    }
    const valor = vector[nodo.variable];
    const rama = valor <= nodo.umbral ? 'izquierda' : 'derecha';
    recorrido.push({ nodo: indice, columna: modelo.columnas[nodo.variable], valor, umbral: nodo.umbral, rama });
    indice = nodo[rama];
  }
  throw new Error('El árbol no terminó en una hoja válida.');
}
