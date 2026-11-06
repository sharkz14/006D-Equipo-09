import { StyleSheet, Text, View } from 'react-native';

import { T } from '@/constants/tema';

/** Marca de Kinetia: tres trazos inclinados, como un paso de baile, y el nombre. */
export default function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <View style={styles.fila} accessible accessibilityRole="header" accessibilityLabel="Kinetia">
      <View style={styles.trazos}>
        {['#B9A6F5', '#8C6EE8', T.acento].map((color, i) => (
          <View key={color} style={[styles.trazo, { backgroundColor: color, height: 12 + i * 3 }]} />
        ))}
      </View>
      <Text style={[styles.nombre, claro && styles.nombreClaro]}>Kinetia</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trazos: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18 },
  trazo: { width: 5, borderRadius: 2, transform: [{ skewX: '-20deg' }] },
  nombre: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4, color: T.texto },
  nombreClaro: { color: T.sobreBanda },
});
