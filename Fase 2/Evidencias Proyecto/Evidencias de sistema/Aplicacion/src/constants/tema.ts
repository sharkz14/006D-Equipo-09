/**
 * Paleta de Kinetia (propuesta de la estudiante, 05-11-2026): fondo claro, ciruela para la portada y la celebración,
 * violeta para lo elegido y el progreso, y turquesa con texto oscuro para la acción principal. Un solo lugar para los
 * colores: cada pantalla los importa de aquí. Contrastes revisados (texto normal ≥ 4,5:1 sobre su fondo).
 */
export const T = {
  // Igual al fondo de las animaciones: así el GIF se funde con la pantalla.
  fondo: '#FBFAFD',
  superficie: '#FFFFFF',
  superficieAlta: '#F2EFF8',
  borde: '#E7E2F0',
  texto: '#231B33',
  // 5,3:1 sobre blanco.
  suave: '#6B6080',
  // Violeta: lo elegido y el progreso; blanco encima (6,2:1) y también como texto sobre blanco.
  acento: '#6545D8',
  acentoTexto: '#6545D8',
  acentoSuave: '#ECE7FB',
  sobreAcento: '#FFFFFF',
  alerta: '#B42842',
  alertaFondo: '#FDECEF',
  deshabilitado: '#B9B2C9',
  textoDeshabilitado: '#8A8099',
  // Turquesa: la acción principal; texto oscuro encima (10:1). El blanco sobre turquesa no se leería bien.
  celeste: '#70E3DC',
  sobreCeleste: '#0E2A3A',
  // Ciruela: portada de Inicio y celebración.
  banda: '#2B1A47',
  sobreBanda: '#FFFFFF',
  sobreBandaSuave: 'rgba(255, 255, 255, 0.76)',
  lilaBanda: '#CDBDFF',
} as const;

/** Sombra suave de las tarjetas blancas (sin borde: la sombra basta). */
export const SOMBRA = { boxShadow: '0 4px 18px rgba(43, 26, 71, 0.07)' } as const;

/**
 * Escala de texto: pesos más livianos y tamaños contenidos. La jerarquía se marca con tamaño y color, no solo con
 * negritas, para que la interfaz se vea más fina.
 */
export const TIPO = {
  tituloPantalla: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  tituloTarjeta: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  cuerpo: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  apoyo: { fontSize: 13.5, lineHeight: 19, fontWeight: '400' },
  etiqueta: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  boton: { fontSize: 16, fontWeight: '600' },
} as const;
