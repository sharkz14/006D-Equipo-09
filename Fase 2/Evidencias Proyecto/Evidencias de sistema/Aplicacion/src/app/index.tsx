import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePerfil } from '@/components/perfil-provider';
import PreguntasPuente from '@/components/preguntas-puente';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import VistaRutina from '@/components/vista-rutina';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { generateRoutine, type RoutineResult } from '@/lib/generador';
import { formularioPuenteVacio, solicitudDesdeFormulario } from '@/lib/ia/formulario-puente';

// Los IDs coinciden con las familias que reconoce el generador.
const familiasDisponibles = [
  { id: 'sentadilla', nombre: 'Sentadillas' },
  { id: 'split_squat', nombre: 'Split squat' },
  { id: 'bisagra', nombre: 'Bisagra de cadera' },
  { id: 'puente', nombre: 'Puentes de cadera' },
  { id: 'pantorrilla', nombre: 'Elevación de talones' },
  { id: 'dead_bug', nombre: 'Dead bug' },
  { id: 'bird_dog', nombre: 'Bird dog' },
  { id: 'plancha_lateral', nombre: 'Plancha lateral' },
];

export default function HomeScreen() {
  const { perfil, cargando, guardando, error: errorPerfil, recargar } = usePerfil();
  const [nivel, setNivel] = useState<'P' | 'I'>('P');
  const [duracion, setDuracion] = useState<20 | 30 | 40>(20);
  const [equipo, setEquipo] = useState<'PC' | 'M1'>('PC');
  const [respuestasPuente, setRespuestasPuente] = useState(formularioPuenteVacio);

  // null muestra Configurar; un resultado abre la vista previa.
  const [rutina, setRutina] = useState<RoutineResult | null>(null);

  // Se pueden marcar varias familias o dejar la lista vacía.
  const [familiasExcluidas, setFamiliasExcluidas] = useState<string[]>([]);
  const [mostrarExclusiones, setMostrarExclusiones] = useState(false);

  // Las confirmaciones comienzan sin marcar.
  const [mayorEdad, setMayorEdad] = useState(false);
  const [sinLimitaciones, setSinLimitaciones] = useState(false);
  const [aceptaAlcance, setAceptaAlcance] = useState(false);

  // Solo un perfil leído correctamente permite continuar.
  const perfilDisponible = !cargando && !guardando && !errorPerfil && perfil !== null && perfil.edad >= 18;
  const filtroSuperado = perfilDisponible && mayorEdad && sinLimitaciones && aceptaAlcance;
  const pilotoDisponible = __DEV__ && nivel === 'I' && duracion === 20 &&
    equipo === 'PC' && familiasExcluidas.length === 0;

  // El perfil aporta el nivel inicial. Volver de otra pestaña no sobrescribe
  // una elección temporal; guardar/eliminar el perfil sí reinicia la sesión.
  useEffect(() => {
    setNivel(perfil?.nivel ?? 'P');
    setRutina(null);
    setMayorEdad(false);
    setSinLimitaciones(false);
    setAceptaAlcance(false);
    setRespuestasPuente(formularioPuenteVacio());
  }, [perfil]);

  const resumenFamilias = familiasDisponibles
    .filter((familia) => familiasExcluidas.includes(familia.id))
    .map((familia) => familia.nombre)
    .join(', ') || 'Ninguna';

  function alternarFamilia(id: string) {
    setFamiliasExcluidas((actuales) =>
      actuales.includes(id)
        ? actuales.filter((familia) => familia !== id)
        : [...actuales, id],
    );
  }

  function verRutina() {
    if (!filtroSuperado) return;

    const resultado = generateRoutine({
      nivel,
      duracion,
      equipo,
      filtroSuperado,
      excluir: {
        ids: [],
        familias: [...familiasExcluidas],
        tags: [],
      },
      // Expo Go permite revisar borradores. Una app publicada exige
      // contenido habilitado; este modo no es una opción del formulario.
      modo: __DEV__ ? 'borrador' : 'app',
      puenteIA: pilotoDisponible ? solicitudDesdeFormulario(respuestasPuente) : undefined,
    });

    if (resultado.principal.length === 0) {
      setRutina(null);
      const mensaje = resultado.estado === 'sin_principal'
        ? (__DEV__
          ? 'Con estas opciones no quedan ejercicios principales compatibles. Revisa la configuración y las exclusiones.'
          : 'El contenido sigue en revisión y todavía no hay ejercicios habilitados.')
        : resultado.mensajes.join('\n');

      Alert.alert('No se pudo generar una rutina', mensaje);
      return;
    }

    const puente = resultado.principal.find((ejercicio) => ejercicio.familia === 'puente');
    if (pilotoDisponible && puente) {
      Alert.alert(
        'Selección inicial del puente',
        `${puente.nombre} (${puente.id})\n\n` +
          `${puente.seleccion.origen === 'modelo' ? 'Modelo experimental K06/K08' : 'Selección habitual'}\n` +
          puente.seleccion.motivo,
        [
          { text: 'Volver', style: 'cancel' },
          { text: 'Ver rutina', onPress: () => setRutina(resultado) },
        ],
      );
      return;
    }
    setRutina(resultado);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <ThemedView style={styles.heroSection}>
            <ThemedText type="title">Kinetia</ThemedText>
            <ThemedText type="code">Configurar rutina</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.stepContainer}>
            <ThemedText type="subtitle">Tu perfil</ThemedText>
            {cargando ? (
              <ThemedText>Cargando perfil…</ThemedText>
            ) : errorPerfil ? (
              <>
                <ThemedText accessibilityRole="alert">{errorPerfil}</ThemedText>
                <Pressable style={styles.opcion} accessibilityRole="button" onPress={() => { void recargar(); }}>
                  <ThemedText>Reintentar</ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <ThemedText>
                  {perfil
                    ? `${perfil.nombre} · ${perfil.edad} años · ${perfil.nivel === 'P' ? 'Principiante' : 'Intermedio'}`
                    : 'Crea tu perfil para configurar y generar tu primera rutina.'}
                </ThemedText>
                <Pressable style={styles.opcion} accessibilityRole="button" onPress={() => router.navigate('/perfil')}>
                  <ThemedText>{perfil ? 'Ver o editar mi perfil' : 'Crear mi perfil'}</ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.stepContainer}>
            <ThemedText type="subtitle">Nivel de fuerza</ThemedText>

            <ThemedText type="small">
              El perfil aporta tu nivel inicial. Puedes cambiarlo para esta rutina sin modificar el perfil.
            </ThemedText>

            <Pressable
              onPress={() => setNivel('P')}
              accessibilityRole="button"
              accessibilityState={{ selected: nivel === 'P' }}
              style={[
                styles.opcion,
                nivel === 'P' && styles.opcionSeleccionada,
              ]}
            >
              <ThemedText>Principiante</ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setNivel('I')}
              accessibilityRole="button"
              accessibilityState={{ selected: nivel === 'I' }}
              style={[
                styles.opcion,
                nivel === 'I' && styles.opcionSeleccionada,
              ]}
            >
              <ThemedText>Intermedio</ThemedText>
            </Pressable>

            <ThemedText type="small">
              Nivel seleccionado: {nivel === 'P' ? 'Principiante' : 'Intermedio'}
            </ThemedText>

            <ThemedText type="subtitle">Duración referencial</ThemedText>

            <ThemedView type="backgroundElement" style={styles.fila}>
              <Pressable
                onPress={() => setDuracion(20)}
                accessibilityRole="button"
                accessibilityState={{ selected: duracion === 20 }}
                style={[
                  styles.opcion,
                  styles.opcionDuracion,
                  duracion === 20 && styles.opcionSeleccionada,
                ]}
              >
                <ThemedText>20 min</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setDuracion(30)}
                accessibilityRole="button"
                accessibilityState={{ selected: duracion === 30 }}
                style={[
                  styles.opcion,
                  styles.opcionDuracion,
                  duracion === 30 && styles.opcionSeleccionada,
                ]}
              >
                <ThemedText>30 min</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setDuracion(40)}
                accessibilityRole="button"
                accessibilityState={{ selected: duracion === 40 }}
                style={[
                  styles.opcion,
                  styles.opcionDuracion,
                  duracion === 40 && styles.opcionSeleccionada,
                ]}
              >
                <ThemedText>40 min</ThemedText>
              </Pressable>
            </ThemedView>

            <ThemedText type="small">
              Duración seleccionada: {duracion} min
            </ThemedText>

            <ThemedText type="subtitle">Equipamiento</ThemedText>

            <Pressable
              onPress={() => setEquipo('PC')}
              accessibilityRole="button"
              accessibilityState={{ selected: equipo === 'PC' }}
              style={[
                styles.opcion,
                equipo === 'PC' && styles.opcionSeleccionada,
              ]}
            >
              <ThemedText>Solo peso corporal</ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setEquipo('M1')}
              accessibilityRole="button"
              accessibilityState={{ selected: equipo === 'M1' }}
              style={[
                styles.opcion,
                equipo === 'M1' && styles.opcionSeleccionada,
              ]}
            >
              <ThemedText>Peso corporal + una mancuerna</ThemedText>
            </Pressable>

            <ThemedText type="small">
              Equipo seleccionado:{' '}
              {equipo === 'PC'
                ? 'Solo peso corporal'
                : 'Peso corporal + una mancuerna'}
            </ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.stepContainer}>
            <ThemedText type="subtitle">Familias a evitar</ThemedText>

            <ThemedText type="small">
              Las familias agrupan variantes del mismo tipo de ejercicio.
              Puedes dejar esta selección vacía.
            </ThemedText>

            <Pressable
              onPress={() => setMostrarExclusiones((valor) => !valor)}
              accessibilityRole="button"
              accessibilityState={{ expanded: mostrarExclusiones }}
              style={styles.opcion}
            >
              <ThemedText>
                {mostrarExclusiones ? 'Ocultar opciones' : 'Elegir familias a evitar'}
              </ThemedText>
            </Pressable>

            {mostrarExclusiones && (
              <>
                <ThemedText type="small">
                  Marca las familias que prefieres evitar. Se excluirán todas
                  sus variantes. Si el motivo es dolor, lesión limitante o
                  recuperación clínica, no continúes.
                </ThemedText>

                {familiasDisponibles.map((familia) => {
                  const seleccionada = familiasExcluidas.includes(familia.id);

                  return (
                    <Pressable
                      key={familia.id}
                      onPress={() => alternarFamilia(familia.id)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Evitar ${familia.nombre}`}
                      accessibilityState={{ checked: seleccionada }}
                      style={[
                        styles.opcion,
                        seleccionada && styles.opcionSeleccionada,
                      ]}
                    >
                      <ThemedText>
                        {seleccionada ? '☑' : '☐'} {familia.nombre}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </>
            )}

            <ThemedText type="small" accessibilityLiveRegion="polite">
              Familias a evitar: {resumenFamilias}
            </ThemedText>
          </ThemedView>

          {pilotoDisponible && (
            <PreguntasPuente respuestas={respuestasPuente} onChange={setRespuestasPuente} />
          )}

          <ThemedView type="backgroundElement" style={styles.stepContainer}>
            <ThemedText type="subtitle">Comprobación inicial</ThemedText>

            <ThemedText type="small">
              Marca únicamente las afirmaciones que sean ciertas.
            </ThemedText>

            <Pressable
              onPress={() => setMayorEdad((valor) => !valor)}
              accessibilityRole="checkbox"
              accessibilityLabel="Tengo 18 años o más"
              accessibilityState={{ checked: mayorEdad }}
              style={[
                styles.opcion,
                mayorEdad && styles.opcionSeleccionada,
              ]}
            >
              <ThemedText>
                {mayorEdad ? '☑' : '☐'} Tengo 18 años o más.
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setSinLimitaciones((valor) => !valor)}
              accessibilityRole="checkbox"
              accessibilityLabel="Confirmo que no tengo dolor ni una lesión que limite el movimiento y que no estoy en recuperación clínica. Si aparece dolor durante la sesión, me comprometo a detenerla."
              accessibilityState={{ checked: sinLimitaciones }}
              style={[
                styles.opcion,
                sinLimitaciones && styles.opcionSeleccionada,
              ]}
            >
              <ThemedText>
                {sinLimitaciones ? '☑' : '☐'} Confirmo que no tengo dolor ni una
                lesión que limite el movimiento y que no estoy en recuperación
                clínica. Si aparece dolor durante la sesión, me comprometo a
                detenerla.
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setAceptaAlcance((valor) => !valor)}
              accessibilityRole="checkbox"
              accessibilityLabel="Entiendo que Kinetia no enseña pasos ni evalúa mi técnica, y no ofrece diagnóstico ni rehabilitación"
              accessibilityState={{ checked: aceptaAlcance }}
              style={[
                styles.opcion,
                aceptaAlcance && styles.opcionSeleccionada,
              ]}
            >
              <ThemedText>
                {aceptaAlcance ? '☑' : '☐'} Entiendo que Kinetia no enseña pasos
                ni evalúa mi técnica, y no ofrece diagnóstico ni rehabilitación.
              </ThemedText>
            </Pressable>

            <ThemedText type="small" accessibilityLiveRegion="polite">
              {!perfilDisponible
                ? 'Para continuar necesitas un perfil guardado y cargado correctamente.'
                : filtroSuperado
                  ? 'Las tres confirmaciones están marcadas.'
                  : 'Para continuar deben cumplirse las tres afirmaciones. Si alguna no se cumple, no puedes continuar.'}
            </ThemedText>

            <Pressable
              onPress={verRutina}
              disabled={!filtroSuperado}
              accessibilityRole="button"
              accessibilityState={{ disabled: !filtroSuperado }}
              style={[
                styles.botonPrincipal,
                !filtroSuperado && styles.botonDeshabilitado,
              ]}
            >
              <ThemedText style={styles.textoBoton}>
                Ver rutina
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
      {rutina !== null && perfilDisponible && (
        <VistaRutina rutina={rutina} onVolver={() => setRutina(null)} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  stepContainer: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  opcion: {
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B9B2C2',
  },
  opcionSeleccionada: {
    borderColor: '#7046B5',
  },
  fila: {
    flexDirection: 'row',
    gap: 8,
  },
  opcionDuracion: {
    flex: 1,
    alignItems: 'center',
  },
  botonPrincipal: {
    minHeight: 48,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7046B5',
  },
  botonDeshabilitado: {
    backgroundColor: '#76717E',
  },
  textoBoton: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
