"""Extrae el texto «Cómo hacerlo» de las fichas simples (.md) y genera src/lib/fichas.ts."""
import json, re, sys, pathlib
origen = pathlib.Path(sys.argv[1]); destino = pathlib.Path(sys.argv[2])
fichas = {}
# Acepta «fichas_simples» (por parejas) y «ficha_simple» (una sola, como K05).
for md in sorted([*origen.glob('Kinetia_fichas_simples_*_v0.1.md'), *origen.glob('Kinetia_ficha_simple_*_v0.1.md')]):
    texto = md.read_text(encoding='utf-8')
    for bloque in re.split(r'\n(?=## )', texto):
        m = re.match(r'## ([KC]\d{2}) — (.+)', bloque)
        if not m: continue
        id_, titulo = m.group(1), m.group(2).strip()
        sec = re.search(r'### Cómo hacerlo[^\n]*\n(.*?)(?=\n### |\Z)', bloque, re.S)
        if not sec: continue
        cuerpo = sec.group(1)
        pasos = [re.sub(r'\s+', ' ', p).strip() for p in re.findall(r'^\d\. (.+)$', cuerpo, re.M)]
        def lista(etiqueta):
            mm = re.search(r'\*\*' + etiqueta + r':\*\* (.+)', cuerpo)
            if not mm: return []
            partes = [p.strip().rstrip('.') for p in mm.group(1).split(';')]
            return [p[0].upper() + p[1:] + '.' for p in partes if p]
        borrador = 'borrador' in sec.group(0).split('\n')[0]
        fichas[id_] = {'id': id_, 'titulo': titulo, 'pasos': pasos, 'puntos': lista('Dos puntos técnicos'),
                       'errores': lista('Dos errores frecuentes'), 'textoBorrador': borrador, 'archivo': md.name}
assert all(len(f['pasos']) >= 3 for f in fichas.values()), fichas
cab = '''/**
 * Instrucciones para la sesión guiada, copiadas sin cambios de las fichas simples v0.1 del repositorio
 * («Cómo hacerlo», «Dos puntos técnicos» y «Dos errores frecuentes»). Son borradores pendientes de revisión
 * profesional. Archivo generado por herramientas/extraer_fichas.py: no editar a mano.
 */
export interface FichaApp {
  id: string;
  titulo: string;
  pasos: string[];
  puntos: string[];
  errores: string[];
  /** La ficha marca este texto como «borrador para la app». */
  textoBorrador: boolean;
  archivo: string;
}

export const FICHAS: Record<string, FichaApp> = '''
destino.write_text(cab + json.dumps(fichas, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(sorted(fichas), {k: len(v['pasos']) for k, v in fichas.items()})
