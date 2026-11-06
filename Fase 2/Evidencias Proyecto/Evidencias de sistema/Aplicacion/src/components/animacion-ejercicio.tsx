import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ANIMACIONES } from '@/components/animaciones-datos';
import { useMovimientoReducido } from '@/components/movimiento';

/**
 * Animación de un ejercicio (evidencias/animaciones, preparadas con herramientas/optimizar_animaciones.py). Con
 * «reducir movimiento» activado en el teléfono o el navegador se muestra la posición clave, sin animar.
 * Los ejercicios sin animación (C02) no muestran nada.
 */
export type EjercicioAnimado = keyof typeof ANIMACIONES;

export function tieneAnimacion(id: string): id is EjercicioAnimado {
  return Object.prototype.hasOwnProperty.call(ANIMACIONES, id);
}

export default function AnimacionEjercicio({ id }: { id: string }) {
  const reducido = useMovimientoReducido();
  if (!tieneAnimacion(id)) return null;
  const animacion = ANIMACIONES[id];
  return (
    <View style={styles.marco}>
      <Image
        source={reducido ? animacion.fija : animacion.animada}
        style={[styles.imagen, { aspectRatio: animacion.proporcion }]}
        contentFit="contain"
        accessible
        accessibilityLabel={animacion.descripcion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Mismo fondo que las animaciones, para que no se note el borde de la imagen.
  marco: { backgroundColor: '#FBFAFD', borderRadius: 12, overflow: 'hidden', alignItems: 'center' },
  // Las de pie son más altas que anchas: se limita la altura para que no empujen las instrucciones fuera de la pantalla.
  imagen: { width: '100%', maxWidth: 480, maxHeight: 230 },
});
