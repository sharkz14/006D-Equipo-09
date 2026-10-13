import * as SQLite from 'expo-sqlite';

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

const VERSION_BASE = 1;
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

async function abrirBase(): Promise<SQLite.SQLiteDatabase> {
  let base: SQLite.SQLiteDatabase | null = null;
  try {
    base = await SQLite.openDatabaseAsync('kinetia.db');

    // Esquema y versión se guardan juntos: un fallo revierte la migración.
    await base.withExclusiveTransactionAsync(async (transaccion) => {
      const fila = await transaccion.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version',
      );
      if (!fila || fila.user_version < 0) {
        throw new ErrorPerfil('No se pudo comprobar la versión de la base de datos.');
      }
      if (fila.user_version > VERSION_BASE) {
        throw new ErrorPerfil('Esta base de datos necesita una versión más reciente de Kinetia.');
      }
      if (fila.user_version === 0) {
        await transaccion.execAsync(`
          CREATE TABLE perfil (
            id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
            nombre TEXT NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 80),
            edad INTEGER NOT NULL CHECK (typeof(edad) = 'integer' AND edad >= 18),
            peso_kg REAL NOT NULL CHECK (peso_kg > 0),
            estatura_cm REAL NOT NULL CHECK (estatura_cm > 0),
            nivel TEXT NOT NULL CHECK (nivel IN ('P', 'I')),
            creado_en TEXT NOT NULL,
            actualizado_en TEXT NOT NULL
          );
          PRAGMA user_version = 1;
        `);
      }
    });

    await base.execAsync('PRAGMA journal_mode = WAL;');
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
    await base.withExclusiveTransactionAsync(async (transaccion) => {
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
    await base.withExclusiveTransactionAsync(async (transaccion) => {
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
    await base.runAsync('DELETE FROM perfil WHERE id = ?', 1);
  } catch (error) {
    throw errorDeOperacion(error, 'No se pudo eliminar tu perfil. Intenta nuevamente.');
  }
}
