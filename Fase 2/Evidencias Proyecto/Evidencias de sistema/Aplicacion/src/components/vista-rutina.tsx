import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import {
    CATALOG,
    type PrincipalExercise,
    type RoutineResult,
    type SequenceBlock,
} from '@/lib/generador';

// Nombres para mostrar los datos del generador sin cambiar sus identificadores.
const nombresFamilias: Record<string, string> = {
  sentadilla: 'Sentadillas',
  split_squat: 'Split squat',
  bisagra: 'Bisagra de cadera',
  puente: 'Puentes de cadera',
  pantorrilla: 'Elevación de talones',
  dead_bug: 'Dead bug',
  bird_dog: 'Bird dog',
  plancha_lateral: 'Plancha lateral',
};

const nombresAuxiliares: Record<string, string> = {
  P01: 'Marcha',
  P02: 'Marcha y giros de hombros',
  C01: 'Caminata',
  C02: 'Estiramiento de glúteo',
  C03: 'Estiramiento de cuádriceps',
};

const nombresFamiliasAuxiliares: Record<string, string> = {
  marcha: 'Marcha',
  caminata: 'Caminata',
  estiramiento_gluteo: 'Estiramiento de glúteo',
  estiramiento_cuadriceps: 'Estiramiento de cuádriceps',
};

const nombresPosiciones: Record<string, string> = {
  de_pie: 'de pie',
  boca_arriba: 'boca arriba',
  cuadrupedia: 'cuadrupedia',
  lateral: 'de lado',
};

function nombreFamilia(id: string): string {
  return nombresFamilias[id] ?? nombresFamiliasAuxiliares[id] ?? id.replace(/_/g, ' ');
}

function nombreEjercicio(id: string): string {
  return CATALOG[id]?.nombre ?? nombresAuxiliares[id] ?? id;
}

function textoDosis(ejercicio: PrincipalExercise): string {
  const { series, cantidad, unidad } = ejercicio.dosis;
  const medida = unidad === 'segundos' ? 'segundos de sostén' : 'repeticiones';
  const porLado = ejercicio.lateralidad === 'bilateral' ? '' : ' por lado';

  // Se usa la dosis del resultado: algunas plantillas cambian las series.
  return `${series} series · ${cantidad} ${medida}${porLado}`;
}

function Descansos({ ejercicio }: { ejercicio: PrincipalExercise }) {
  return (
    <>
      <Text style={styles.texto}>
        Descanso entre series: {ejercicio.dosis.descansoEntreSeries} s.
      </Text>
      {ejercicio.dosis.descansoEntreLados > 0 ? (
        <Text style={styles.texto}>
          Descanso entre lados: {ejercicio.dosis.descansoEntreLados} s.
        </Text>
      ) : null}
      {ejercicio.lateralidad === 'alternado' ? (
        <Text style={styles.textoPequeno}>Alterna los lados.</Text>
      ) : null}
    </>
  );
}

function tituloBloque(bloque: SequenceBlock): string {
  if (bloque.tipo === 'transicion') return 'Transición';
  if (bloque.tipo === 'ensayo') {
    return `Preparación específica: ${nombreEjercicio(bloque.id)}`;
  }
  if (bloque.tipo === 'principal') return `Principal: ${bloque.nombre}`;

  const fase = bloque.fase === 'preparacion' ? 'Preparación' : 'Cierre';
  return `${fase}: ${nombresAuxiliares[bloque.id] ?? bloque.id}`;
}

function DetalleBloque({ bloque }: { bloque: SequenceBlock }) {
  if (bloque.tipo === 'transicion') {
    return (
      <Text style={styles.texto}>
        {nombresPosiciones[bloque.desde] ?? bloque.desde}
        {' → '}
        {nombresPosiciones[bloque.hacia] ?? bloque.hacia}.
      </Text>
    );
  }

  if (bloque.tipo === 'ensayo') {
    return (
      <>
        <Text style={styles.texto}>Ensayo de {bloque.repeticiones} repeticiones.</Text>
        {bloque.pausaSegundos > 0 ? (
          <Text style={styles.texto}>Pausa después del ensayo: {bloque.pausaSegundos} s.</Text>
        ) : null}
      </>
    );
  }

  if (bloque.tipo === 'principal') {
    return (
      <>
        <Text style={styles.dosis}>{textoDosis(bloque)}</Text>
        <Descansos ejercicio={bloque} />
      </>
    );
  }

  const dosis = bloque.dosis;
  return dosis ? (
    <Text style={styles.texto}>
      {dosis.sostenesPorLado} {dosis.sostenesPorLado === 1 ? 'sostén' : 'sostenes'}
      {dosis.lados > 1 ? ' por lado' : ''} de {dosis.cantidadPorLado} segundos.
    </Text>
  ) : (
    <Text style={styles.texto}>Tiempo estimado del bloque: {bloque.segundosEstimados} s.</Text>
  );
}

export default function VistaRutina({
  rutina,
  onVolver,
}: {
  rutina: RoutineResult;
  onVolver: () => void;
}) {
  const [mostrarSecuencia, setMostrarSecuencia] = useState(false);
  const minutos = rutina.duracion?.minutosAproximados;
  const exclusiones = rutina.entrada.excluir;
  const hayExclusiones = (exclusiones?.familias?.length ?? 0)
    + (exclusiones?.ids?.length ?? 0)
    + (exclusiones?.tags?.length ?? 0) > 0;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onVolver}
    >
      <SafeAreaProvider style={styles.fondo}>
        <SafeAreaView style={styles.pantalla}>
          <View style={styles.cabecera}>
            <Text accessibilityRole="header" style={styles.titulo}>Ver rutina</Text>
            <View style={styles.aviso}>
              <Text style={styles.textoAviso}>
                Vista previa · contenido en revisión. No disponible para entrenar.
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.contenido}
          >
            <View style={styles.tarjeta}>
              <Text accessibilityRole="header" style={styles.subtitulo}>Tu configuración</Text>
              <Text style={styles.texto}>
                Nivel: {rutina.entrada.nivel === 'P' ? 'Principiante' : 'Intermedio'}.
              </Text>
              <Text style={styles.texto}>
                Duración referencial: {rutina.entrada.duracion} min.
              </Text>
              <Text style={styles.texto}>
                Equipo: {rutina.entrada.equipo === 'PC'
                  ? 'Solo peso corporal'
                  : 'Peso corporal + una mancuerna'}.
              </Text>
              <Text style={styles.textoPequeno}>
                {minutos != null
                  ? `Duración aproximada de esta selección: ${minutos} min.`
                  : 'Estimación completa pendiente de preparación y manejo de carga.'}
              </Text>

              {hayExclusiones ? (
                <View style={styles.lista}>
                  <Text style={styles.etiqueta}>Exclusiones aplicadas</Text>
                  {exclusiones?.familias?.map((familia) => (
                    <Text key={`familia-${familia}`} style={styles.texto}>
                      • Familia: {nombreFamilia(familia)}
                    </Text>
                  ))}
                  {exclusiones?.ids?.map((id) => (
                    <Text key={`id-${id}`} style={styles.texto}>• {nombreEjercicio(id)}</Text>
                  ))}
                  {exclusiones?.tags?.map((tag) => (
                    <Text key={`tag-${tag}`} style={styles.texto}>
                      • Condición: {tag.replace(/_/g, ' ')}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            {rutina.omitidos.length > 0 || rutina.auxiliaresOmitidos.length > 0 ? (
              <View style={styles.tarjeta}>
                <Text accessibilityRole="header" style={styles.subtitulo}>Contenido omitido</Text>
                <Text style={styles.textoPequeno}>No hay una opción compatible para este contenido.</Text>
                {rutina.omitidos.map((familia) => (
                  <Text key={`omitida-${familia}`} style={styles.texto}>
                    • Familia: {nombreFamilia(familia)}
                  </Text>
                ))}
                {rutina.auxiliaresOmitidos.map((id) => (
                  <Text key={`omitido-${id}`} style={styles.texto}>
                    • Preparación o cierre: {nombresAuxiliares[id] ?? id}
                  </Text>
                ))}
              </View>
            ) : null}

            <Text accessibilityRole="header" style={styles.subtitulo}>
              Ejercicios principales · {rutina.principal.length}
            </Text>

            {rutina.principal.map((ejercicio, indice) => {
              const ensayo = rutina.secuencia.find((bloque) =>
                bloque.tipo === 'ensayo' && bloque.id === ejercicio.id);

              return (
                <View key={ejercicio.id} style={styles.tarjeta}>
                  <Text accessibilityRole="header" style={styles.subtitulo}>
                    {indice + 1}. {ejercicio.nombre}
                  </Text>
                  <Text style={styles.dosis}>{textoDosis(ejercicio)}</Text>
                  <Descansos ejercicio={ejercicio} />
                  {ensayo?.tipo === 'ensayo' ? (
                    <View style={styles.lista}>
                      <Text style={styles.textoPequeno}>
                        Preparación específica antes de este ejercicio: ensayo de {ensayo.repeticiones} repeticiones.
                      </Text>
                      {ensayo.pausaSegundos > 0 ? (
                        <Text style={styles.textoPequeno}>
                          Pausa después del ensayo: {ensayo.pausaSegundos} s.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={styles.tarjeta}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: mostrarSecuencia }}
                onPress={() => setMostrarSecuencia((abierta) => !abierta)}
                style={({ pressed }) => [styles.botonDetalle, pressed && styles.pulsado]}
              >
                <Text style={styles.textoDetalle}>
                  {mostrarSecuencia ? 'Ocultar orden completo' : 'Ver preparación, cierre y orden completo'}
                </Text>
              </Pressable>

              {mostrarSecuencia ? (
                <View style={styles.lista}>
                  <Text style={styles.textoPequeno}>
                    Los ensayos aparecen antes del ejercicio correspondiente.
                  </Text>
                  {/* Se respeta el orden original, sin separar ni reagrupar los ensayos. */}
                  {rutina.secuencia.map((bloque, indice) => (
                    <View key={`${bloque.tipo}-${indice}`} style={styles.bloqueSecuencia}>
                      <Text style={styles.etiqueta}>{indice + 1}. {tituloBloque(bloque)}</Text>
                      <DetalleBloque bloque={bloque} />
                    </View>
                  ))}
                  <Text style={styles.textoPequeno}>
                    Las transiciones se muestran de forma general; su descripción técnica sigue pendiente.
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Fuera del ScrollView para poder volver en cualquier punto de la lista. */}
          <View style={styles.pie}>
            <Pressable
              accessibilityRole="button"
              onPress={onVolver}
              style={({ pressed }) => [styles.botonVolver, pressed && styles.pulsado]}
            >
              <Text style={styles.textoBoton}>Volver a configurar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#F7F4FB' },
  pantalla: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  cabecera: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 12 },
  titulo: { fontSize: 28, fontWeight: '700', color: '#342B40' },
  aviso: { padding: 12, borderRadius: 12, backgroundColor: '#EBE2F7' },
  textoAviso: { fontSize: 14, lineHeight: 20, color: '#493064', fontWeight: '600' },
  scroll: { flex: 1 },
  contenido: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 16 },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3DCEB',
    padding: 16,
    gap: 8,
  },
  subtitulo: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: '#342B40' },
  dosis: { fontSize: 16, lineHeight: 23, fontWeight: '700', color: '#7046B5' },
  texto: { fontSize: 15, lineHeight: 22, color: '#342B40' },
  textoPequeno: { fontSize: 14, lineHeight: 21, color: '#645970' },
  etiqueta: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#342B40' },
  lista: { gap: 8, marginTop: 4 },
  bloqueSecuencia: { borderTopWidth: 1, borderTopColor: '#EBE5F1', paddingTop: 12, gap: 6 },
  botonDetalle: { minHeight: 48, justifyContent: 'center', paddingVertical: 8 },
  textoDetalle: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: '#7046B5' },
  pie: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#E3DCEB' },
  botonVolver: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, backgroundColor: '#7046B5', alignItems: 'center', justifyContent: 'center' },
  textoBoton: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  pulsado: { opacity: 0.75 },
});