import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

/**
 * Movimientos suaves de la interfaz (propuesta de diseño del 05-11-2026). Usan la API Animated de React Native, que
 * funciona igual en el teléfono y en la web sin librerías nuevas. Con «reducir movimiento» activado no se animan.
 */
const NATIVO = Platform.OS !== 'web';

export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    let vigente = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => { if (vigente) setReducido(valor); })
      .catch(() => { /* Sin dato: se anima. */ });
    const suscripcion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducido);
    return () => { vigente = false; suscripcion.remove(); };
  }, []);
  return reducido;
}

/** Aparece subiendo un poco. `orden` escalona varias tarjetas (80 ms entre una y otra). */
export function Aparecer({ children, orden = 0, style }: { children: ReactNode; orden?: number; style?: ViewStyle }) {
  const reducido = useMovimientoReducido();
  const avance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducido) { avance.setValue(1); return; }
    Animated.timing(avance, {
      toValue: 1, duration: 420, delay: orden * 80, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVO,
    }).start();
  }, [avance, orden, reducido]);
  return (
    <Animated.View style={[style, {
      opacity: avance,
      transform: [{ translateY: avance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}

/** Barra que se llena hasta `valor` (0 a 1). Con `punto`, un círculo marca dónde va. */
export function BarraProgreso({ valor, color, fondo, alto = 6, punto = false }: {
  valor: number; color: string; fondo: string; alto?: number; punto?: boolean;
}) {
  const reducido = useMovimientoReducido();
  const ancho = useRef(new Animated.Value(0)).current;
  const destino = Math.max(0, Math.min(1, valor));
  useEffect(() => {
    if (reducido) { ancho.setValue(destino); return; }
    Animated.timing(ancho, { toValue: destino, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false })
      .start();
  }, [ancho, destino, reducido]);
  const diametro = alto + 10;
  return (
    <View style={{ height: punto ? diametro : alto, justifyContent: 'center' }}>
      <View style={{ height: alto, borderRadius: alto / 2, backgroundColor: fondo, overflow: 'hidden' }}>
        <Animated.View style={{
          height: alto, borderRadius: alto / 2, backgroundColor: color,
          width: ancho.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }} />
      </View>
      {punto ? (
        <Animated.View style={{
          position: 'absolute', width: diametro, height: diametro, borderRadius: diametro / 2, marginLeft: -diametro / 2,
          backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: color, boxShadow: '0 2px 6px rgba(60, 40, 120, 0.2)',
          left: ancho.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }} />
      ) : null}
    </View>
  );
}

const COLORES_CONFETI = ['#7C4DFF', '#C3ADFF', '#FFD166', '#5EEAD4', '#FF8C9C', '#F3EFFA'];

/** Confeti que cae una sola vez (≈2,5 s) al completar una sesión. No bloquea los toques. */
export function Confeti({ cantidad = 36 }: { cantidad?: number }) {
  const reducido = useMovimientoReducido();
  const caida = useRef(new Animated.Value(0)).current;
  const piezas = useRef(Array.from({ length: cantidad }, (_, i) => ({
    x: Math.random() * 100,
    deriva: (Math.random() - 0.5) * 80,
    giro: (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 360),
    retraso: Math.random() * 0.35,
    ancho: 6 + Math.random() * 6,
    color: COLORES_CONFETI[i % COLORES_CONFETI.length],
  }))).current;
  useEffect(() => {
    if (reducido) return;
    Animated.timing(caida, { toValue: 1, duration: 2600, easing: Easing.in(Easing.quad), useNativeDriver: NATIVO })
      .start();
  }, [caida, reducido]);
  if (reducido) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {piezas.map((p, i) => {
        const tramo = caida.interpolate({ inputRange: [0, p.retraso, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
        return (
          <Animated.View key={i} style={{
            position: 'absolute', top: -20, left: `${p.x}%`, width: p.ancho, height: p.ancho * 1.6, borderRadius: 2,
            backgroundColor: p.color,
            opacity: tramo.interpolate({ inputRange: [0, 0.01, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: tramo.interpolate({ inputRange: [0, 1], outputRange: [0, 720] }) },
              { translateX: tramo.interpolate({ inputRange: [0, 1], outputRange: [0, p.deriva] }) },
              { rotate: tramo.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.giro}deg`] }) },
            ],
          }} />
        );
      })}
    </View>
  );
}
