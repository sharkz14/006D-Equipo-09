import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { alerta } from '@/components/alerta';
import CuestionarioInicial from '@/components/cuestionario-inicial';
import { usePerfil } from '@/components/perfil-provider';
import SesionGuiada from '@/components/sesion-guiada';
import Marca from '@/components/marca';
import VistaRutina from '@/components/vista-rutina';
import { Aparecer } from '@/components/movimiento';
import { SOMBRA, T, TIPO } from '@/constants/tema';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import {
  TEXTO_EVITAR, antecedentesParaIA, equipoInicial, etiquetasEvitar, type Evitar,
} from '@/lib/cuestionario';
import { generateRoutine, type GeneratorInput, type RoutineResult } from '@/lib/generador';
import { avancesAplicables, generarRutinaConIA } from '@/lib/ia/rutina-ia';
import {
  SESIONES_PARA_AVANZAR, antecedentesUltimaSesion, progresionesListas, progresionesProximas,
  textoUltimaSesion, type Progresion, type RegistroSesion,
} from '@/lib/sesion';

// Servicio de IA: se configura en .env.local (ver .env.example). Sin URL, la app usa la rutina por reglas.
// Expo reemplaza estas referencias al compilar; deben escribirse así, sin desestructurar.
const IA_URL = process.env.EXPO_PUBLIC_KINETIA_IA_URL;
const IA_TOKEN = process.env.EXPO_PUBLIC_KINETIA_IA_TOKEN;
// Versión de demostración (web publicada): muestra las fichas en borrador, igual que en Expo Go.
const DEMO = process.env.EXPO_PUBLIC_KINETIA_DEMO === '1';

const NIVEL = { P: 'Principiante', I: 'Intermedio' } as const;
const EQUIPO = { PC: 'Peso corporal', M1: 'Con una mancuerna' } as const;
const FECHA = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
const FAMILIA: Record<string, string> = { puente: 'del puente', dead_bug: 'del dead bug' };

function lunesDeEstaSemana(ahora = new Date()): Date {
  const lunes = new Date(ahora);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  return lunes;
}

function Segmentos<T extends string | number>({ valor, opciones, onChange, etiqueta }: {
  valor: T; opciones: readonly { valor: T; texto: string }[]; onChange: (v: T) => void; etiqueta: string;
}) {
  return (
    <View style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      {opciones.map((o) => {
        const elegida = valor === o.valor;
        return (
          <Pressable
            key={String(o.valor)}
            onPress={() => onChange(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: elegida }}
            style={[styles.segmento, elegida && styles.segmentoElegido]}
          >
            <Text style={[styles.textoSegmento, elegida && styles.textoSegmentoElegido]}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Casilla({ marcada, onPress, texto, etiqueta }: {
  marcada: boolean; onPress: () => void; texto: string; etiqueta: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={etiqueta}
      accessibilityState={{ checked: marcada }} style={[styles.casilla, marcada && styles.casillaMarcada]}>
      <View style={[styles.cuadro, marcada && styles.cuadroMarcado]}>
        {marcada ? <Text style={styles.visto}>✓</Text> : null}
      </View>
      <Text style={styles.textoCasilla}>{texto}</Text>
    </Pressable>
  );
}

/** Semana de lunes a domingo: los días con sesión llevan ✓ y hoy, un borde. */
function Semana({ recientes }: { recientes: readonly RegistroSesion[] }) {
  const lunes = lunesDeEstaSemana();
  const entrenados = new Set(recientes.map((r) => new Date(r.fecha)).filter((f) => f >= lunes)
    .map((f) => (f.getDay() + 6) % 7));
  const hoy = (new Date().getDay() + 6) % 7;
  return (
    <View style={styles.semana} accessible
      accessibilityLabel={`Esta semana entrenaste ${entrenados.size} ${entrenados.size === 1 ? 'día' : 'días'}`}>
      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((letra, i) => (
        <View key={i} style={styles.dia}>
          <Text style={styles.letraDia}>{letra}</Text>
          <View style={[styles.puntoDia, i === hoy && styles.diaHoy, entrenados.has(i) && styles.diaEntrenado]}>
            {entrenados.has(i) ? <Text style={styles.vistoDia}>✓</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Curvas inclinadas de la portada: un guiño al movimiento del baile. */
function Curvas() {
  return (
    <View pointerEvents="none" style={styles.curvas}>
      {['#9F86F2', '#7A5BE3', '#5A3DB8'].map((color, i) => (
        <View key={color} style={[styles.curva, { borderColor: color, right: -112 + i * 26, top: -70 + i * 20 }]} />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const {
    perfil, cuestionario, cargando, guardando, error: errorPerfil, recargar,
    ultimaSesion, sesionesRecientes, registrarSesion, ejerciciosHechos,
  } = usePerfil();

  // Sesión de hoy: parte desde el cuestionario y se puede cambiar sin tocar el perfil.
  const [nivel, setNivel] = useState<'P' | 'I'>('P');
  const [duracion, setDuracion] = useState<20 | 30 | 40>(20);
  const [equipo, setEquipo] = useState<'PC' | 'M1'>('PC');
  const [evitar, setEvitar] = useState<Evitar[]>([]);
  const [mostrarEvitar, setMostrarEvitar] = useState(false);

  // null muestra Configurar; un resultado abre la vista previa.
  const [rutina, setRutina] = useState<RoutineResult | null>(null);
  const [resumenIA, setResumenIA] = useState<string | null>(null);
  const [modeloIA, setModeloIA] = useState<string | null>(null);
  // «Preparar mi rutina»: ajustes de hoy y las dos confirmaciones, antes de generar.
  const [preparando, setPreparando] = useState(false);
  const [mostrarProgresion, setMostrarProgresion] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [sesionActiva, setSesionActiva] = useState(false);
  const [avances, setAvances] = useState<Progresion[]>([]);
  const [editandoCuestionario, setEditandoCuestionario] = useState(false);

  // Las confirmaciones comienzan sin marcar en cada sesión: el estado puede cambiar de un día a otro.
  // La edad no se pregunta aquí: el perfil ya exige 18 años o más.
  const [sinLimitaciones, setSinLimitaciones] = useState(false);
  const [aceptaAlcance, setAceptaAlcance] = useState(false);

  const listo = !cargando && !errorPerfil;
  const cuestionarioPendiente = listo && (!perfil || !cuestionario);
  // Solo un perfil leído correctamente permite continuar.
  const perfilDisponible = listo && !guardando && perfil !== null && cuestionario !== null && perfil.edad >= 18;
  const filtroSuperado = perfilDisponible && sinLimitaciones && aceptaAlcance;

  // Guardar el perfil o el cuestionario reinicia la sesión con los valores guardados.
  useEffect(() => {
    setNivel(perfil?.nivel ?? 'P');
    setDuracion(cuestionario?.duracion ?? 20);
    setEquipo(cuestionario ? equipoInicial(cuestionario) : 'PC');
    setEvitar(cuestionario?.evitar ?? []);
    setRutina(null);
    setSesionActiva(false);
    setPreparando(false);
    setSinLimitaciones(false);
    setAceptaAlcance(false);
  }, [perfil, cuestionario]);

  const nombreCorto = perfil?.nombre.trim().split(/\s+/)[0] ?? '';
  const hoy = FECHA.format(new Date());
  const textoEvitar = evitar.length ? evitar.map((e) => TEXTO_EVITAR[e].toLowerCase()).join(', ') : 'nada en particular';

  // Progresión: dos sesiones fáciles y completas seguidas. Solo con IA; se muestra si cabe en la sesión elegida.
  const avancesListos = progresionesListas(sesionesRecientes);
  const segunSesion = (lista: Progresion[]) => (IA_URL && perfil && lista.length
    ? avancesAplicables({ nivel, duracion, equipo, filtroSuperado: true, modo: __DEV__ || DEMO ? 'borrador' : 'app',
      excluir: { ids: [], familias: [], tags: etiquetasEvitar(evitar) } },
    { edad: perfil.edad, pesoKg: perfil.pesoKg, estaturaCm: perfil.estaturaCm, nivel: perfil.nivel }, lista)
    : []);
  const avancesHoy = segunSesion(avancesListos);
  // A una sesión fácil de avanzar: se avisa para que la persona sepa qué viene.
  const avancesProximos = avancesHoy.length ? [] : segunSesion(progresionesProximas(sesionesRecientes));
  const nombresAvance = (lista: Progresion[]) => lista.map((a) => `al ${a.nombre.replace(/^el /, '')}`).join(' y ');

  async function verRutina() {
    if (!filtroSuperado || !perfil || !cuestionario || generando) return;

    const entrada: GeneratorInput = {
      nivel,
      duracion,
      equipo,
      filtroSuperado,
      excluir: { ids: [], familias: [], tags: etiquetasEvitar(evitar) },
      // Edad, peso y estatura fijan topes de carga, con o sin IA.
      perfilCarga: { edad: perfil.edad, pesoKg: perfil.pesoKg, estaturaCm: perfil.estaturaCm },
      // Expo Go permite revisar borradores. Una app publicada exige
      // contenido habilitado; este modo no es una opción del formulario.
      modo: __DEV__ || DEMO ? 'borrador' : 'app',
    };

    // Con el servicio configurado, la IA genera la rutina y el motor la valida.
    // Ante cualquier problema se muestra la rutina por reglas con el motivo.
    if (IA_URL) {
      setGenerando(true);
      try {
        const generada = await generarRutinaConIA(entrada,
          { edad: perfil.edad, pesoKg: perfil.pesoKg, estaturaCm: perfil.estaturaCm, nivel: perfil.nivel },
          { url: IA_URL, token: IA_TOKEN }, {
            ...antecedentesParaIA(cuestionario),
            // Cómo le fue en la última sesión: la IA ajusta la próxima.
            ...(ultimaSesion ? { ultima_sesion: antecedentesUltimaSesion(ultimaSesion) } : {}),
          }, avancesListos);
        if (generada.rutina.principal.length === 0) {
          setRutina(null);
          alerta('No se pudo generar una rutina', generada.rutina.mensajes.join('\n') ||
            'Con estas opciones no quedan ejercicios principales compatibles.');
        } else if (generada.origen === 'ia') {
          setResumenIA(generada.resumen);
          setModeloIA(generada.modelo);
          setAvances(generada.avances);
          setRutina(generada.rutina);
        } else {
          setResumenIA(null);
          setModeloIA(null);
          setAvances([]);
          alerta('Se usó la rutina habitual', generada.aviso, [
            { text: 'Volver', style: 'cancel' },
            { text: 'Ver rutina', onPress: () => setRutina(generada.rutina) },
          ]);
        }
      } finally {
        setGenerando(false);
      }
      return;
    }

    setResumenIA(null);
    setModeloIA(null);
    setAvances([]);
    const resultado = generateRoutine(entrada);
    if (resultado.principal.length === 0) {
      setRutina(null);
      const mensaje = resultado.estado === 'sin_principal'
        ? (__DEV__ || DEMO
          ? 'Con estas opciones no quedan ejercicios principales compatibles. Revisa lo que prefieres evitar.'
          : 'El contenido sigue en revisión y todavía no hay ejercicios habilitados.')
        : resultado.mensajes.join('\n');
      alerta('No se pudo generar una rutina', mensaje);
      return;
    }
    setRutina(resultado);
  }

  const lunes = lunesDeEstaSemana();
  const completasSemana = sesionesRecientes.filter((r) => r.completada && new Date(r.fecha) >= lunes).length;
  const listaAvance = avancesHoy.length ? avancesHoy : avancesProximos;
  const tituloAvance = `Progresión ${[...new Set(listaAvance.map((a) => FAMILIA[a.familia] ?? 'del ejercicio'))].join(' y ')}`;

  function salirDeLaSesion() {
    setSesionActiva(false);
    setRutina(null);
    setPreparando(false);
    // Las confirmaciones vuelven a empezar sin marcar en la próxima sesión.
    setSinLimitaciones(false);
    setAceptaAlcance(false);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.encabezado}>
            <Marca />
            <Text style={styles.fecha}>{hoy.charAt(0).toUpperCase() + hoy.slice(1).replace(/\./g, '')}</Text>
          </View>
          <Aparecer>
            <Text style={styles.titulo} accessibilityRole="header">
              {nombreCorto ? `Hola, ${nombreCorto}` : 'Hola'}
            </Text>
          </Aparecer>

          {cargando ? (
            <ActivityIndicator color={T.acento} />
          ) : errorPerfil ? (
            <View style={styles.tarjeta}>
              <Text style={styles.texto} accessibilityRole="alert">{errorPerfil}</Text>
              <Pressable style={styles.opcion} accessibilityRole="button" onPress={() => { void recargar(); }}>
                <Text style={styles.textoOpcion}>Reintentar</Text>
              </Pressable>
            </View>
          ) : cuestionarioPendiente ? (
            <View style={styles.tarjeta}>
              <Text style={styles.subtitulo}>Empecemos por conocerte</Text>
              <Text style={styles.texto}>Responde unas preguntas rápidas para armar rutinas a tu medida.</Text>
              <Pressable style={[styles.botonPrincipal, styles.botonEntrenar]} accessibilityRole="button"
                onPress={() => setEditandoCuestionario(true)}>
                <Text style={[styles.textoBoton, styles.textoEntrenar]}>Comenzar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Aparecer orden={1}>
                <View style={styles.portada}>
                  <Curvas />
                  <Text style={styles.portadaEtiqueta}>Tu sesión de hoy</Text>
                  <View style={styles.filaNumero}>
                    <Text style={styles.numeroGrande}>{duracion}</Text>
                    <Text style={styles.unidad}>min</Text>
                  </View>
                  <Text style={styles.portadaTexto}>{NIVEL[nivel]} · {EQUIPO[equipo]}</Text>
                  {avancesHoy.length ? (
                    <View style={styles.pastilla}>
                      <Text style={styles.textoPastilla}>Hoy avanzas {nombresAvance(avancesHoy)}</Text>
                    </View>
                  ) : null}
                  <Pressable style={styles.botonPortada} accessibilityRole="button" onPress={() => setPreparando(true)}>
                    <Text style={styles.textoBotonPortada}>Preparar mi rutina</Text>
                    <Text style={styles.flecha}>→</Text>
                  </Pressable>
                </View>
              </Aparecer>

              <Aparecer orden={2} style={styles.seccion}>
                <Text style={styles.subtitulo} accessibilityRole="header">Tu semana</Text>
                <Text style={styles.ayuda}>
                  {completasSemana
                    ? `${completasSemana} ${completasSemana === 1 ? 'sesión completada' : 'sesiones completadas'}`
                    : 'Todavía no entrenas esta semana'}
                </Text>
                <Semana recientes={sesionesRecientes} />
              </Aparecer>

              {listaAvance.length ? (
                <Aparecer orden={3}>
                  <View style={styles.separador} />
                  <Pressable style={styles.filaProgresion} accessibilityRole="button"
                    accessibilityState={{ expanded: mostrarProgresion }} onPress={() => setMostrarProgresion((v) => !v)}>
                    <Text style={styles.tituloProgresion}>{tituloAvance}</Text>
                    <Text style={styles.cuentaProgresion}>
                      {avancesHoy.length ? SESIONES_PARA_AVANZAR : SESIONES_PARA_AVANZAR - 1} de {SESIONES_PARA_AVANZAR}
                      {'  '}{mostrarProgresion ? '⌃' : '⌄'}
                    </Text>
                  </Pressable>
                  {mostrarProgresion ? (
                    <Text style={styles.texto}>
                      {avancesHoy.length
                        ? `Dos sesiones seguidas completas, sin molestias y fáciles: hoy avanzas ${nombresAvance(avancesHoy)}.`
                        : `Si la próxima sesión también es completa, sin molestias y te resulta fácil, avanzas ${nombresAvance(avancesProximos)}.`}
                    </Text>
                  ) : null}
                </Aparecer>
              ) : null}

              {ultimaSesion ? (
                <Text style={styles.ayudaPie}>Última sesión: {textoUltimaSesion(ultimaSesion).toLowerCase()}.</Text>
              ) : null}

              <Pressable style={styles.enlace} accessibilityRole="button" onPress={() => setEditandoCuestionario(true)}>
                <Text style={styles.enlaceTexto}>Actualizar mis respuestas</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Preparar: ajustes de hoy y confirmaciones. La rutina no se genera hasta marcar las dos. */}
      <Modal visible={preparando && perfilDisponible} animationType="slide" presentationStyle="fullScreen"
        onRequestClose={() => setPreparando(false)}>
        <SafeAreaProvider style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.barraPreparar}>
              <Pressable onPress={() => setPreparando(false)} accessibilityRole="button" hitSlop={12} style={styles.botonAtras}>
                <Text style={styles.enlaceTexto}>‹ Volver</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentPreparar}>
              <Text style={styles.titulo} accessibilityRole="header">Prepara tu sesión</Text>
              <View style={styles.tarjeta}>
                <Text style={styles.subtitulo} accessibilityRole="header">Ajusta tu sesión</Text>
                <Text style={styles.ayuda}>Viene de tus respuestas. Cámbiala si hoy es distinto.</Text>
                <Segmentos etiqueta="Nivel" valor={nivel} onChange={setNivel}
                  opciones={[{ valor: 'P', texto: 'Principiante' }, { valor: 'I', texto: 'Intermedio' }]} />
                <Segmentos etiqueta="Duración" valor={duracion} onChange={setDuracion}
                  opciones={[{ valor: 20, texto: '20 min' }, { valor: 30, texto: '30 min' }, { valor: 40, texto: '40 min' }]} />
                <Segmentos etiqueta="Equipo" valor={equipo} onChange={setEquipo}
                  opciones={[{ valor: 'PC', texto: 'Peso corporal' }, { valor: 'M1', texto: '+ Mancuerna' }]} />
                <Pressable onPress={() => setMostrarEvitar((v) => !v)} accessibilityRole="button"
                  accessibilityState={{ expanded: mostrarEvitar }} style={styles.filaEvitar}>
                  <Text style={styles.texto}>Evitas: {textoEvitar}</Text>
                  <Text style={styles.enlaceTexto}>{mostrarEvitar ? 'Listo' : 'Cambiar'}</Text>
                </Pressable>
                {mostrarEvitar ? (Object.keys(TEXTO_EVITAR) as Evitar[]).map((e) => {
                  const marcada = evitar.includes(e);
                  return (
                    <Casilla key={e} marcada={marcada} texto={TEXTO_EVITAR[e]} etiqueta={`Evitar ${TEXTO_EVITAR[e]}`}
                      onPress={() => setEvitar((a) => (marcada ? a.filter((x) => x !== e) : [...a, e]))} />
                  );
                }) : null}
              </View>

              <View style={styles.tarjeta}>
                <Text style={styles.subtitulo} accessibilityRole="header">Antes de empezar</Text>
                <Text style={styles.ayuda}>Marca únicamente lo que sea cierto hoy.</Text>
                {ultimaSesion?.dolor ? (
                  <Text style={styles.alerta} accessibilityRole="alert">
                    En tu última sesión sentiste dolor o molestias. Si todavía lo sientes, hoy no entrenes y consulta
                    a un profesional de la salud.
                  </Text>
                ) : null}
                <Casilla
                  marcada={sinLimitaciones}
                  onPress={() => setSinLimitaciones((valor) => !valor)}
                  etiqueta="Confirmo que no tengo dolor ni una lesión que limite el movimiento y que no estoy en recuperación clínica. Si aparece dolor durante la sesión, me comprometo a detenerla."
                  texto="No tengo dolor ni una lesión que limite el movimiento, y no estoy en recuperación clínica. Si aparece dolor durante la sesión, me comprometo a detenerla."
                />
                <Casilla
                  marcada={aceptaAlcance}
                  onPress={() => setAceptaAlcance((valor) => !valor)}
                  etiqueta="Entiendo que Kinetia no enseña pasos ni evalúa mi técnica, y no ofrece diagnóstico ni rehabilitación"
                  texto="Entiendo que Kinetia no enseña pasos ni evalúa mi técnica, y no ofrece diagnóstico ni rehabilitación."
                />
              </View>
            </ScrollView>
            <View style={styles.piePreparar}>
              <Pressable
                onPress={() => { void verRutina(); }}
                disabled={!filtroSuperado || generando}
                accessibilityRole="button"
                accessibilityState={{ disabled: !filtroSuperado || generando, busy: generando }}
                style={[styles.botonPrincipal, styles.botonEntrenar, (!filtroSuperado || generando) && styles.botonDeshabilitado]}
              >
                {generando ? (
                  <View style={styles.fila}>
                    <ActivityIndicator color={T.sobreCeleste} />
                    <Text style={[styles.textoBoton, styles.textoEntrenar]}>Generando tu rutina con IA…</Text>
                  </View>
                ) : (
                  <Text style={[styles.textoBoton, styles.textoEntrenar]}>{IA_URL ? 'Generar rutina con IA' : 'Ver rutina'}</Text>
                )}
              </Pressable>
              {!filtroSuperado ? (
                <Text style={styles.ayudaCentrada} accessibilityLiveRegion="polite">
                  Para continuar, ambas afirmaciones deben ser ciertas.
                </Text>
              ) : null}
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      <CuestionarioInicial
        visible={cuestionarioPendiente || editandoCuestionario}
        cerrable={!cuestionarioPendiente}
        onCerrar={() => setEditandoCuestionario(false)}
      />
      {rutina !== null && perfilDisponible && !sesionActiva && (
        <VistaRutina rutina={rutina} resumenIA={resumenIA} modoPrueba={modeloIA === 'simulado'} avances={avances}
          onVolver={() => setRutina(null)} onEmpezar={() => setSesionActiva(true)} />
      )}
      {rutina !== null && perfilDisponible && sesionActiva && (
        <SesionGuiada
          rutina={rutina}
          origen={resumenIA ? 'ia' : 'reglas'}
          ejerciciosHechos={ejerciciosHechos}
          onGuardar={registrarSesion}
          onSalir={salirDeLaSesion}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.fondo },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: BottomTabInset + 20, gap: 18 },
  contentPreparar: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 16 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fecha: { ...TIPO.apoyo, fontWeight: '600', color: T.suave },
  titulo: { ...TIPO.tituloPantalla, fontSize: 30, lineHeight: 36, color: T.texto },
  subtitulo: { ...TIPO.tituloTarjeta, fontSize: 19, lineHeight: 25, fontWeight: '700', color: T.texto },
  texto: { ...TIPO.cuerpo, color: T.texto, flexShrink: 1 },
  ayuda: { ...TIPO.apoyo, color: T.suave },
  ayudaPie: { ...TIPO.apoyo, color: T.suave, textAlign: 'center' },
  ayudaCentrada: { ...TIPO.apoyo, color: T.suave, textAlign: 'center' },
  tarjeta: { backgroundColor: T.superficie, borderRadius: 22, padding: 18, gap: 14, ...SOMBRA },
  portada: { backgroundColor: T.banda, borderRadius: 24, padding: 22, gap: 2, overflow: 'hidden',
    boxShadow: '0 14px 30px rgba(43, 26, 71, 0.28)' },
  curvas: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  curva: { position: 'absolute', width: 190, height: 270, borderRadius: 95, borderWidth: 14,
    transform: [{ rotate: '-28deg' }] },
  portadaEtiqueta: { ...TIPO.cuerpo, fontWeight: '600', color: T.sobreBandaSuave },
  filaNumero: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 6 },
  numeroGrande: { fontSize: 64, lineHeight: 70, fontWeight: '800', letterSpacing: -2, color: T.sobreBanda,
    fontVariant: ['tabular-nums'] },
  unidad: { fontSize: 22, lineHeight: 36, fontWeight: '600', color: T.sobreBanda },
  portadaTexto: { ...TIPO.cuerpo, color: T.sobreBandaSuave, marginBottom: 14 },
  pastilla: { alignSelf: 'flex-start', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6 },
  textoPastilla: { ...TIPO.apoyo, fontWeight: '600', color: T.sobreBanda },
  botonPortada: { minHeight: 52, borderRadius: 16, backgroundColor: T.celeste, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  textoBotonPortada: { ...TIPO.boton, fontWeight: '700', color: T.sobreCeleste },
  flecha: { fontSize: 18, fontWeight: '600', color: T.sobreCeleste },
  seccion: { gap: 6 },
  semana: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  dia: { alignItems: 'center', gap: 10, flex: 1 },
  letraDia: { fontSize: 13, fontWeight: '600', color: T.suave },
  puntoDia: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.superficieAlta, alignItems: 'center',
    justifyContent: 'center' },
  diaHoy: { borderWidth: 1.5, borderColor: T.acento },
  diaEntrenado: { backgroundColor: T.acento, borderWidth: 0 },
  vistoDia: { fontSize: 14, lineHeight: 17, fontWeight: '700', color: T.sobreAcento },
  separador: { height: 1, backgroundColor: T.borde, marginBottom: 14 },
  filaProgresion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36,
    marginBottom: 6 },
  tituloProgresion: { ...TIPO.cuerpo, fontWeight: '700', color: T.texto },
  cuentaProgresion: { ...TIPO.cuerpo, fontWeight: '600', color: T.texto },
  fila: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  grupo: { flexDirection: 'row', backgroundColor: T.superficieAlta, borderRadius: 999, padding: 4 },
  segmento: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6 },
  segmentoElegido: { backgroundColor: T.acento, boxShadow: '0 2px 8px rgba(101, 69, 216, 0.3)' },
  textoSegmento: { fontSize: 14.5, fontWeight: '500', color: T.suave },
  textoSegmentoElegido: { fontWeight: '600', color: T.sobreAcento },
  opcion: { minHeight: 48, borderRadius: 999, backgroundColor: T.superficieAlta, paddingHorizontal: 16,
    justifyContent: 'center' },
  textoOpcion: { ...TIPO.cuerpo, color: T.texto },
  casilla: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 16,
    backgroundColor: T.superficieAlta },
  casillaMarcada: { backgroundColor: T.acentoSuave },
  cuadro: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: T.textoDeshabilitado,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: T.superficie },
  cuadroMarcado: { backgroundColor: T.acento, borderColor: T.acento },
  visto: { fontSize: 13, lineHeight: 16, fontWeight: '700', color: T.sobreAcento },
  textoCasilla: { ...TIPO.apoyo, fontSize: 14.5, lineHeight: 21, color: T.texto, flex: 1 },
  filaEvitar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  barraPreparar: { paddingHorizontal: 20, paddingTop: 8, minHeight: 44, justifyContent: 'center' },
  botonAtras: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  piePreparar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, gap: 8 },
  botonPrincipal: { minHeight: 52, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', backgroundColor: T.acento },
  botonDeshabilitado: { backgroundColor: T.deshabilitado, boxShadow: 'none' },
  textoBoton: { ...TIPO.boton, color: T.sobreAcento, textAlign: 'center' },
  // Acción principal en turquesa, con texto oscuro (10:1); el blanco sobre turquesa no se leería bien.
  botonEntrenar: { backgroundColor: T.celeste },
  textoEntrenar: { color: T.sobreCeleste, fontWeight: '700' },
  enlace: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  enlaceTexto: { ...TIPO.apoyo, fontSize: 14.5, fontWeight: '600', color: T.acentoTexto },
  alerta: { ...TIPO.apoyo, color: T.alerta, backgroundColor: T.alertaFondo, padding: 12, borderRadius: 14 },
});
