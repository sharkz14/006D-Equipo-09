# Base de datos de Kinetia

En este avance uso SQLite con `expo-sqlite` para guardar el perfil en el dispositivo.
Hay un único perfil por instalación. El catálogo y las reglas están en TypeScript;
todavía no existen tablas de rutinas, sesiones ni historial.

| Archivo | Contenido |
|---|---|
| `esquema.sql` | Creación de la tabla `perfil`, versión 1 y modo WAL. |
| `kinetia.db` | Base vacía generada desde ese esquema para revisar su estructura. No contiene perfiles. |
| `../Aplicacion/src/lib/perfil.ts` | Implementación que crea y utiliza la base dentro de la app. |

## Tabla perfil

| Campo | Tipo | Uso y restricción |
|---|---|---|
| `id` | INTEGER | Clave primaria; solo admite `1`. |
| `nombre` | TEXT | Obligatorio; entre 1 y 80 caracteres tras quitar espacios en los extremos. |
| `edad` | INTEGER | Entero, mínimo 18. |
| `peso_kg` | REAL | Mayor que cero. |
| `estatura_cm` | REAL | Mayor que cero. |
| `nivel` | TEXT | `P`: principiante; `I`: intermedio. |
| `creado_en` | TEXT | Fecha de creación. La app escribe formato ISO 8601. |
| `actualizado_en` | TEXT | Fecha de la última modificación, escrita por la app en ISO 8601. |

Todos los campos son obligatorios. La app valida el formulario y utiliza consultas
parametrizadas para crear, leer, actualizar y eliminar el registro. La versión del
esquema se guarda en `PRAGMA user_version = 1`.

## Cómo revisar esta evidencia

Se puede abrir `kinetia.db` con un visor compatible con SQLite y revisar la tabla.
Para generar otra base vacía con la herramienta de línea de comandos SQLite:

```bash
sqlite3 kinetia_revision.db
```

Dentro de SQLite, desde esta carpeta:

```sql
.read esquema.sql
.schema perfil
SELECT COUNT(*) FROM perfil;
.quit
```

El conteo inicial es cero. Esta base es una evidencia de estructura, generada desde
el código entregado, y no una copia de la información del emulador. Para ejecutar
Kinetia basta seguir el README de `Aplicacion`; la app crea su propia base.
