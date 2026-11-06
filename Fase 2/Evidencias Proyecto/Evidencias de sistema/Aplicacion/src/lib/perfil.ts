import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { validarRespuestas, type RespuestasCuestionario } from './cuestionario';
import { MIGRACIONES, VERSION_BASE } from './esquema';
import { ejerciciosHechosDe, validarRegistro, type RegistroSesion } from './sesion';

export type NivelFuerza = 'P' | 'I';

export interface DatosPerfil {
  nombre: string;
  edad: number;
  pesoKg: number;
  estaturaCm: number;
  nivel: NivelFuerza;
}

export interface Perfil extends DatosPerfil {
  id: 1;
  creadoEn: string;
  actualizadoEn: string;
}

export interface FormularioPerfil {
  nombre: string;
  edad: string;
  pesoKg: string;
  estaturaCm: string;
  nivel: NivelFuerza;
}

let basePendiente: Promise<SQLite.SQLiteDatabase> | null = null;

// Distingue los errores que podemos explicar de un fallo interno de SQLite.
class ErrorPerfil extends Error {}

function errorDeOperacion(error: unknown, mensaje: string): Error {
  return error instanceof ErrorPerfil ? error : new ErrorPerfil(mensaje);
}

function validarDatosPerfil(datos: DatosPerfil): DatosPerfil {
  if (!datos || typeof datos.nombre !== 'string') {
    throw new ErrorPerfil('Escribe tu nombre.');
  }

  const nombre = datos.nombre.trim();
  if (!nombre) throw new ErrorPerfil('Escribe tu nombre.');
  if (nombre.length > 80) {
    throw new ErrorPerfil('El nombre puede tener hasta 80 caracteres.');
  }
  if (!Number.isSafeInteger(datos.edad) || datos.edad < 18) {
    throw new ErrorPerfil('La edad debe ser un número entero de 18 años o más.');
  }
  if (!Number.isFinite(datos.pesoKg) || datos.pesoKg <= 0) {
    throw new ErrorPerfil('Escribe un peso en kg mayor que cero.');
  }
  if (!Number.isFinite(datos.estaturaCm) || datos.estaturaCm <= 0) {
    throw new ErrorPerfil('Escribe una estatura en cm mayor que cero.');
  }
  if (datos.nivel !== 'P' && datos.nivel !== 'I') {
    throw new ErrorPerfil('Selecciona Principiante o Intermedio.');
  }

  return {
    nombre,
    edad: datos.edad,
    pesoKg: datos.pesoKg,
    estaturaCm: datos.estaturaCm,
    nivel: datos.nivel,
  };
}

function leerDecimal(texto: string, campo: string): number {
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  // Acepta 62,5 y 62.5, pero rechaza entradas parciales como 62abc.
  if (!/^\d+(?:[.,]\d+)?$/.test(limpio)) {
    throw new ErrorPerfil(`Escribe ${campo} con números; puedes usar coma o punto decimal.`);
  }
  return Number(limpio.replace(',', '.'));
}

export function validarFormularioPerfil(formulario: FormularioPerfil): DatosPerfil {
  const edad = typeof formulario?.edad === 'string' ? formulario.edad.trim() : '';
  if (!/^\d+$/.test(edad)) {
    throw new ErrorPerfil('Escribe tu edad en años completos, sin decimales.');
  }

  return validarDatosPerfil({
    nombre: formulario.nombre,
    edad: Number(edad),
    pesoKg: leerDecimal(formulario.pesoKg, 'el peso en kg'),
    estaturaCm: leerDecimal(formulario.estaturaCm, 'la estatura en cm'),
    nivel: formulario.nivel,
  });
}

/**
 * Transacción exclusiva en el teléfono. En la versión web expo-sqlite no la ofrece: ahí hay una sola
 * conexión por pestaña, así que se usa una transacción normal (también revierte todo si algo falla).
 */
function enTransaccion(base: SQLite.SQLiteDatabase,
  tarea: (transaccion: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return base.withTransactionAsync(() => tarea(base));
  return base.withExclusiveTransactionAsync(tarea);
}

async function abrirBase(): Promise<SQLite.SQLiteDatabase> {
  let base: SQLite.SQLiteDatabase | null = null;
  try {
    base = await SQLite.openDatabaseAsync('kinetia.db');

    // Esquema y versión se guardan juntos: un fallo revierte la migración.
    await enTransaccion(base, async (transaccion) => {
      const fila = await transaccion.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version',
      );
      if (!fila || fila.user_version < 0) {
        throw new ErrorPerfil('No se pudo comprobar la versión de la base de datos.');
      }
      if (fila.user_version > VERSION_BASE) {
        throw new ErrorPerfil('Esta base de datos necesita una versión más reciente de Kinetia.');
      }
      // Cada versión anterior tiene su migración; el perfil existente se conserva.
      if (fila.user_version < VERSION_BASE) {
        const migracion = MIGRACIONES[fila.user_version];
        if (!migracion) throw new ErrorPerfil('No se pudo actualizar la base de datos.');
        await transaccion.execAsync(migracion);
      }
    });

    // WAL mejora la escritura en el teléfono; el almacenamiento del navegador no lo necesita.
    if (Platform.OS !== 'web') await base.execAsync('PRAGMA journal_mode = WAL;');
    return base;
  } catch (error) {
    // El fallo del cierre no reemplaza el error de apertura.
    if (base) {
      try { await base.closeAsync(); } catch { /* Cierre de mejor esfuerzo. */ }
    }
    throw errorDeOperacion(error, 'No se pudo abrir la base de datos. Intenta nuevamente.');
  }
}

function obtenerBase(): Promise<SQLite.SQLiteDatabase> {
  if (!basePendiente) {
    basePendiente = abrirBase().catch((error: unknown) => {
      basePendiente = null;
      throw error;
    });
  }
  return basePendiente;
}

function consultarPerfil(base: SQLite.SQLiteDatabase): Promise<Perfil | null> {
  return base.getFirstAsync<Perfil>(`
    SELECT id, nombre, edad, peso_kg AS pesoKg, estatura_cm AS estaturaCm,
           nivel, creado_en AS creadoEn, actualizado_en AS actualizadoEn
    FROM perfil WHERE id = ?
  `, 1);
}

export async function leerPerfil(): Promise<Perfil | null> {
  try {
    return await consultarPerfil(await obtenerBase());
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudo cargar tu perfil. Intenta nuevamente.');
  }
}

export async function crearPerfil(datos: DatosPerfil): Promise<Perfil> {
  const valido = validarDatosPerfil(datos);
  try {
    const base = await obtenerBase();
    let resultado: Perfil | null = null;
    await enTransaccion(base, async (transaccion) => {
      if (await consultarPerfil(transaccion)) {
        throw new ErrorPerfil('Ya existe un perfil. Usa Editar para modificarlo.');
      }
      const ahora = new Date().toISOString();
      await transaccion.runAsync(`
        INSERT INTO perfil
          (id, nombre, edad, peso_kg, estatura_cm, nivel, creado_en, actualizado_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, 1, valido.nombre, valido.edad, valido.pesoKg, valido.estaturaCm,
      valido.nivel, ahora, ahora);
      resultado = await consultarPerfil(transaccion);
      if (!resultado) throw new ErrorPerfil('No se pudo comprobar el perfil creado.');
    });
    if (!resultado) throw new ErrorPerfil('No se pudo comprobar el perfil creado.');
    return resultado;
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudo crear tu perfil. Intenta nuevamente.');
  }
}

export async function actualizarPerfil(datos: DatosPerfil): Promise<Perfil> {
  const valido = validarDatosPerfil(datos);
  try {
    const base = await obtenerBase();
    let resultado: Perfil | null = null;
    await enTransaccion(base, async (transaccion) => {
      const cambio = await transaccion.runAsync(`
        UPDATE perfil
        SET nombre = ?, edad = ?, peso_kg = ?, estatura_cm = ?, nivel = ?, actualizado_en = ?
        WHERE id = ?
      `, valido.nombre, valido.edad, valido.pesoKg, valido.estaturaCm,
      valido.nivel, new Date().toISOString(), 1);
      if (cambio.changes !== 1) {
        throw new ErrorPerfil('El perfil ya no existe. Vuelve a cargar la pantalla para crear uno.');
      }
      resultado = await consultarPerfil(transaccion);
      if (!resultado) throw new ErrorPerfil('No se pudo comprobar el perfil actualizado.');
    });
    if (!resultado) throw new ErrorPerfil('No se pudo comprobar el perfil actualizado.');
    return resultado;
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudo actualizar tu perfil. Intenta nuevamente.');
  }
}

export async function eliminarPerfil(): Promise<void> {
  try {
    const base = await obtenerBase();
    // Eliminar de nuevo un perfil ya borrado también deja el estado deseado.
    await enTransaccion(base, async (transaccion) => {
      await transaccion.runAsync('DELETE FROM sesion');
      await transaccion.runAsync('DELETE FROM cuestionario WHERE id = ?', 1);
      await transaccion.runAsync('DELETE FROM perfil WHERE id = ?', 1);
    });
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudo eliminar tu perfil. Intenta nuevamente.');
  }
}

// ---------------------------------------------------------------------------
// Cuestionario inicial

interface FilaCuestionario {
  estilos: string; fuerza: string; mancuerna: number; duracion: number;
  puente_una_pierna: string | null; dead_bug_extension: string | null;
  core_suelo: string; evitar: string;
}

/** Una fila dañada o de otra versión se trata como cuestionario pendiente, no como error fatal. */
async function consultarCuestionario(base: SQLite.SQLiteDatabase): Promise<RespuestasCuestionario | null> {
  const fila = await base.getFirstAsync<FilaCuestionario>(
    'SELECT * FROM cuestionario WHERE id = ?', 1);
  if (!fila) return null;
  try {
    return validarRespuestas({
      estilos: JSON.parse(fila.estilos), fuerza: fila.fuerza, mancuerna: fila.mancuerna === 1,
      duracion: fila.duracion, puenteUnaPierna: fila.puente_una_pierna,
      deadBugExtension: fila.dead_bug_extension, coreSuelo: fila.core_suelo, evitar: JSON.parse(fila.evitar),
    });
  } catch {
    return null;
  }
}

export async function leerCuestionario(): Promise<RespuestasCuestionario | null> {
  try {
    return await consultarCuestionario(await obtenerBase());
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudieron cargar tus respuestas. Intenta nuevamente.');
  }
}

/** Guarda perfil y respuestas en una sola transacción: o se guardan ambos, o ninguno. */
export async function guardarPerfilYCuestionario(datos: DatosPerfil, respuestas: RespuestasCuestionario):
  Promise<{ perfil: Perfil; cuestionario: RespuestasCuestionario }> {
  const valido = validarDatosPerfil(datos);
  let r: RespuestasCuestionario;
  try {
    r = validarRespuestas(respuestas);
  } catch (error) {
    throw new ErrorPerfil(error instanceof Error ? error.message : 'Revisa tus respuestas.');
  }
  try {
    const base = await obtenerBase();
    let perfil: Perfil | null = null;
    let cuestionario: RespuestasCuestionario | null = null;
    await enTransaccion(base, async (transaccion) => {
      const ahora = new Date().toISOString();
      if (await consultarPerfil(transaccion)) {
        await transaccion.runAsync(`
          UPDATE perfil SET nombre = ?, edad = ?, peso_kg = ?, estatura_cm = ?, nivel = ?, actualizado_en = ?
          WHERE id = ?
        `, valido.nombre, valido.edad, valido.pesoKg, valido.estaturaCm, valido.nivel, ahora, 1);
      } else {
        await transaccion.runAsync(`
          INSERT INTO perfil (id, nombre, edad, peso_kg, estatura_cm, nivel, creado_en, actualizado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, 1, valido.nombre, valido.edad, valido.pesoKg, valido.estaturaCm, valido.nivel, ahora, ahora);
      }
      await transaccion.runAsync(`
        INSERT OR REPLACE INTO cuestionario
          (id, estilos, fuerza, mancuerna, duracion, puente_una_pierna, dead_bug_extension,
           core_suelo, evitar, actualizado_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, 1, JSON.stringify(r.estilos), r.fuerza, r.mancuerna ? 1 : 0, r.duracion, r.puenteUnaPierna,
      r.deadBugExtension, r.coreSuelo, JSON.stringify(r.evitar), ahora);
      perfil = await consultarPerfil(transaccion);
      cuestionario = await consultarCuestionario(transaccion);
      if (!perfil || !cuestionario) throw new ErrorPerfil('No se pudieron comprobar tus respuestas guardadas.');
    });
    if (!perfil || !cuestionario) throw new ErrorPerfil('No se pudieron comprobar tus respuestas guardadas.');
    return { perfil, cuestionario };
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudieron guardar tus respuestas. Intenta nuevamente.');
  }
}

// ---------------------------------------------------------------------------
// Historial de sesiones

interface FilaSesion {
  fecha: string; plantilla: string; nivel: string; duracion: number; origen: string; ejercicios: string;
  completada: number; detenida_por_dolor: number; esfuerzo: string | null; dolor: number;
}

function filaARegistro(fila: FilaSesion): RegistroSesion | null {
  try {
    return validarRegistro({
      fecha: fila.fecha, plantilla: fila.plantilla, nivel: fila.nivel, duracionMin: fila.duracion, origen: fila.origen,
      ejercicios: JSON.parse(fila.ejercicios), completada: fila.completada === 1,
      detenidaPorDolor: fila.detenida_por_dolor === 1, esfuerzo: fila.esfuerzo, dolor: fila.dolor === 1,
    });
  } catch {
    return null;
  }
}

/** Hasta 5 sesiones, de la más reciente a la más antigua, y el total registrado. */
export async function leerHistorialSesiones(): Promise<{ recientes: RegistroSesion[]; total: number }> {
  try {
    const base = await obtenerBase();
    const filas = await base.getAllAsync<FilaSesion>('SELECT * FROM sesion ORDER BY id DESC LIMIT 5');
    const cuenta = await base.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM sesion');
    // Una fila dañada corta la secuencia: la racha no salta por encima de ella.
    const recientes: RegistroSesion[] = [];
    for (const fila of filas) {
      const r = filaARegistro(fila);
      if (!r) break;
      recientes.push(r);
    }
    return { recientes, total: cuenta?.total ?? 0 };
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudo leer tu historial de sesiones.');
  }
}

/** Ejercicios que la persona ya hizo alguna vez (al menos una serie): sirve para saber cuándo uno es nuevo. */
export async function leerEjerciciosHechos(): Promise<string[]> {
  try {
    const base = await obtenerBase();
    const filas = await base.getAllAsync<{ ejercicios: string }>('SELECT ejercicios FROM sesion');
    return ejerciciosHechosDe(filas.map((f) => f.ejercicios));
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudo leer tu historial de sesiones.');
  }
}

export async function guardarSesion(registro: RegistroSesion): Promise<RegistroSesion> {
  let r: RegistroSesion;
  try {
    r = validarRegistro(registro);
  } catch (error) {
    throw new ErrorPerfil(error instanceof Error ? error.message : 'Registro de sesión no válido.');
  }
  try {
    const base = await obtenerBase();
    await base.runAsync(`
      INSERT INTO sesion (fecha, plantilla, nivel, duracion, origen, ejercicios, completada, detenida_por_dolor,
        esfuerzo, dolor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, r.fecha, r.plantilla, r.nivel, r.duracionMin, r.origen, JSON.stringify(r.ejercicios), r.completada ? 1 : 0,
    r.detenidaPorDolor ? 1 : 0, r.esfuerzo, r.dolor ? 1 : 0);
    return r;
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudo guardar la sesión. Intenta nuevamente.');
  }
}
