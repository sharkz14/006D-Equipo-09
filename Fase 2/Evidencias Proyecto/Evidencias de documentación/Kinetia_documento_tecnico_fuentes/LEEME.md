# Fuentes del documento técnico

Archivos con los que se armó `Kinetia_documento_tecnico_v1.0.docx` (noviembre de 2026). No hace falta abrirlos para
leer el documento: el Word y el PDF ya están en la carpeta anterior.

| Archivo | Contenido |
|---|---|
| `generar.js` | Script que arma el Word. |
| `arquitectura.mmd` y `er.mmd` | Diagramas de arquitectura y entidad-relación (Mermaid), con sus imágenes `.png` y su configuración (`cfg.json`, `cfg_er.json`). |
| `uml/` | Diagramas UML en PlantUML: casos de uso, clases, secuencia y componentes (`.puml`, con el estilo común `estilo.iuml`), y sus imágenes. |
| `logo_duoc.png` | Logo de la portada. |

## Cómo editar los diagramas

- Los `.mmd` se abren en https://mermaid.live.
- Los `.puml` se abren con PlantUML (por ejemplo, la extensión de PlantUML de Visual Studio Code, que necesita Java).

## Cómo volver a armar el Word (opcional)

En esta carpeta, con Node.js:

```powershell
npm install docx@9
node generar.js
```

Deja `documento_tecnico_kinetia.docx` aquí mismo. La carpeta `node_modules` que se crea no se sube a GitHub. Al abrir
el Word, responde **Sí** cuando pregunte si actualizar los campos, para que se llene el índice.
