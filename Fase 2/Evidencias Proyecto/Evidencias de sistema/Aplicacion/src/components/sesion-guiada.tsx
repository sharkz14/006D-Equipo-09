import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { alerta } from '@/components/alerta';
import AnimacionEjercicio, { tieneAnimacion } from '@/components/animacion-ejercicio';
import Marca from '@/components/marca';
import { Aparecer, BarraProgreso, Confeti } from '@/components/movimiento';
import { SOMBRA, T, TIPO } from '@/constants/tema';
import type { RoutineResult } from '@/lib/generador';
import { indicacionClave, nombreAmigable } from '@/lib/nombres';
import {
  TEXTO_ESFUERZO, crearRegistro, pasosDeSesion, type Esfuerzo, type RegistroSesion,
} from '@/lib/sesion';


type Fase = 'sesion' | 'dolor' | 'preguntas' | 'guardada';

function reloj(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Opcion({ texto, elegida, onPress }: { texto: string; elegida: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: elegida }}
      style={[styles.opcion, elegida && styles.opcionElegida]}>
      <Text style={[styles.textoOpcion, elegida && styles.textoOpcionElegida]}>{texto}</Text>
    </Pressable>
  );
}

/**
 * Sesión paso a paso: instrucciones de la ficha, series y lados, descansos cronometrados, detener por dolor
 * y dos preguntas finales. El registro se guarda en el teléfono y la próxima rutina lo tiene en cuenta.
 */
export default function SesionGuiada({ rutina, origen, ejerciciosHechos = [], onGuardar, onSalir }: {
  rutina: RoutineResult;
  origen: 'ia' | 'reglas';
  /** Ejercicios que ya hizo alguna vez: la técnica se abre sola solo la primera vez. */
  ejerciciosHechos?: readonly string[];
  onGuardar: (registro: RegistroSesion) => Promise<void>;
  onSalir: () => void;
}) {
  const pasos = useMemo(() => pasosDeSesion(rutina), [rutina]);
  // Barra por partes: calentamiento, cada ejercicio (con su prueba suave) y cierre.
  const { grupoDePaso, totalGrupos, primerPasoDe } = useMemo(() => {
    const claves: string[] = [];
    const grupo: number[] = [];
    const primero: Record<string, number> = {};
    pasos.forEach((p, i) => {
      const clave = p.fase === 'cierre' ? 'cierre' : p.fase === 'principal' || p.etiqueta === 'Prueba suave' ? p.id : 'inicio';
      if (!claves.includes(clave)) claves.push(clave);
      grupo.push(claves.indexOf(clave));
      if (primero[p.id] === undefined) primero[p.id] = i;
    });
    return { grupoDePaso: grupo, totalGrupos: claves.length, primerPasoDe: primero };
  }, [pasos]);
  const [tecnica, setTecnica] = useState<Record<string, boolean>>({});
  const [iPaso, setIPaso] = useState(0);
  const [iTramo, setITramo] = useState(0);
  const [hechas, setHechas] = useState<Record<string, number>>({});
  const [fase, setFase] = useState<Fase>('sesion');
  const [detenidaPorDolor, setDetenidaPorDolor] = useState(false);
  const [esfuerzo, setEsfuerzo] = useState<Esfuerzo | null>(null);
  const [dolor, setDolor] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registro, setRegistro] = useState<RegistroSesion | null>(null);
  // Minutos reales de la sesión, para el resumen final.
  const [inicio] = useState(() => Date.now());
  const [minutos, setMinutos] = useState(0);
  // Cronómetro: `finEn` marca el término; `pausado` guarda los segundos que quedaban.
  const [finEn, setFinEn] = useState<number | null>(null);
  const [pausado, setPausado] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const paso = pasos[iPaso];
  const tramo = paso?.tramos[iTramo];

  function prepararTramo(p: number, t: number) {
    const siguiente = pasos[p]?.tramos[t];
    const inicio = Date.now();
    setAhora(inicio);
    if (siguiente?.tipo === 'descanso') {
      setFinEn(inicio + siguiente.segundos * 1000);
      setPausado(null);
    } else {
      setFinEn(null);
      setPausado(siguiente?.tipo === 'trabajo' ? siguiente.segundos : null);
    }
  }

  useEffect(() => {
    prepararTramo(0, 0);
    // Solo al abrir la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (finEn === null) return undefined;
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, [finEn]);

  function irAPaso(p: number) {
    if (p < pasos.length) {
      setIPaso(p);
      setITramo(0);
      prepararTramo(p, 0);
    } else {
      setFinEn(null);
      setFase('preguntas');
    }
  }

  function avanzar() {
    if (!paso || !tramo) return;
    if (tramo.tipo === 'trabajo' && tramo.finDeSerie !== null && paso.seriesPlan !== null) {
      const serie = tramo.finDeSerie;
      setHechas((h) => ({ ...h, [paso.id]: Math.max(h[paso.id] ?? 0, serie) }));
    }
    if (iTramo + 1 < paso.tramos.length) {
      setITramo(iTramo + 1);
      prepararTramo(iPaso, iTramo + 1);
    } else {
      irAPaso(iPaso + 1);
    }
  }

  // Al terminar un tiempo: vibra y pasa al siguiente tramo.
  useEffect(() => {
    if (finEn !== null && ahora >= finEn && fase === 'sesion') {
      Vibration.vibrate(400);
      avanzar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ahora, finEn]);

  function detenerPorDolor() {
    setFinEn(null);
    setDetenidaPorDolor(true);
    setDolor(true);
    setFase('dolor');
  }

  function terminarAntes() {
    alerta('¿Terminar la sesión?', 'Se registrará lo que alcanzaste a hacer.', [
      { text: 'Seguir', style: 'cancel' },
      { text: 'Salir sin guardar', style: 'destructive', onPress: onSalir },
      { text: 'Terminar', onPress: () => { setFinEn(null); setFase('preguntas'); } },
    ]);
  }

  async function guardar() {
    if (!esfuerzo || (dolor === null && !detenidaPorDolor) || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const nuevo = crearRegistro(rutina, origen, hechas,
        { detenidaPorDolor, esfuerzo, dolor: dolor ?? false });
      await onGuardar(nuevo);
      setRegistro(nuevo);
      setMinutos(Math.max(1, Math.round((Date.now() - inicio) / 60000)));
      setFase('guardada');
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar la sesión. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  const segundos = finEn !== null ? Math.max(0, Math.ceil((finEn - ahora) / 1000)) : pausado;
  const totalTramo = tramo?.segundos ?? null;
  const siguienteTitulo = paso && tramo?.tipo === 'descanso'
    ? (paso.tramos[iTramo + 1]?.titulo ?? pasos[iPaso + 1]?.nombre ?? null) : null;

  function contenidoSesion() {
    if (!paso || !tramo) return null;
    const grupoActual = grupoDePaso[iPaso] ?? 0;
    // Técnica abierta la primera vez que aparece un ejercicio que nunca ha hecho; después, cerrada.
    const tecnicaAbierta = tecnica[paso.clave]
      ?? (!ejerciciosHechos.includes(paso.id) && primerPasoDe[paso.id] === iPaso);
    const indicacion = indicacionClave(paso.id);
    const numero = tramo.tipo === 'trabajo' && tramo.segundos === null ? /^(\d+)\s+(.+)$/.exec(tramo.detalle) : null;
    const textoListo = /lado/i.test(tramo.titulo) ? 'Terminé este lado'
      : tramo.tipo === 'trabajo' && tramo.finDeSerie !== null ? 'Terminé la serie' : 'Listo';
    return (
      <>
        <View style={styles.cabecera}>
          <View style={styles.filaCabecera}>
            <Marca />
            <Pressable onPress={terminarAntes} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.enlace}>Terminar</Text>
            </Pressable>
          </View>
          <Text style={styles.etiqueta}>{paso.etiqueta}</Text>
          <View style={styles.partes} accessible accessibilityLabel={`Parte ${grupoActual + 1} de ${totalGrupos}`}>
            {Array.from({ length: totalGrupos }, (_, g) => (
              <View key={g} style={[styles.parte, g < grupoActual && styles.parteHecha, g === grupoActual && styles.parteActual]} />
            ))}
          </View>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.contenido}>
          <Text style={styles.titulo} accessibilityRole="header">{nombreAmigable(paso.id, paso.nombre)}</Text>
          {paso.cambioPosicion ? (
            <View style={styles.aviso}><Text style={styles.textoAviso}>{paso.cambioPosicion}</Text></View>
          ) : null}
          {tieneAnimacion(paso.id) ? <AnimacionEjercicio id={paso.id} /> : null}
          {indicacion ? <Text style={styles.indicacion}>{indicacion}</Text> : null}

          {paso.pasos.length ? (
            <>
              <Pressable onPress={() => setTecnica((t) => ({ ...t, [paso.clave]: !tecnicaAbierta }))}
                accessibilityRole="button" accessibilityState={{ expanded: tecnicaAbierta }} style={styles.botonTecnica}>
                <Text style={styles.enlace}>{tecnicaAbierta ? 'Ocultar técnica' : 'Ver técnica paso a paso'}  {tecnicaAbierta ? '⌃' : '⌄'}</Text>
              </Pressable>
              {tecnicaAbierta ? (
                <View style={styles.tecnica}>
                  {paso.pasos.map((t, i) => (
                    <View key={t} style={styles.filaPaso}>
                      <View style={styles.numero}><Text style={styles.textoNumero}>{i + 1}</Text></View>
                      <Text style={styles.texto}>{t}</Text>
                    </View>
                  ))}
                  {paso.puntos.length ? (
                    <>
                      <Text style={styles.etiquetaLista}>Fíjate en</Text>
                      {paso.puntos.map((t) => <Text key={t} style={styles.texto}>• {t}</Text>)}
                    </>
                  ) : null}
                  {paso.errores.length ? (
                    <>
                      <Text style={styles.etiquetaLista}>Evita</Text>
                      {paso.errores.map((t) => <Text key={t} style={styles.texto}>• {t}</Text>)}
                    </>
                  ) : null}
                  {paso.origenInstrucciones === 'kinetia' ? (
                    <Text style={styles.pequeno}>Indicación general de Kinetia, pendiente de revisión.</Text>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.ayuda}>Esta variante todavía no tiene instrucciones en la app. Si no la conoces, sáltala.</Text>
          )}
          <Text style={styles.pequeno}>Prototipo académico · instrucciones y dosis en revisión.</Text>
        </ScrollView>

        {/* Zona de acción fija: aunque se abra la técnica, el botón queda a mano. */}
        <View style={[styles.panel, tramo.tipo === 'descanso' && styles.panelDescanso]}>
          <Text style={styles.tituloTramo}>{tramo.tipo === 'descanso' ? 'Descanso' : tramo.titulo}</Text>
          {segundos !== null ? (
            <>
              <Text style={styles.reloj} accessibilityLabel={`${segundos} segundos`}>{reloj(segundos)}</Text>
              {totalTramo ? (
                <BarraProgreso valor={1 - segundos / totalTramo} color={T.acento} fondo={T.superficieAlta} alto={5} />
              ) : null}
            </>
          ) : numero ? (
            <View style={styles.filaCantidad}>
              <Text style={styles.cantidad}>{numero[1]}</Text>
              <Text style={styles.unidadCantidad}>{numero[2]}</Text>
            </View>
          ) : tramo.tipo === 'trabajo' ? (
            <Text style={styles.detalleTramo}>{tramo.detalle}</Text>
          ) : null}
          {tramo.tipo === 'trabajo' && tramo.segundos !== null ? (
            <Text style={styles.pequeno}>{tramo.detalle}</Text>
          ) : null}
          {siguienteTitulo ? (
            <Text style={styles.pequeno}>Sigue: {nombreAmigable(pasos[iPaso + 1]?.id ?? '', siguienteTitulo)}</Text>
          ) : null}

          {tramo.tipo === 'descanso' ? (
            <Pressable style={styles.botonSecundario} onPress={avanzar} accessibilityRole="button">
              <Text style={styles.textoSecundario}>Saltar descanso</Text>
            </Pressable>
          ) : tramo.segundos === null ? (
            <Pressable style={[styles.botonPrincipal, styles.botonEntrenar, styles.botonConIcono]} onPress={avanzar}
              accessibilityRole="button">
              <Text style={[styles.textoBoton, styles.textoEntrenar]}>{textoListo}</Text>
              <Text style={[styles.textoBoton, styles.textoEntrenar]}>✓</Text>
            </Pressable>
          ) : finEn === null ? (
            <View style={styles.fila}>
              <Pressable style={[styles.botonPrincipal, styles.botonEntrenar, styles.flex]} accessibilityRole="button"
                onPress={() => { const t = Date.now(); setAhora(t); setFinEn(t + (pausado ?? tramo.segundos ?? 0) * 1000); }}>
                <Text style={[styles.textoBoton, styles.textoEntrenar]}>{pausado !== null && pausado < (tramo.segundos ?? 0) ? 'Seguir' : 'Iniciar'}</Text>
              </Pressable>
              <Pressable style={[styles.botonSecundario, styles.flex]} onPress={avanzar} accessibilityRole="button">
                <Text style={styles.textoSecundario}>Saltar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.botonSecundario} accessibilityRole="button"
              onPress={() => { setPausado(segundos); setFinEn(null); }}>
              <Text style={styles.textoSecundario}>Pausar</Text>
            </Pressable>
          )}

          <View style={styles.filaEnlaces}>
            {paso.fase === 'principal' ? (
              <Pressable style={styles.enlacePie} onPress={() => irAPaso(iPaso + 1)} accessibilityRole="button">
                <Text style={styles.textoTenue}>Saltar ejercicio</Text>
              </Pressable>
            ) : <View />}
            <Pressable style={styles.enlacePie} onPress={detenerPorDolor} accessibilityRole="button"
              accessibilityLabel="Siento dolor, detener la sesión">
              <Text style={styles.textoDolor}>Detener por dolor</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const terminados = registro ? registro.ejercicios.filter((e) => e.hechas >= e.series).length : 0;
  const seriesHechas = registro ? registro.ejercicios.reduce((n, e) => n + e.hechas, 0) : 0;
  // Se celebra solo una sesión completa y sin dolor; si hubo molestias, el cierre es tranquilo.
  const celebrar = registro !== null && registro.completada && !registro.dolor && !registro.detenidaPorDolor;
  // La celebración va sobre la banda morada, como el saludo de Inicio.
  const enBanda = fase === 'guardada' && celebrar;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen"
      onRequestClose={fase === 'guardada' ? onSalir : terminarAntes}>
      <SafeAreaProvider style={[styles.fondo, enBanda && styles.fondoBanda]}>
        <SafeAreaView style={styles.pantalla}>
          {fase === 'sesion' ? contenidoSesion() : (
            <ScrollView contentContainerStyle={styles.contenido}>
              {fase === 'dolor' ? (
                <View style={[styles.tarjeta, styles.tarjetaAlerta]}>
                  <Text style={styles.titulo} accessibilityRole="header">Sesión detenida</Text>
                  <Text style={styles.texto}>
                    Hiciste bien en parar. No sigas hoy con el ejercicio que te causó dolor.
                  </Text>
                  <Text style={styles.texto}>
                    Si el dolor es intenso, no se pasa con el reposo o vuelve al moverte, consulta a un profesional
                    de la salud antes de tu próxima sesión.
                  </Text>
                  <Pressable style={styles.botonPrincipal} onPress={() => setFase('preguntas')} accessibilityRole="button">
                    <Text style={styles.textoBoton}>Continuar</Text>
                  </Pressable>
                </View>
              ) : fase === 'preguntas' ? (
                <>
                  <Text style={styles.titulo} accessibilityRole="header">¿Cómo te fue?</Text>
                  <Text style={styles.ayuda}>
                    {detenidaPorDolor ? 'Una respuesta rápida' : 'Dos respuestas rápidas'}. Tu próxima rutina lo tendrá en
                    cuenta.
                  </Text>
                  <View style={styles.tarjeta}>
                    <Text style={styles.subtitulo}>¿Cómo te resultó la sesión?</Text>
                    <View style={styles.fila} accessibilityRole="radiogroup">
                      {(Object.keys(TEXTO_ESFUERZO) as Esfuerzo[]).map((e) => (
                        <Opcion key={e} texto={TEXTO_ESFUERZO[e]} elegida={esfuerzo === e} onPress={() => setEsfuerzo(e)} />
                      ))}
                    </View>
                  </View>
                  {!detenidaPorDolor ? (
                    <View style={styles.tarjeta}>
                      <Text style={styles.subtitulo}>¿Sentiste dolor o molestias?</Text>
                      <View style={styles.fila} accessibilityRole="radiogroup">
                        <Opcion texto="No" elegida={dolor === false} onPress={() => setDolor(false)} />
                        <Opcion texto="Sí" elegida={dolor === true} onPress={() => setDolor(true)} />
                      </View>
                    </View>
                  ) : null}
                  {error ? <Text style={styles.textoDolor} accessibilityRole="alert">{error}</Text> : null}
                  <Pressable
                    style={[styles.botonPrincipal, (!esfuerzo || (dolor === null && !detenidaPorDolor) || guardando) && styles.deshabilitado]}
                    disabled={!esfuerzo || (dolor === null && !detenidaPorDolor) || guardando}
                    onPress={() => { void guardar(); }} accessibilityRole="button">
                    <Text style={styles.textoBoton}>{guardando ? 'Guardando…' : 'Guardar sesión'}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {celebrar ? <Confeti /> : null}
                  <Aparecer style={styles.resumen}>
                    <View style={[styles.insignia, !celebrar && styles.insigniaTranquila]}>
                      <Text style={[styles.textoInsignia, !celebrar && styles.textoInsigniaTranquila]}>{celebrar ? '✓' : '•'}</Text>
                    </View>
                    <Text style={[styles.tituloResumen, enBanda && styles.claro]} accessibilityRole="header">
                      {celebrar ? '¡Sesión completada!' : 'Sesión registrada'}
                    </Text>
                    <Text style={[styles.ayudaCentrada, enBanda && styles.claroSuave]}>
                      {celebrar ? 'Buen trabajo. Tu próxima rutina tendrá en cuenta cómo te fue.'
                        : 'Tu próxima rutina tendrá en cuenta cómo te fue.'}
                    </Text>
                  </Aparecer>
                  {registro ? (
                    <Aparecer orden={1}>
                      <View style={styles.filaDatos}>
                        <View style={[styles.dato, enBanda && styles.datoBanda]}>
                          <Text style={[styles.datoValor, enBanda && styles.claro]}>{minutos}</Text>
                          <Text style={[styles.datoEtiqueta, enBanda && styles.claroSuave]}>{minutos === 1 ? 'minuto' : 'minutos'}</Text>
                        </View>
                        <View style={[styles.dato, enBanda && styles.datoBanda]}>
                          <Text style={[styles.datoValor, enBanda && styles.claro]}>{terminados}/{registro.ejercicios.length}</Text>
                          <Text style={[styles.datoEtiqueta, enBanda && styles.claroSuave]}>ejercicios</Text>
                        </View>
                        <View style={[styles.dato, enBanda && styles.datoBanda]}>
                          <Text style={[styles.datoValor, enBanda && styles.claro]}>{seriesHechas}</Text>
                          <Text style={[styles.datoEtiqueta, enBanda && styles.claroSuave]}>series</Text>
                        </View>
                      </View>
                    </Aparecer>
                  ) : null}
                  {registro ? (
                    <Aparecer orden={2}>
                      <View style={[styles.tarjeta, enBanda && styles.datoBanda]}>
                        <Text style={[styles.texto, enBanda && styles.claro]}>
                          Completaste {terminados} de {registro.ejercicios.length} ejercicios
                          {registro.esfuerzo ? ` y te resultó ${TEXTO_ESFUERZO[registro.esfuerzo].toLowerCase()}` : ''}.
                        </Text>
                        {registro.dolor ? (
                          <Text style={styles.texto}>
                            Como sentiste molestias, antes de entrenar de nuevo confirma que ya no tienes dolor.
                          </Text>
                        ) : null}
                      </View>
                    </Aparecer>
                  ) : null}
                  <Aparecer orden={3}>
                    <Pressable style={[styles.botonPrincipal, styles.botonEntrenar]} onPress={onSalir} accessibilityRole="button">
                      <Text style={[styles.textoBoton, styles.textoEntrenar]}>Volver al inicio</Text>
                    </Pressable>
                  </Aparecer>
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: T.fondo },
  fondoBanda: { backgroundColor: T.banda },
  claro: { color: T.sobreBanda },
  claroSuave: { color: T.sobreBandaSuave },
  datoBanda: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.16)', boxShadow: 'none' },
  pantalla: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  flex: { flex: 1 },
  bloque: { gap: 12 },
  cabecera: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, gap: 10 },
  partes: { flexDirection: 'row', gap: 6 },
  parte: { flex: 1, height: 5, borderRadius: 3, backgroundColor: T.borde },
  parteHecha: { backgroundColor: '#B9A6F5' },
  parteActual: { backgroundColor: T.acento },
  indicacion: { ...TIPO.cuerpo, fontSize: 16, lineHeight: 23, color: T.texto },
  botonTecnica: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  tecnica: { gap: 10, paddingTop: 2 },
  filaCantidad: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  cantidad: { fontSize: 52, lineHeight: 58, fontWeight: '800', letterSpacing: -1.5, color: T.texto, fontVariant: ['tabular-nums'] },
  unidadCantidad: { fontSize: 22, fontWeight: '500', color: T.texto },
  botonConIcono: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  filaEnlaces: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  enlacePie: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  filaCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progresoTexto: { fontSize: 14, fontWeight: '600', color: T.suave },
  enlace: { fontSize: 15, fontWeight: '700', color: T.acentoTexto },
  contenido: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 12 },
  etiqueta: { ...TIPO.cuerpo, fontSize: 14, fontWeight: '600', color: T.acentoTexto },
  titulo: { ...TIPO.tituloPantalla, fontSize: 30, lineHeight: 36, color: T.texto },
  subtitulo: { ...TIPO.tituloTarjeta, color: T.texto },
  dosis: { ...TIPO.cuerpo, fontSize: 16, fontWeight: '600', color: T.acentoTexto },
  texto: { ...TIPO.cuerpo, color: T.texto, flexShrink: 1 },
  ayuda: { ...TIPO.apoyo, color: T.suave },
  pequeno: { fontSize: 13, lineHeight: 19, color: T.suave },
  aviso: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: T.acentoSuave, alignSelf: 'flex-start' },
  textoAviso: { ...TIPO.apoyo, fontWeight: '500', color: T.acentoTexto },
  tarjeta: { backgroundColor: T.superficie, borderRadius: 22, padding: 18, gap: 10, ...SOMBRA },
  animacion: { borderRadius: 22, overflow: 'hidden', ...SOMBRA },
  tarjetaAlerta: { borderColor: T.alerta, backgroundColor: T.alertaFondo },
  filaPaso: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  numero: { width: 24, height: 24, borderRadius: 12, backgroundColor: T.acentoSuave, alignItems: 'center',
    justifyContent: 'center', marginTop: 1 },
  textoNumero: { fontSize: 13, fontWeight: '700', color: T.acentoTexto },
  pequenoCentrado: { fontSize: 13, lineHeight: 19, color: T.suave, textAlign: 'center' },
  etiquetaLista: { ...TIPO.cuerpo, fontWeight: '600', color: T.texto, marginTop: 4 },
  panel: { borderTopWidth: 1, borderTopColor: T.borde, backgroundColor: T.fondo, paddingHorizontal: 20,
    paddingTop: 14, paddingBottom: 6, gap: 8 },
  panelDescanso: { backgroundColor: T.acentoSuave },
  tituloTramo: { ...TIPO.apoyo, fontWeight: '600', color: T.suave },
  detalleTramo: { fontSize: 26, fontWeight: '700', color: T.texto },
  reloj: { fontSize: 52, lineHeight: 58, fontWeight: '800', letterSpacing: -1.5, color: T.texto, fontVariant: ['tabular-nums'] },
  fila: { flexDirection: 'row', gap: 10 },
  botonPrincipal: { minHeight: 52, borderRadius: 16, backgroundColor: T.acento, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 16 },
  textoBoton: { ...TIPO.boton, color: T.sobreAcento, textAlign: 'center' },
  // Acciones de entrenamiento en celeste, con texto oscuro (8,8:1); el blanco sobre celeste no se leería bien.
  botonEntrenar: { backgroundColor: T.celeste },
  textoEntrenar: { color: T.sobreCeleste, fontWeight: '700' },
  botonSecundario: { minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: T.acento,
    backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  textoSecundario: { ...TIPO.boton, color: T.acentoTexto, textAlign: 'center' },
  botonTenue: { minHeight: 42, borderRadius: 999, backgroundColor: T.superficieAlta, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 10 },
  textoTenue: { fontSize: 14, fontWeight: '600', color: T.suave },
  botonDolor: { minHeight: 42, borderRadius: 999, backgroundColor: T.alertaFondo,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  textoDolor: { fontSize: 14, fontWeight: '600', color: T.alerta },
  opcion: { flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: T.superficieAlta, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 6 },
  opcionElegida: { backgroundColor: T.acento },
  textoOpcion: { fontSize: 15, fontWeight: '500', color: T.suave },
  textoOpcionElegida: { fontWeight: '600', color: T.sobreAcento },
  deshabilitado: { backgroundColor: T.deshabilitado },
  resumen: { alignItems: 'center', gap: 10, paddingTop: 32, paddingBottom: 8 },
  insignia: { width: 96, height: 96, borderRadius: 32, backgroundColor: T.acento, alignItems: 'center',
    justifyContent: 'center', transform: [{ rotate: '-8deg' }], boxShadow: '0 12px 40px rgba(124, 77, 255, 0.55)' },
  insigniaTranquila: { backgroundColor: T.acentoSuave, boxShadow: 'none' },
  textoInsignia: { fontSize: 44, lineHeight: 52, fontWeight: '700', color: T.sobreAcento },
  textoInsigniaTranquila: { color: T.acentoTexto },
  tituloResumen: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: T.texto, textAlign: 'center' },
  ayudaCentrada: { fontSize: 15, lineHeight: 21, color: T.suave, textAlign: 'center' },
  filaDatos: { flexDirection: 'row', gap: 10 },
  dato: { flex: 1, backgroundColor: T.superficie, borderWidth: 1, borderColor: T.borde, borderRadius: 18,
    paddingVertical: 14, alignItems: 'center', gap: 2 },
  datoValor: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: T.texto, fontVariant: ['tabular-nums'] },
  datoEtiqueta: { fontSize: 13, color: T.suave },
});
