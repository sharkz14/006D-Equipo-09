import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { REGLAS_CARGA } from '@/lib/carga-perfil';
import { ETIQUETA_EVITAR, TEXTO_EVITAR, type Evitar } from '@/lib/cuestionario';
import { SESIONES_PARA_AVANZAR, type Progresion } from '@/lib/sesion';
import {
    CATALOG,
    DESCANSO_AMPLIADO_S,
    type AuxiliaryBlock,
    type PrincipalBlock,
    type PrincipalExercise,
    type RoutineResult,
    type TrialBlock,
} from '@/lib/generador';
import { SOMBRA, T, TIPO } from '@/constants/tema';
import { nombreAmigable } from '@/lib/nombres';

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

/** Cambio de posición entre bloques, dicho como una indicación simple. */
const cambiosPosicion: Record<string, string> = {
  de_pie: 'Ahora te pones de pie.',
  boca_arriba: 'Ahora te acuestas de espalda en el suelo.',
  cuadrupedia: 'Ahora te pones en cuatro apoyos: manos y rodillas en el suelo.',
  lateral: 'Ahora te acuestas de lado.',
};

/** Nombres dentro de una frase («hoy no incluimos dead bug ni estiramiento de glúteo»). */
const enFraseFamilias: Record<string, string> = {
  sentadilla: 'sentadillas', split_squat: 'split squat', bisagra: 'bisagra de cadera', puente: 'puentes de cadera',
  pantorrilla: 'elevación de talones', dead_bug: 'dead bug', bird_dog: 'bird dog', plancha_lateral: 'plancha lateral',
};
const enFraseAuxiliares: Record<string, string> = {
  P01: 'marcha', P02: 'marcha y giros de hombros', C01: 'caminata', C02: 'estiramiento de glúteo',
  C03: 'estiramiento de cuádriceps',
};

/** «a», «a ni b», «a, b ni c» (o con «y» en frases afirmativas). */
function unirLista(items: string[], conector: 'y' | 'ni'): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${conector} ${items[items.length - 1]}`;
}

/** Lo que la persona marcó en «¿Hay algo que prefieras evitar?», con sus mismas palabras. */
const evitarPorEtiqueta: Record<string, string> = Object.fromEntries(
  (Object.keys(ETIQUETA_EVITAR) as Evitar[]).map((e) => [ETIQUETA_EVITAR[e], TEXTO_EVITAR[e]]),
);

function nombreFamilia(id: string): string {
  return nombresFamilias[id] ?? nombresFamiliasAuxiliares[id] ?? id.replace(/_/g, ' ');
}

function nombreEjercicio(id: string): string {
  return nombreAmigable(id, CATALOG[id]?.nombre ?? nombresAuxiliares[id] ?? id);
}

function textoDosis(ejercicio: PrincipalExercise): string {
  const { series, cantidad, unidad } = ejercicio.dosis;
  const medida = unidad === 'segundos' ? 'segundos de sostén' : 'repeticiones';
  const porLado = ejercicio.lateralidad === 'bilateral' ? '' : ' por lado';

  // Se usa la dosis del resultado: algunas plantillas cambian las series.
  return `${series} ${series === 1 ? 'serie' : 'series'} · ${cantidad} ${medida}${porLado}`;
}

/** Para la sesión completa: «2 series de 8», «2 series de 5 por lado», «2 series de 20 s por lado». */
function textoDosisCorta(ejercicio: PrincipalExercise): string {
  const { series, cantidad, unidad } = ejercicio.dosis;
  const porLado = ejercicio.lateralidad === 'bilateral' ? '' : ' por lado';
  return `${series} ${series === 1 ? 'serie' : 'series'} de ${cantidad}${unidad === 'segundos' ? ' s' : ''}${porLado}`;
}

/** Desde 1 minuto, en minutos: 180 → «3 min»; 90 → «1 min 30 s». */
function textoTiempo(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto ? `${minutos} min ${resto} s` : `${minutos} min`;
}

function Descansos({ ejercicio }: { ejercicio: PrincipalExercise }) {
  // Con una sola serie no hay descanso entre series.
  return (
    <>
      {ejercicio.dosis.series > 1 ? (
        <Text style={styles.texto}>
          Descansa {textoTiempo(ejercicio.dosis.descansoEntreSeries)} entre series.
        </Text>
      ) : null}
      {ejercicio.dosis.descansoEntreLados > 0 ? (
        <Text style={styles.texto}>
          Descansa {textoTiempo(ejercicio.dosis.descansoEntreLados)} al cambiar de lado.
        </Text>
      ) : null}
      {ejercicio.lateralidad === 'alternado' ? (
        <Text style={styles.textoPequeno}>Alterna los lados.</Text>
      ) : null}
    </>
  );
}

// Cupos donde participa un modelo entrenado; en ellos se muestra el origen de la selección.
const familiasConModelo = new Set(['puente', 'dead_bug']);

/** Qué cambió la IA respecto de la dosis habitual, en palabras simples. La dosis de arriba ya es la ajustada. */
function textoAjusteIA(ejercicio: PrincipalExercise,
  ajuste: NonNullable<PrincipalExercise['seleccion']['ajusteDosis']>): string | null {
  const segundos = ejercicio.dosis.unidad === 'segundos';
  const menos = ajuste.intensidad === 'reducida'
    ? (segundos ? 'un sostén más corto que lo habitual' : 'menos repeticiones que lo habitual')
    : ajuste.intensidad === 'minima'
      ? (segundos ? 'cerca de la mitad del tiempo habitual' : 'cerca de la mitad de las repeticiones habituales')
      : null;
  // Con una sola serie no hay descanso entre series.
  const descanso = ajuste.descanso === 'ampliado' && ejercicio.dosis.series > 1
    ? `${DESCANSO_AMPLIADO_S} s más de descanso entre series` : null;
  if (menos && descanso) return `La IA te dejó ${menos} y ${descanso}.`;
  if (menos) return `La IA te dejó ${menos}.`;
  return descanso ? `La IA te dio ${descanso}.` : null;
}

function OrigenSeleccion({ ejercicio, modoPrueba }: { ejercicio: PrincipalExercise; modoPrueba: boolean }) {
  const { seleccion } = ejercicio;
  const ia = seleccion.origen === 'ia';
  // En modo de prueba la «razón» es simulada: no aporta y confunde.
  if (ia && modoPrueba) return null;
  const modelo = seleccion.origen === 'modelo';
  if (!ia && !modelo && !familiasConModelo.has(ejercicio.familia)) return null;
  const ajuste = seleccion.ajusteDosis;
  const ajustado = ajuste ? textoAjusteIA(ejercicio, ajuste) : null;
  return (
    <View style={[styles.origen, (ia || modelo) && styles.origenModelo]}>
      <Text style={styles.etiqueta}>
        {ia ? 'Por qué lo eligió la IA'
          : modelo ? `Elegido por el modelo ${seleccion.modeloId ?? ''}`.trim()
            : seleccion.origen === 'manual' ? 'Elegido manualmente' : 'Selección habitual'}
      </Text>
      <Text style={styles.textoPequeno}>{seleccion.motivo}</Text>
      {ajustado ? <Text style={styles.textoAjuste}>{ajustado}</Text> : null}
    </View>
  );
}

/** Qué bajó el tope por edad o peso en este ejercicio. */
function AjustePerfil({ ejercicio }: { ejercicio: PrincipalExercise }) {
  const ajuste = ejercicio.ajustePerfil;
  if (!ajuste) return null;
  const textos = {
    series: `${ejercicio.dosis.series} ${ejercicio.dosis.series === 1 ? 'serie' : 'series'}`,
    intensidad: ejercicio.dosis.unidad === 'segundos' ? 'sostén más corto' : 'menos repeticiones',
    descanso: 'más descanso',
  };
  return (
    <View style={styles.origen}>
      <Text style={styles.etiqueta}>Ajustado a tu perfil</Text>
      <Text style={styles.textoPequeno}>{ajuste.cambios.map((c) => textos[c]).join(' · ')}.</Text>
    </View>
  );
}

/** Qué no entra en la rutina y por qué, en una frase. */
function textoOmitidos(rutina: RoutineResult): string {
  const nombres = [
    ...rutina.omitidos.map((f) => enFraseFamilias[f] ?? nombreFamilia(f).toLowerCase()),
    ...rutina.auxiliaresOmitidos.map((id) => enFraseAuxiliares[id] ?? (nombresAuxiliares[id] ?? id).toLowerCase()),
  ];
  const evitar = (rutina.entrada.excluir?.tags ?? [])
    .map((tag) => evitarPorEtiqueta[tag]?.toLowerCase())
    .filter((x): x is string => Boolean(x));
  return evitar.length
    ? `Como prefieres evitar ${unirLista(evitar, 'y')}, hoy no incluimos ${unirLista(nombres, 'ni')}.`
    : `Hoy no incluimos ${unirLista(nombres, 'ni')}, porque no hay una opción compatible con tu sesión.`;
}

type ParteSesion = 'inicio' | 'ejercicios' | 'cierre';
type ItemSesion =
  | { tipo: 'posicion'; texto: string }
  | { tipo: 'auxiliar'; bloque: AuxiliaryBlock }
  | { tipo: 'principal'; bloque: PrincipalBlock; numero: number; prueba: TrialBlock | null };

const TITULOS_PARTE: Record<ParteSesion, string> = {
  inicio: 'Para empezar', ejercicios: 'Ejercicios', cierre: 'Para terminar',
};

/**
 * La sesión en tres partes, en el mismo orden que la sesión guiada. Las transiciones sin cambio de posición no se
 * muestran; las demás pasan a ser una indicación simple. La prueba suave (ensayo) va junto a su ejercicio.
 */
function partesDeLaSesion(rutina: RoutineResult): Record<ParteSesion, ItemSesion[]> {
  const partes: Record<ParteSesion, ItemSesion[]> = { inicio: [], ejercicios: [], cierre: [] };
  let cambio: string | null = null;
  let prueba: TrialBlock | null = null;
  for (const bloque of rutina.secuencia) {
    if (bloque.tipo === 'transicion') {
      if (bloque.desde !== bloque.hacia) cambio = cambiosPosicion[bloque.hacia] ?? `Ahora cambias de posición.`;
      continue;
    }
    const parte: ParteSesion = bloque.tipo === 'auxiliar'
      ? (bloque.fase === 'preparacion' ? 'inicio' : 'cierre')
      : 'ejercicios';
    if (cambio) {
      partes[parte].push({ tipo: 'posicion', texto: cambio });
      cambio = null;
    }
    if (bloque.tipo === 'ensayo') {
      prueba = bloque;
    } else if (bloque.tipo === 'principal') {
      partes.ejercicios.push({
        tipo: 'principal', bloque, numero: rutina.principal.findIndex((x) => x.id === bloque.id) + 1,
        prueba: prueba?.id === bloque.id ? prueba : null,
      });
      prueba = null;
    } else {
      partes[parte].push({ tipo: 'auxiliar', bloque });
    }
  }
  return partes;
}

function textoAuxiliar(bloque: AuxiliaryBlock): string {
  const nombre = nombreAmigable(bloque.id, nombresAuxiliares[bloque.id] ?? bloque.id);
  const dosis = bloque.dosis;
  if (!dosis) return `${nombre} · ${textoTiempo(bloque.segundosEstimados)}`;
  const veces = `${dosis.sostenesPorLado} ${dosis.sostenesPorLado === 1 ? 'vez' : 'veces'}`;
  const cada = dosis.sostenesPorLado === 1 ? '' : ' cada una';
  return `${nombre} · ${veces}${dosis.lados > 1 ? ' por lado' : ''}, ${dosis.cantidadPorLado} s${cada}`;
}

function FilaSesion({ item }: { item: ItemSesion }) {
  if (item.tipo === 'posicion') return <Text style={styles.notaPosicion}>{item.texto}</Text>;
  if (item.tipo === 'auxiliar') return <Text style={styles.texto}>{textoAuxiliar(item.bloque)}</Text>;
  return (
    <View style={styles.filaEjercicio}>
      <Text style={styles.texto}>
        {item.numero}. {nombreAmigable(item.bloque.id, item.bloque.nombre)} · <Text style={styles.dosisCorta}>{textoDosisCorta(item.bloque)}</Text>
      </Text>
      {item.prueba ? (
        <Text style={styles.textoPequeno}>Antes, una prueba suave de {item.prueba.repeticiones} repeticiones.</Text>
      ) : null}
    </View>
  );
}

export default function VistaRutina({
  rutina,
  resumenIA,
  modoPrueba = false,
  onVolver,
  onEmpezar,
  avances = [],
}: {
  rutina: RoutineResult;
  resumenIA?: string | null;
  /** IA simulada (pruebas): se muestra una sola etiqueta «Modo de prueba» en vez del resumen. */
  modoPrueba?: boolean;
  /** Variantes exigentes que entraron por la regla de progresión. */
  avances?: Progresion[];
  onVolver: () => void;
  /** Abre la sesión guiada. Sin esta función, la rutina es solo una vista previa. */
  onEmpezar?: () => void;
}) {
  const [mostrarSecuencia, setMostrarSecuencia] = useState(false);
  const partes = partesDeLaSesion(rutina);
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
            <View style={styles.filaTitulo}>
              <Text accessibilityRole="header" style={styles.titulo}>Tu rutina</Text>
              {modoPrueba ? (
                <View style={styles.chipPrueba}><Text style={styles.textoChipPrueba}>Modo de prueba</Text></View>
              ) : null}
            </View>
            <View style={styles.aviso}>
              <Text style={styles.textoAviso}>
                {onEmpezar
                  ? 'Prototipo académico · instrucciones y dosis en revisión. Si aparece dolor, detente.'
                  : 'Vista previa · contenido en revisión. No disponible para entrenar.'}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.contenido}
          >
            <Text accessibilityRole="header" style={styles.subtitulo}>
              Tus ejercicios · {rutina.principal.length}
            </Text>

            {rutina.principal.map((ejercicio, indice) => {
              const ensayo = rutina.secuencia.find((bloque) =>
                bloque.tipo === 'ensayo' && bloque.id === ejercicio.id);

              return (
                <View key={ejercicio.id} style={styles.tarjeta}>
                  <Text accessibilityRole="header" style={styles.subtitulo}>
                    {indice + 1}. {nombreAmigable(ejercicio.id, ejercicio.nombre)}
                  </Text>
                  <Text style={styles.dosis}>{textoDosis(ejercicio)}</Text>
                  <Descansos ejercicio={ejercicio} />
                  {avances.some((a) => a.exigente === ejercicio.id) ? (
                    <View style={[styles.origen, styles.origenModelo]}>
                      <Text style={styles.etiqueta}>Nueva variante · avance</Text>
                      <Text style={styles.textoPequeno}>
                        Reemplaza a la versión básica porque la dominaste en tus últimas sesiones.
                      </Text>
                    </View>
                  ) : null}
                  <OrigenSeleccion ejercicio={ejercicio} modoPrueba={modoPrueba} />
                  <AjustePerfil ejercicio={ejercicio} />
                  {ensayo?.tipo === 'ensayo' ? (
                    <View style={styles.lista}>
                      <Text style={styles.textoPequeno}>
                        Antes de este ejercicio, haz una prueba suave de {ensayo.repeticiones} repeticiones
                        {ensayo.pausaSegundos > 0 ? ` y descansa ${textoTiempo(ensayo.pausaSegundos)}` : ''}.
                      </Text>
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
                  {mostrarSecuencia ? 'Ocultar la sesión completa' : 'Ver la sesión completa'}
                </Text>
              </Pressable>

              {mostrarSecuencia ? (
                <View style={styles.lista}>
                  {(['inicio', 'ejercicios', 'cierre'] as const).map((parte) => partes[parte].length ? (
                    <View key={parte} style={styles.bloqueSecuencia}>
                      <Text accessibilityRole="header" style={styles.etiqueta}>{TITULOS_PARTE[parte]}</Text>
                      {partes[parte].map((item, i) => <FilaSesion key={`${parte}-${i}`} item={item} />)}
                    </View>
                  ) : null)}
                </View>
              ) : null}
            </View>
            <View style={styles.tarjeta}>
              <Text accessibilityRole="header" style={styles.subtitulo}>Tu sesión</Text>
              <Text style={styles.texto}>
                {rutina.entrada.nivel === 'P' ? 'Principiante' : 'Intermedio'} · {rutina.entrada.duracion} min ·{' '}
                {rutina.entrada.equipo === 'PC' ? 'Solo peso corporal' : 'Peso corporal + una mancuerna'}
              </Text>
              <Text style={styles.textoPequeno}>
                {minutos != null
                  ? `Dura unos ${minutos} min.`
                  : 'La duración puede variar según tu ritmo.'}
              </Text>

              {avances.length ? (
                <View style={styles.lista}>
                  <Text style={styles.etiqueta}>Avance por tus últimas sesiones</Text>
                  <Text style={styles.texto}>
                    Tus {SESIONES_PARA_AVANZAR} últimas sesiones fueron fáciles y completas: pasas{' '}
                    {avances.map((a) => `al ${a.nombre.replace(/^el /, '')}`).join(' y ')}.
                  </Text>
                </View>
              ) : null}

              {rutina.cargaPerfil?.reglas.length ? (
                <View style={styles.lista}>
                  <Text style={styles.etiqueta}>Ajustes por tu perfil</Text>
                  {rutina.cargaPerfil.reglas.map((id) => (
                    <Text key={`carga-${id}`} style={styles.texto}>• {REGLAS_CARGA[id].texto}</Text>
                  ))}
                  <Text style={styles.textoPequeno}>
                    Son límites de carga: Kinetia los aplica siempre y la IA no puede superarlos.
                  </Text>
                </View>
              ) : null}

              {hayExclusiones ? (
                <View style={styles.lista}>
                  <Text style={styles.etiqueta}>Lo que prefieres evitar</Text>
                  {exclusiones?.familias?.map((familia) => (
                    <Text key={`familia-${familia}`} style={styles.texto}>
                      • {nombreFamilia(familia)}
                    </Text>
                  ))}
                  {exclusiones?.ids?.map((id) => (
                    <Text key={`id-${id}`} style={styles.texto}>• {nombreEjercicio(id)}</Text>
                  ))}
                  {exclusiones?.tags?.map((tag) => (
                    <Text key={`tag-${tag}`} style={styles.texto}>
                      • {evitarPorEtiqueta[tag] ?? tag.replace(/_/g, ' ')}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            {resumenIA && !modoPrueba ? (
              <View style={[styles.tarjeta, styles.tarjetaIA]}>
                <Text accessibilityRole="header" style={styles.subtitulo}>Cómo la armó la IA</Text>
                <Text style={styles.texto}>{resumenIA}</Text>
                <Text style={styles.textoPequeno}>
                  La IA eligió entre variantes compatibles y Kinetia comprobó cada ejercicio y dosis.
                </Text>
              </View>
            ) : null}

            {rutina.omitidos.length > 0 || rutina.auxiliaresOmitidos.length > 0 ? (
              <View style={styles.tarjeta}>
                <Text accessibilityRole="header" style={styles.subtitulo}>Lo que no entra hoy</Text>
                <Text style={styles.texto}>{textoOmitidos(rutina)}</Text>
              </View>
            ) : null}

          </ScrollView>

          {/* Fuera del ScrollView para poder volver en cualquier punto de la lista. */}
          <View style={[styles.pie, styles.filaPie]}>
            <Pressable
              accessibilityRole="button"
              onPress={onVolver}
              style={({ pressed }) => [onEmpezar ? styles.botonSecundario : styles.botonVolver, styles.flex,
                pressed && styles.pulsado]}
            >
              <Text style={onEmpezar ? styles.textoSecundario : styles.textoBoton}>
                {onEmpezar ? 'Volver' : 'Volver a configurar'}
              </Text>
            </Pressable>
            {onEmpezar ? (
              <Pressable
                accessibilityRole="button"
                onPress={onEmpezar}
                style={({ pressed }) => [styles.botonVolver, styles.botonEntrenar, styles.flexDoble, pressed && styles.pulsado]}
              >
                <Text style={[styles.textoBoton, styles.textoEntrenar]}>Empezar sesión</Text>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: T.fondo },
  pantalla: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  cabecera: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 12 },
  titulo: { ...TIPO.tituloPantalla, color: T.texto },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  chipPrueba: { backgroundColor: T.superficieAlta, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  textoChipPrueba: { ...TIPO.apoyo, fontWeight: '600', color: T.suave },
  aviso: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: T.acentoSuave },
  textoAviso: { ...TIPO.apoyo, color: T.acentoTexto, fontWeight: '500' },
  scroll: { flex: 1 },
  contenido: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 16 },
  tarjeta: {
    backgroundColor: T.superficie,
    borderRadius: 22,
    padding: 18,
    gap: 8,
    ...SOMBRA,
  },
  subtitulo: { ...TIPO.tituloTarjeta, color: T.texto },
  dosis: { ...TIPO.cuerpo, fontWeight: '600', color: T.acentoTexto },
  texto: { ...TIPO.cuerpo, color: T.texto },
  textoPequeno: { ...TIPO.apoyo, color: T.suave },
  etiqueta: { ...TIPO.cuerpo, fontWeight: '600', color: T.texto },
  lista: { gap: 8, marginTop: 4 },
  origen: { gap: 2, marginTop: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: T.superficieAlta },
  origenModelo: { backgroundColor: T.acentoSuave },
  tarjetaIA: {},
  bloqueSecuencia: { borderTopWidth: 1, borderTopColor: T.borde, paddingTop: 12, gap: 8 },
  filaEjercicio: { gap: 2 },
  dosisCorta: { fontWeight: '600', color: T.acentoTexto },
  textoAjuste: { fontSize: 14, lineHeight: 21, color: T.suave, fontStyle: 'italic' },
  notaPosicion: { fontSize: 14, lineHeight: 21, color: T.suave, fontStyle: 'italic', paddingLeft: 12 },
  botonDetalle: { minHeight: 48, justifyContent: 'center', paddingVertical: 8 },
  textoDetalle: { ...TIPO.cuerpo, fontWeight: '600', color: T.acentoTexto },
  pie: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: T.borde },
  botonVolver: { minHeight: 50, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 16, backgroundColor: T.acento, alignItems: 'center', justifyContent: 'center' },
  textoBoton: { ...TIPO.boton, color: T.sobreAcento, textAlign: 'center' },
  // Acciones de entrenamiento en celeste, con texto oscuro (8,8:1); el blanco sobre celeste no se leería bien.
  botonEntrenar: { backgroundColor: T.celeste },
  textoEntrenar: { color: T.sobreCeleste, fontWeight: '700' },
  filaPie: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  flexDoble: { flex: 2 },
  botonSecundario: { minHeight: 50, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 16, borderWidth: 1.5, borderColor: T.acento, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  textoSecundario: { ...TIPO.boton, color: T.acentoTexto, textAlign: 'center' },
  pulsado: { opacity: 0.75 },
});