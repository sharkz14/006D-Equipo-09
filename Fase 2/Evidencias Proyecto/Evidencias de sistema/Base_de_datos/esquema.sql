-- Kinetia, Fase 2: esquema de perfil, versión 1.
-- Extraído de Aplicacion/src/lib/perfil.ts.
-- Ejecutar sobre una base nueva y vacía. La app lo crea automáticamente.
BEGIN TRANSACTION;
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
COMMIT;
PRAGMA journal_mode = WAL;
