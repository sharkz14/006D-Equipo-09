import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import AnimacionEjercicio from '@/components/animacion-ejercicio';
import { usePerfil } from '@/components/perfil-provider';
import {
  ESTILOS, OPCION_FUERZA, TEXTO_CORE, TEXTO_EVITAR, TEXTO_EXPERIENCIA,
  nivelSugerido, preguntaVariantesIntermedias,
  type CoreSuelo, type Duracion, type Estilo, type Evitar, type Experiencia, type Fuerza,
} from '@/lib/cuestionario';
import { validarFormularioPerfil } from '@/lib/perfil';
import { Aparecer } from '@/components/movimiento';
import { SOMBRA, T, TIPO } from '@/constants/tema';

type Paso = 'bienvenida' | 'nombre' | 'edad' | 'menor' | 'cuerpo' | 'estilos' | 'fuerza' | 'mancuerna' |
  'duracion' | 'puente' | 'deadbug' | 'core' | 'evitar' | 'resumen';

type Borrador = {
  nombre: string; edad: string; peso: string; estatura: string;
  estilos: Estilo[]; fuerza: Fuerza | null; mancuerna: boolean | null; duracion: Duracion | null;
  puente: Experiencia | null; deadbug: Experiencia | null; core: CoreSuelo | null; evitar: Evitar[];
  nivel: 'P' | 'I' | null;
};

/** Qué es cada variante, para reconocerla (no son instrucciones). Coinciden con las fichas K08 y K12. */
const DESCRIPCION = {
  puente: {
    texto: 'Es un ejercicio de glúteos que se hace acostado de espalda: una pierna queda abrazada contra el pecho y ' +
      'la cadera sube y baja empujando solo con el otro pie.',
    nombres: 'También se conoce como puente de glúteo unilateral.',
  },
  deadbug: {
    texto: 'Es un ejercicio de core que se hace acostado de espalda: con los brazos hacia el techo y las piernas ' +
      'dobladas en el aire, se estiran a la vez un brazo y la pierna del lado contrario, sin tocar el suelo.',
    nombres: 'También se conoce como «bicho muerto».',
  },
} as const;

/** Orden de las preguntas. K08 y K12 solo se preguntan a quien podría recibirlas. */
function secuencia(fuerza: Fuerza | null): Paso[] {
  return ['nombre', 'edad', 'cuerpo', 'estilos', 'fuerza', 'mancuerna', 'duracion',
    ...(preguntaVariantesIntermedias(fuerza) ? ['puente', 'deadbug'] as Paso[] : []), 'core', 'evitar'];
}


function Opcion({ texto, detalle, elegida, multiple, onPress }: {
  texto: string; detalle?: string; elegida: boolean; multiple?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={multiple ? { checked: elegida } : { selected: elegida }}
      style={({ pressed }) => [styles.opcion, elegida && styles.opcionElegida, pressed && styles.pulsado]}
    >
      <Text style={[styles.textoOpcion, elegida && styles.textoOpcionElegida]}>
        {multiple ? (elegida ? '☑  ' : '☐  ') : ''}{texto}
      </Text>
      {detalle ? <Text style={styles.detalleOpcion}>{detalle}</Text> : null}
    </Pressable>
  );
}

export default function CuestionarioInicial({ visible, onCerrar, cerrable }: {
  visible: boolean;
  onCerrar: () => void;
  /** false la primera vez: hay que completarlo para usar la app. */
  cerrable: boolean;
}) {
  const { perfil, cuestionario, completarCuestionario, guardando } = usePerfil();
  const [paso, setPaso] = useState<Paso>('bienvenida');
  const [historial, setHistorial] = useState<Paso[]>([]);
  const [error, setError] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inicial = (): Borrador => ({
    nombre: perfil?.nombre ?? '', edad: perfil ? String(perfil.edad) : '',
    peso: perfil ? String(perfil.pesoKg) : '', estatura: perfil ? String(perfil.estaturaCm) : '',
    estilos: cuestionario?.estilos ?? [], fuerza: cuestionario?.fuerza ?? null,
    mancuerna: cuestionario?.mancuerna ?? null, duracion: cuestionario?.duracion ?? null,
    puente: cuestionario?.puenteUnaPierna ?? null, deadbug: cuestionario?.deadBugExtension ?? null,
    core: cuestionario?.coreSuelo ?? null, evitar: cuestionario?.evitar ?? [],
    nivel: perfil && cuestionario ? perfil.nivel : null,
  });
  const [b, setB] = useState<Borrador>(inicial);

  // Al abrir, se parte desde el inicio con lo ya guardado precargado.
  useEffect(() => {
    if (visible) { setPaso('bienvenida'); setHistorial([]); setError(null); setB(inicial()); }
    return () => { if (temporizador.current) clearTimeout(temporizador.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const preguntas = useMemo(() => secuencia(b.fuerza), [b.fuerza]);
  const indice = preguntas.indexOf(paso);
  const progreso = paso === 'resumen' ? 1 : indice >= 0 ? indice / preguntas.length : 0;
  const nivel = b.nivel ?? (b.fuerza ? nivelSugerido(b.fuerza) : 'P');

  function ir(destino: Paso) {
    setHistorial((h) => [...h, paso]);
    setPaso(destino);
    setError(null);
  }
  function siguiente(desde: Paso = paso, fuerza: Fuerza | null = b.fuerza) {
    if (desde === 'bienvenida') return ir('nombre');
    const lista = secuencia(fuerza);
    const i = lista.indexOf(desde);
    ir(i >= 0 && i < lista.length - 1 ? lista[i + 1] : 'resumen');
  }
  function atras() {
    if (temporizador.current) clearTimeout(temporizador.current);
    const previo = historial.at(-1);
    if (!previo) { if (cerrable) onCerrar(); return; }
    setHistorial((h) => h.slice(0, -1));
    setPaso(previo);
    setError(null);
  }
  /** Al elegir una opción única se muestra la selección un instante y se avanza solo. */
  function elegir(cambio: Partial<Borrador>) {
    const nuevo = { ...b, ...cambio };
    if ('fuerza' in cambio && cambio.fuerza !== b.fuerza) nuevo.nivel = null; // vuelve a sugerir
    setB(nuevo);
    if (temporizador.current) clearTimeout(temporizador.current);
    const desde = paso;
    temporizador.current = setTimeout(() => siguiente(desde, nuevo.fuerza), 220);
  }

  function continuarTexto() {
    if (paso === 'nombre') {
      const nombre = b.nombre.trim();
      if (!nombre) return setError('Escribe tu nombre para continuar.');
      if (nombre.length > 80) return setError('El nombre puede tener hasta 80 caracteres.');
    }
    if (paso === 'edad') {
      if (!/^\d{1,3}$/.test(b.edad.trim())) return setError('Escribe tu edad en años, solo con números.');
      const edad = Number(b.edad.trim());
      if (edad < 18) return ir('menor');
      if (edad > 100) return setError('Revisa tu edad.');
    }
    if (paso === 'cuerpo') {
      try {
        const d = validarFormularioPerfil({ nombre: b.nombre, edad: b.edad, pesoKg: b.peso, estaturaCm: b.estatura, nivel: 'P' });
        if (d.pesoKg < 30 || d.pesoKg > 250) return setError('Revisa el peso: escríbelo en kilos, por ejemplo 62.');
        if (d.estaturaCm < 120 || d.estaturaCm > 230) return setError('Revisa la estatura: escríbela en centímetros, por ejemplo 165.');
      } catch (e) {
        return setError(e instanceof Error ? e.message : 'Revisa el peso y la estatura.');
      }
    }
    siguiente();
  }

  async function guardar() {
    if (guardando || !b.fuerza || b.mancuerna === null || !b.duracion || !b.core) {
      setError('Falta alguna respuesta. Vuelve atrás para completarla.');
      return;
    }
    const intermedias = preguntaVariantesIntermedias(b.fuerza);
    try {
      const datos = validarFormularioPerfil({ nombre: b.nombre, edad: b.edad, pesoKg: b.peso, estaturaCm: b.estatura, nivel });
      await completarCuestionario(datos, {
        estilos: b.estilos, fuerza: b.fuerza, mancuerna: b.mancuerna, duracion: b.duracion,
        puenteUnaPierna: intermedias ? b.puente : null, deadBugExtension: intermedias ? b.deadbug : null,
        coreSuelo: b.core, evitar: b.evitar,
      });
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tus respuestas. Inténtalo nuevamente.');
    }
  }

  const nombreCorto = b.nombre.trim().split(/\s+/)[0] || '';
  const estilosTexto = b.estilos.map((e) => ESTILOS.find((x) => x.id === e)!.texto).join(', ');

  function contenido() {
    switch (paso) {
      case 'bienvenida':
        return (<>
          <Text style={styles.titulo}>{cuestionario ? 'Actualicemos tus respuestas' : 'Hola, soy Kinetia 👋'}</Text>
          <Text style={styles.texto}>
            Armo rutinas de fuerza y control para complementar tu baile. Te haré unas preguntas rápidas
            para que cada rutina sea a tu medida.
          </Text>
          <Text style={styles.ayuda}>Toma menos de un minuto.</Text>
        </>);
      case 'nombre':
        return (<>
          <Text style={styles.titulo}>¿Cómo te llamas?</Text>
          <TextInput style={styles.campo} value={b.nombre} autoFocus placeholder="Tu nombre"
            onChangeText={(nombre) => setB({ ...b, nombre })} onSubmitEditing={continuarTexto}
            returnKeyType="next" maxLength={80} accessibilityLabel="Tu nombre" />
        </>);
      case 'edad':
        return (<>
          <Text style={styles.titulo}>¿Cuántos años tienes{nombreCorto ? `, ${nombreCorto}` : ''}?</Text>
          <TextInput style={styles.campo} value={b.edad} autoFocus placeholder="Edad" keyboardType="number-pad"
            onChangeText={(edad) => setB({ ...b, edad })} onSubmitEditing={continuarTexto}
            maxLength={3} accessibilityLabel="Tu edad en años" />
          <Text style={styles.ayuda}>Kinetia es para personas de 18 años o más.</Text>
        </>);
      case 'menor':
        return (<>
          <Text style={styles.titulo}>Por ahora, Kinetia es solo para mayores de 18</Text>
          <Text style={styles.texto}>
            Las rutinas están pensadas para personas adultas. Gracias por tu interés: te esperamos más adelante.
          </Text>
        </>);
      case 'cuerpo':
        return (<>
          <Text style={styles.titulo}>¿Cuánto pesas y mides?</Text>
          <Text style={styles.ayuda}>La IA lo usa solo para ajustar la carga de los ejercicios.</Text>
          <View style={styles.fila}>
            <View style={styles.columna}>
              <Text style={styles.etiqueta}>Peso (kg)</Text>
              <TextInput style={styles.campo} value={b.peso} autoFocus placeholder="62" keyboardType="decimal-pad"
                onChangeText={(peso) => setB({ ...b, peso })} accessibilityLabel="Peso en kilos" />
            </View>
            <View style={styles.columna}>
              <Text style={styles.etiqueta}>Estatura (cm)</Text>
              <TextInput style={styles.campo} value={b.estatura} placeholder="165" keyboardType="decimal-pad"
                onChangeText={(estatura) => setB({ ...b, estatura })} onSubmitEditing={continuarTexto}
                accessibilityLabel="Estatura en centímetros" />
            </View>
          </View>
        </>);
      case 'estilos':
        return (<>
          <Text style={styles.titulo}>¿Qué bailas?</Text>
          <Text style={styles.ayuda}>Puedes elegir varios.</Text>
          {ESTILOS.map((e) => (
            <Opcion key={e.id} texto={e.texto} multiple elegida={b.estilos.includes(e.id)}
              onPress={() => setB({ ...b, estilos: ESTILOS.map((x) => x.id).filter((id) =>
                id === e.id ? !b.estilos.includes(id) : b.estilos.includes(id)) })} />
          ))}
        </>);
      case 'fuerza':
        return (<>
          <Text style={styles.titulo}>¿Haces ejercicios de fuerza?</Text>
          <Text style={styles.ayuda}>Gimnasio, calistenia o en casa, al menos una vez por semana.</Text>
          {(Object.keys(OPCION_FUERZA) as Fuerza[]).map((f) => (
            <Opcion key={f} texto={OPCION_FUERZA[f]} elegida={b.fuerza === f} onPress={() => elegir({ fuerza: f })} />
          ))}
        </>);
      case 'mancuerna':
        return (<>
          <Text style={styles.titulo}>¿Tienes una mancuerna en casa?</Text>
          <Opcion texto="Sí" elegida={b.mancuerna === true} onPress={() => elegir({ mancuerna: true })} />
          <Opcion texto="No" elegida={b.mancuerna === false} onPress={() => elegir({ mancuerna: false })} />
        </>);
      case 'duracion':
        return (<>
          <Text style={styles.titulo}>¿Cuánto tiempo sueles tener para entrenar?</Text>
          {([20, 30, 40] as Duracion[]).map((d) => (
            <Opcion key={d} texto={`${d} minutos`} elegida={b.duracion === d} onPress={() => elegir({ duracion: d })} />
          ))}
        </>);
      case 'puente':
      case 'deadbug': {
        const puente = paso === 'puente';
        return (<>
          <Text style={styles.titulo}>{puente ? '¿Has hecho el puente a una pierna?' : '¿Y el dead bug con extensión?'}</Text>
          <View style={[styles.descripcion, styles.descripcionPasos]}>
            <AnimacionEjercicio id={puente ? 'K08' : 'K12'} />
            <Text style={styles.textoDescripcion}>{DESCRIPCION[paso].texto}</Text>
            <Text style={styles.nombresEjercicio}>{DESCRIPCION[paso].nombres}</Text>
          </View>
          {(Object.keys(TEXTO_EXPERIENCIA) as Experiencia[]).map((x) => (
            <Opcion key={x} texto={TEXTO_EXPERIENCIA[x]} elegida={(puente ? b.puente : b.deadbug) === x}
              onPress={() => elegir(puente ? { puente: x } : { deadbug: x })} />
          ))}
        </>);
      }
      case 'core':
        return (<>
          <Text style={styles.titulo}>¿Haces ejercicios de abdomen o core en el suelo?</Text>
          {(Object.keys(TEXTO_CORE) as CoreSuelo[]).map((c) => (
            <Opcion key={c} texto={TEXTO_CORE[c]} elegida={b.core === c} onPress={() => elegir({ core: c })} />
          ))}
        </>);
      case 'evitar':
        return (<>
          <Text style={styles.titulo}>¿Hay algo que prefieras evitar?</Text>
          <Text style={styles.ayuda}>
            Lo quitamos de tus rutinas. Si es por dolor o una lesión, consulta a un profesional antes de entrenar.
          </Text>
          {(Object.keys(TEXTO_EVITAR) as Evitar[]).map((x) => (
            <Opcion key={x} texto={TEXTO_EVITAR[x]} multiple elegida={b.evitar.includes(x)}
              onPress={() => setB({ ...b, evitar: b.evitar.includes(x) ? b.evitar.filter((y) => y !== x) : [...b.evitar, x] })} />
          ))}
          <Opcion texto="Nada en particular" multiple elegida={b.evitar.length === 0}
            onPress={() => setB({ ...b, evitar: [] })} />
        </>);
      case 'resumen':
        return (<>
          <Text style={styles.titulo}>Listo{nombreCorto ? `, ${nombreCorto}` : ''}</Text>
          <Text style={styles.texto}>Así quedó tu perfil. Puedes cambiarlo cuando quieras.</Text>
          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Tu nivel</Text>
            <View style={styles.fila}>
              {(['P', 'I'] as const).map((n) => (
                <Pressable key={n} onPress={() => setB({ ...b, nivel: n })} accessibilityRole="radio"
                  accessibilityState={{ selected: nivel === n }}
                  style={[styles.segmento, nivel === n && styles.segmentoElegido]}>
                  <Text style={[styles.textoSegmento, nivel === n && styles.textoSegmentoElegido]}>
                    {n === 'P' ? 'Principiante' : 'Intermedio'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.ayuda}>
              {b.nivel === null || (b.fuerza && b.nivel === nivelSugerido(b.fuerza))
                ? 'Sugerido según tu respuesta sobre entrenamiento de fuerza.'
                : 'Elegiste un nivel distinto al sugerido.'}
            </Text>
          </View>
          <View style={styles.tarjeta}>
            <Text style={styles.texto}>
              Sesión: {b.duracion} min · {b.mancuerna ? 'con una mancuerna' : 'solo peso corporal'}
            </Text>
            {estilosTexto ? <Text style={styles.texto}>Bailas: {estilosTexto}</Text> : null}
            <Text style={styles.texto}>
              Evitas: {b.evitar.length ? b.evitar.map((x) => TEXTO_EVITAR[x].toLowerCase()).join(', ') : 'nada en particular'}
            </Text>
          </View>
        </>);
    }
  }

  const conBotonContinuar = ['bienvenida', 'nombre', 'edad', 'cuerpo', 'estilos', 'evitar'].includes(paso);
  const textoBoton = paso === 'bienvenida' ? 'Empecemos'
    : paso === 'estilos' && b.estilos.length === 0 ? 'Omitir' : 'Continuar';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={atras}>
      <SafeAreaProvider style={styles.fondo}>
        <SafeAreaView style={styles.pantalla}>
          <View style={styles.barraSuperior}>
            {historial.length > 0 || cerrable ? (
              <Pressable onPress={atras} accessibilityRole="button" accessibilityLabel={historial.length ? 'Volver' : 'Cerrar'}
                hitSlop={12} style={styles.botonAtras}>
                <Text style={styles.textoAtras}>{historial.length ? '‹ Atrás' : 'Cerrar'}</Text>
              </Pressable>
            ) : <View style={styles.botonAtras} />}
            {paso !== 'bienvenida' && paso !== 'menor' ? (
              <View style={styles.progreso} accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progreso * 100) }}>
                <View style={[styles.progresoLleno, { width: `${Math.max(4, progreso * 100)}%` }]} />
              </View>
            ) : null}
          </View>

          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
              {/* Cada pregunta entra con un movimiento suave. */}
              <Aparecer key={paso} style={styles.bloque}>{contenido()}</Aparecer>
              {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            </ScrollView>

            {conBotonContinuar || paso === 'resumen' || paso === 'menor' ? (
              <View style={styles.pie}>
                <Pressable
                  onPress={paso === 'resumen' ? () => { void guardar(); } : paso === 'menor' ? atras : continuarTexto}
                  disabled={guardando}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.botonPrincipal, (pressed || guardando) && styles.pulsado]}
                >
                  {guardando ? <ActivityIndicator color={T.sobreAcento} /> : (
                    <Text style={styles.textoBoton}>
                      {paso === 'resumen' ? 'Guardar y ver mi sesión' : paso === 'menor' ? 'Volver' : textoBoton}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: T.fondo },
  pantalla: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  flex: { flex: 1 },
  barraSuperior: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, minHeight: 48 },
  botonAtras: { minWidth: 72, minHeight: 40, justifyContent: 'center' },
  textoAtras: { fontSize: 16, fontWeight: '600', color: T.acentoTexto },
  progreso: { flex: 1, height: 6, borderRadius: 3, backgroundColor: T.borde, overflow: 'hidden' },
  progresoLleno: { height: '100%', borderRadius: 4, backgroundColor: T.acento },
  contenido: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 14 },
  bloque: { gap: 14 },
  titulo: { ...TIPO.tituloPantalla, color: T.texto },
  texto: { ...TIPO.cuerpo, fontSize: 16, lineHeight: 24, color: T.texto },
  ayuda: { ...TIPO.apoyo, fontSize: 14, lineHeight: 20, color: T.suave },
  etiqueta: { fontSize: 15, fontWeight: '600', color: T.texto },
  campo: {
    minHeight: 56, borderRadius: 16, borderWidth: 1.5, borderColor: T.borde, backgroundColor: T.superficieAlta,
    paddingHorizontal: 16, fontSize: 20, color: T.texto,
  },
  fila: { flexDirection: 'row', gap: 12 },
  columna: { flex: 1, gap: 6 },
  opcion: {
    minHeight: 54, borderRadius: 18, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: T.superficie,
    paddingHorizontal: 18, paddingVertical: 14, justifyContent: 'center', gap: 2, ...SOMBRA,
  },
  opcionElegida: { borderColor: T.acento, backgroundColor: T.acentoSuave },
  textoOpcion: { ...TIPO.cuerpo, fontSize: 16, color: T.texto },
  textoOpcionElegida: { fontWeight: '600', color: T.acentoTexto },
  detalleOpcion: { fontSize: 14, color: T.suave },
  descripcion: { padding: 14, borderRadius: 22, backgroundColor: T.superficie, ...SOMBRA },
  descripcionPasos: { gap: 10 },
  textoDescripcion: { ...TIPO.cuerpo, color: T.texto },
  nombresEjercicio: { fontSize: 14, lineHeight: 20, color: T.suave },
  tarjeta: { backgroundColor: T.superficie, borderRadius: 22, padding: 18, gap: 10, ...SOMBRA },
  segmento: {
    flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: T.borde, backgroundColor: T.superficieAlta,
    alignItems: 'center', justifyContent: 'center',
  },
  segmentoElegido: { borderColor: T.acento, backgroundColor: T.acentoSuave },
  textoSegmento: { fontSize: 16, color: T.texto },
  textoSegmentoElegido: { fontWeight: '700', color: T.acentoTexto },
  error: { fontSize: 15, lineHeight: 22, color: T.alerta, fontWeight: '600' },
  pie: { paddingHorizontal: 24, paddingVertical: 12 },
  botonPrincipal: {
    minHeight: 52, borderRadius: 999, backgroundColor: T.acento, alignItems: 'center', justifyContent: 'center',
  },
  textoBoton: { ...TIPO.boton, color: T.sobreAcento },
  pulsado: { opacity: 0.75 },
});
