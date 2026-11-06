"""
Kinetia · prepara las animaciones de los ejercicios para la app.

Originales (generados con ChatGPT por la estudiante, 04 y 05-11-2026, revisados cuadro a cuadro):
evidencias/animaciones/*_original.gif (960×480, 25 cuadros por segundo). Ver evidencias/animaciones/LEEME.md.

Para cada animación este script:
- recorta según su forma (de pie = más alta que ancha; en el suelo = ancha; c03 = vista desde el techo), con el mismo
  recorte dentro de cada forma para que el personaje se vea del mismo tamaño en todos los ejercicios;
- reduce el tamaño (máx. 720 px de ancho) con una paleta de 64 colores sin tramado, con el fondo exacto de la app;
- guarda una imagen fija con la posición clave para quien tiene activado «reducir movimiento»;
- escribe src/components/animaciones-datos.ts (no editar a mano).

Uso (en la carpeta del proyecto):   python herramientas/optimizar_animaciones.py
Requiere Pillow. Resultado: assets/images/ejercicios/<id>.gif y .png
"""
import os

from PIL import Image, ImageChops, ImageStat

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ORIGEN = os.path.join(RAIZ, 'evidencias', 'animaciones')
SALIDA = os.path.join(RAIZ, 'assets', 'images', 'ejercicios')
DATOS = os.path.join(RAIZ, 'src', 'components', 'animaciones-datos.ts')
ANCHO_MAX = 720
COLORES = 64
# Fondo exacto del marco en la app (#FBFAFD). Los originales traen fondos apenas distintos entre sí y la paleta
# los corre un poco más; se igualan para que no se note un rectángulo alrededor de la animación.
FONDO = (251, 250, 253)

# Recortes (izquierda, arriba, derecha, abajo) sobre el original de 960×480, medidos con todos los cuadros.
RECORTES = {
    'pie': (180, 0, 820, 432),     # de pie (x 405-613, y 6-396); tan ancho como el espacio en el teléfono, para que
                                   # la colchoneta cruce todo el recuadro
    'suelo': (60, 70, 912, 444),   # acostados o en cuatro apoyos (el mismo que ya usaba el cuestionario)
    'techo': (60, 52, 900, 426),   # c03, vista desde arriba: la colchoneta completa
}

# id: (archivo original, forma, cuadro clave o None = el más distinto del primero, descripción para lectores de pantalla)
ANIMACIONES = {
    'K01': ('k01_sentadilla_original.gif', 'pie', None,
            'Animación: persona de pie que baja llevando la cadera hacia atrás y doblando las rodillas, con los '
            'talones apoyados, y vuelve a subir.'),
    'K02': ('k02_sentadilla_goblet_original.gif', 'pie', None,
            'Animación: persona de pie con una mancuerna frente al pecho que baja llevando la cadera hacia atrás y '
            'doblando las rodillas, con los talones apoyados, y vuelve a subir.'),
    'K03': ('k03_split_squat_original.gif', 'pie', None,
            'Animación: persona con un pie adelante y otro atrás, manos en la cadera, que baja doblando las dos '
            'rodillas y vuelve a subir.'),
    'K04': ('k04_split_squat_goblet_original.gif', 'pie', None,
            'Animación: persona con un pie adelante y otro atrás y una mancuerna frente al pecho, que baja doblando '
            'las dos rodillas y vuelve a subir.'),
    'K05': ('k05_rumano_original.gif', 'pie', None,
            'Animación: persona de pie con una mancuerna que inclina el tronco llevando la cadera hacia atrás, con '
            'la espalda recta y la mancuerna cerca de las piernas, y vuelve a subir.'),
    'K06': ('k06_puente_bilateral_original.gif', 'suelo', None,
            'Animación: persona boca arriba con las rodillas dobladas y los dos pies apoyados que sube y baja la '
            'cadera.'),
    'K07': ('k07_puente_mancuerna_original.gif', 'suelo', None,
            'Animación: persona boca arriba con una mancuerna sobre la pelvis y los dos pies apoyados que sube y '
            'baja la cadera.'),
    'K08': ('k08_puente_original.gif', 'suelo', 60,
            'Animación: persona boca arriba que sujeta una pierna contra el pecho y sube y baja la cadera '
            'empujando con el otro pie apoyado en el suelo.'),
    'K09': ('k09_talones_original.gif', 'pie', None,
            'Animación: persona de pie que sube los talones, quedando en la punta de los pies, y vuelve a bajar.'),
    'K10': ('k10_talones_goblet_original.gif', 'pie', None,
            'Animación: persona de pie con una mancuerna frente al pecho que sube los talones, quedando en la punta '
            'de los pies, y vuelve a bajar.'),
    'K11': ('k11_dead_bug_inicial_original.gif', 'suelo', None,
            'Animación: persona boca arriba con los pies apoyados que levanta un brazo y la pierna del lado '
            'contrario con la rodilla doblada, vuelve y cambia de lado.'),
    'K12': ('k12_dead_bug_original.gif', 'suelo', 54,
            'Animación: persona boca arriba con los brazos hacia el techo y las piernas dobladas en el aire, que '
            'estira a la vez un brazo hacia atrás y la pierna del lado contrario, y luego cambia de lado.'),
    'K13': ('k13_bird_dog_original.gif', 'suelo', None,
            'Animación: persona apoyada en manos y rodillas que estira un brazo hacia adelante y la pierna del lado '
            'contrario hacia atrás, vuelve y cambia de lado.'),
    'K14': ('k14_plancha_lateral_original.gif', 'suelo', None,
            'Animación: persona de lado, apoyada en el antebrazo y las rodillas, que sube la cadera hasta formar una '
            'línea recta, la sostiene y baja.'),
    'P01': ('p01_marcha_original.gif', 'pie', None,
            'Animación: persona que marcha en el lugar subiendo las rodillas a media altura y moviendo los brazos.'),
    'P02': ('p02_marcha_hombros_original.gif', 'pie', None,
            'Animación: persona que marcha en el lugar mientras gira los hombros hacia atrás y luego hacia '
            'adelante.'),
    'C01': ('c01_caminata_suave_original.gif', 'pie', None,
            'Animación: persona que camina suave en el lugar, levantando apenas los talones.'),
    'C03': ('c03_estiramiento_cuadriceps_original.gif', 'techo', 85,
            'Animación: persona acostada de lado, vista desde arriba, que dobla la pierna de arriba y toma el pie '
            'con la mano, llevando el talón hacia el glúteo.'),
}
# C02 (estiramiento de glúteo) no tiene animación: los dos intentos se descartaron (ver LEEME.md).


def cargar(ruta):
    im = Image.open(ruta)
    cuadros, duraciones = [], []
    for i in range(im.n_frames):
        im.seek(i)
        cuadro = im.convert('RGB')
        cuadro.info.clear()   # algunos originales traen un color transparente que no aplica al guardar
        cuadros.append(cuadro)
        duraciones.append(im.info.get('duration', 40))
    return cuadros, duraciones


def igualar_fondo(cuadro):
    fondo_original = cuadro.getpixel((1, 1))   # las esquinas de todos los recortes son fondo
    diferencia = ImageChops.difference(cuadro, Image.new('RGB', cuadro.size, fondo_original)).convert('L')
    cuadro.paste(FONDO, mask=diferencia.point(lambda v: 255 if v <= 3 else 0))
    return cuadro


def cuadro_mas_distinto(cuadros):
    primero = cuadros[0]
    return max(range(len(cuadros)), key=lambda i: sum(ImageStat.Stat(ImageChops.difference(primero, cuadros[i])).mean))


def preparar(id_, archivo, forma, clave):
    cuadros, duraciones = cargar(os.path.join(ORIGEN, archivo))
    recorte = RECORTES[forma]
    ancho_r, alto_r = recorte[2] - recorte[0], recorte[3] - recorte[1]
    ancho = min(ANCHO_MAX, ancho_r)
    alto = round(ancho * alto_r / ancho_r)
    cuadros = [c.crop(recorte) for c in cuadros]
    if (ancho, alto) != (ancho_r, alto_r):
        cuadros = [c.resize((ancho, alto), Image.LANCZOS) for c in cuadros]
    cuadros = [igualar_fondo(c) for c in cuadros]
    if clave is None:
        clave = cuadro_mas_distinto(cuadros)
    muestra = cuadros[::max(1, len(cuadros) // 16)]
    mosaico = Image.new('RGB', (ancho, alto * len(muestra)))
    for i, c in enumerate(muestra):
        mosaico.paste(c, (0, i * alto))
    paleta = mosaico.quantize(colors=COLORES, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    colores = paleta.getpalette()
    i_fondo = paleta.getpixel((0, 0))
    colores[i_fondo * 3:i_fondo * 3 + 3] = FONDO
    paleta.putpalette(colores)
    indexados = [c.quantize(palette=paleta, dither=Image.Dither.NONE) for c in cuadros]
    nombre = id_.lower()
    gif = os.path.join(SALIDA, f'{nombre}.gif')
    indexados[0].save(gif, save_all=True, append_images=indexados[1:], duration=duraciones, loop=0, optimize=True,
                      disposal=1)
    png = os.path.join(SALIDA, f'{nombre}.png')
    cuadros[clave].save(png, optimize=True)
    print(f'{id_}: {forma:5s} {ancho}×{alto}, {len(cuadros)} cuadros, {os.path.getsize(gif) // 1024} KB · '
          f'fija (cuadro {clave}) {os.path.getsize(png) // 1024} KB')
    return nombre, ancho, alto


def escribir_datos(filas):
    lineas = [
        '// Generado por herramientas/optimizar_animaciones.py. No editar a mano: cambia el script y vuelve a ejecutarlo.',
        '// Animaciones generadas con ChatGPT por la autora y revisadas contra las fichas (evidencias/animaciones/LEEME.md).',
        '/* eslint-disable @typescript-eslint/no-require-imports */',
        'export const ANIMACIONES = {',
    ]
    for id_, nombre, ancho, alto, descripcion in filas:
        lineas += [
            f'  {id_}: {{',
            f"    animada: require('@/assets/images/ejercicios/{nombre}.gif'),",
            f"    fija: require('@/assets/images/ejercicios/{nombre}.png'),",
            f'    proporcion: {ancho} / {alto},',
            f"    descripcion: '{descripcion}',",
            '  },',
        ]
    lineas += ['} as const;', '']
    with open(DATOS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lineas))


if __name__ == '__main__':
    os.makedirs(SALIDA, exist_ok=True)
    filas = []
    for id_, (archivo, forma, clave, descripcion) in ANIMACIONES.items():
        assert "'" not in descripcion, id_
        nombre, ancho, alto = preparar(id_, archivo, forma, clave)
        filas.append((id_, nombre, ancho, alto, descripcion))
    escribir_datos(filas)
    total = sum(os.path.getsize(os.path.join(SALIDA, f)) for f in os.listdir(SALIDA))
    print(f'Total: {len(filas)} animaciones, {total / 1024 / 1024:.1f} MB · {os.path.relpath(DATOS, RAIZ)} actualizado')
