/**
 * Esquema SQLite de Kinetia. Solo texto SQL, sin dependencias, para poder probar las migraciones fuera de la app.
 * Versión 1: perfil. Versión 2: + cuestionario inicial. Versión 3: + historial de sesiones.
 */
export const VERSION_BASE = 3;

export const SQL_TABLA_PERFIL = `
  CREATE TABLE perfil (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 80),
    edad INTEGER NOT NULL CHECK (typeof(edad) = 'integer' AND edad >= 18),
    peso_kg REAL NOT NULL CHECK (peso_kg > 0),
    estatura_cm REAL NOT NULL CHECK (estatura_cm > 0),
    nivel TEXT NOT NULL CHECK (nivel IN ('P', 'I')),
    creado_en TEXT NOT NULL,
    actualizado_en TEXT NOT NULL
  );`;

export const SQL_TABLA_CUESTIONARIO = `
  CREATE TABLE cuestionario (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1) REFERENCES perfil (id) ON DELETE CASCADE,
    estilos TEXT NOT NULL CHECK (estilos LIKE '[%]'),
    fuerza TEXT NOT NULL CHECK (fuerza IN ('no', 'menos_6_meses', '6_meses_o_mas')),
    mancuerna INTEGER NOT NULL CHECK (mancuerna IN (0, 1)),
    duracion INTEGER NOT NULL CHECK (duracion IN (20, 30, 40)),
    puente_una_pierna TEXT CHECK (puente_una_pierna IS NULL OR
      puente_una_pierna IN ('nunca', 'me_sale_bien', 'me_cuesta', 'hace_mucho', 'no_se')),
    dead_bug_extension TEXT CHECK (dead_bug_extension IS NULL OR
      dead_bug_extension IN ('nunca', 'me_sale_bien', 'me_cuesta', 'hace_mucho', 'no_se')),
    core_suelo TEXT NOT NULL CHECK (core_suelo IN ('seguido', 'a_veces', 'no', 'lo_deje')),
    evitar TEXT NOT NULL CHECK (evitar LIKE '[%]'),
    actualizado_en TEXT NOT NULL
  );`;

/** Una fila por sesión realizada (completa o no). Se borra junto con el perfil. */
export const SQL_TABLA_SESION = `
  CREATE TABLE sesion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    plantilla TEXT NOT NULL,
    nivel TEXT NOT NULL CHECK (nivel IN ('P', 'I')),
    duracion INTEGER NOT NULL CHECK (duracion IN (20, 30, 40)),
    origen TEXT NOT NULL CHECK (origen IN ('ia', 'reglas')),
    ejercicios TEXT NOT NULL CHECK (ejercicios LIKE '[%]'),
    completada INTEGER NOT NULL CHECK (completada IN (0, 1)),
    detenida_por_dolor INTEGER NOT NULL CHECK (detenida_por_dolor IN (0, 1)),
    esfuerzo TEXT CHECK (esfuerzo IS NULL OR esfuerzo IN ('facil', 'adecuada', 'dificil')),
    dolor INTEGER NOT NULL CHECK (dolor IN (0, 1))
  );`;

/** Migraciones por versión de origen. Cada una deja la base en la versión actual y conserva lo existente. */
export const MIGRACIONES: Record<number, string> = {
  0: `${SQL_TABLA_PERFIL}\n${SQL_TABLA_CUESTIONARIO}\n${SQL_TABLA_SESION}\nPRAGMA user_version = 3;`,
  1: `${SQL_TABLA_CUESTIONARIO}\n${SQL_TABLA_SESION}\nPRAGMA user_version = 3;`,
  2: `${SQL_TABLA_SESION}\nPRAGMA user_version = 3;`,
};
