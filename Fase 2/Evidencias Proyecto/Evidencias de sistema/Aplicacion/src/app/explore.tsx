import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { SOMBRA, T, TIPO } from '@/constants/tema';

const C = { fondo: T.fondo, texto: T.texto, suave: T.suave, borde: T.borde, morado: T.acentoTexto, lila: T.acentoSuave };

const PASOS = [
  { titulo: 'Tus respuestas', texto: 'Nivel, experiencia, tiempo, equipo, estilos de baile y lo que prefieres evitar.' },
  { titulo: 'Kinetia filtra', texto: 'Elige la estructura según tu tiempo, deja solo los ejercicios compatibles contigo y fija límites de carga según tu edad, peso y estatura.' },
  { titulo: 'La IA decide', texto: 'Elige un ejercicio por bloque, ajusta series e intensidad y te explica por qué. Puede mantener o bajar la dosis, nunca superar la ficha ni tus límites.' },
  { titulo: 'Kinetia comprueba', texto: 'Revisa cada ejercicio y dosis antes de mostrarlos. Si algo no cumple o no hay conexión, usa la rutina habitual y te avisa.' },
  { titulo: 'Entrenas y cuentas cómo te fue', texto: 'Sigue la sesión paso a paso. Al final respondes dos preguntas y tu próxima rutina lo tiene en cuenta. Con dos sesiones fáciles y completas seguidas, avanzas a una variante más exigente.' },
];

export default function ComoFuncionaScreen() {
  return (
    <View style={styles.contenedor}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <Text style={styles.titulo} accessibilityRole="header">Cómo funciona</Text>
          <Text style={styles.texto}>
            Kinetia arma rutinas de fuerza y control corporal para complementar tu baile urbano, adaptadas a ti con
            inteligencia artificial.
          </Text>

          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo} accessibilityRole="header">Cómo se arma tu rutina</Text>
            {PASOS.map((p, i) => (
              <View key={p.titulo} style={styles.paso}>
                <View style={styles.numero}><Text style={styles.textoNumero}>{i + 1}</Text></View>
                <View style={styles.flex}>
                  <Text style={styles.etiqueta}>{p.titulo}</Text>
                  <Text style={styles.ayuda}>{p.texto}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo} accessibilityRole="header">Cómo influyen tu edad y tu peso</Text>
            <Text style={styles.texto}>
              • Desde los 65 años: más descanso entre series y hasta 2 series por ejercicio. Si además estás
              empezando, menos repeticiones.
            </Text>
            <Text style={styles.texto}>• Entre los 50 y los 64 años, si estás empezando: más descanso entre series.</Text>
            <Text style={styles.texto}>
              • Con un índice de masa corporal de 30 o más: menos repeticiones en los ejercicios que cargan el cuerpo
              sobre una pierna o la punta de los pies. Desde 35, también más descanso en ellos.
            </Text>
            <Text style={styles.ayuda}>
              Kinetia no incluye saltos: todos sus ejercicios son de bajo impacto. Estos límites solo bajan la carga,
              nunca la suben ni quitan ejercicios. Son criterios conservadores del proyecto, basados en guías de
              ejercicio (ACSM, NSCA y OMS), y no reemplazan la evaluación de un profesional.
            </Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo} accessibilityRole="header">Lo que Kinetia no hace</Text>
            <Text style={styles.texto}>• No enseña pasos de baile ni evalúa tu técnica.</Text>
            <Text style={styles.texto}>• No diagnostica ni reemplaza a un profesional de la salud.</Text>
            <Text style={styles.texto}>
              • Si tienes dolor, una lesión o estás en recuperación, no la uses: consulta a un profesional.
            </Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.subtitulo} accessibilityRole="header">Tus datos</Text>
            <Text style={styles.texto}>Tu perfil, tus respuestas y tus sesiones se guardan en este teléfono.</Text>
            <Text style={styles.texto}>
              Para generar la rutina se envían al servicio de IA tu edad, peso, estatura, nivel, respuestas y un
              resumen de tu última sesión. Tu nombre nunca se envía.
            </Text>
            <Text style={styles.texto}>
              Puedes borrar tu perfil y tu historial cuando quieras desde la pestaña Perfil.
            </Text>
          </View>

          <Text style={styles.pie}>Generación de rutinas con Claude, de Anthropic · Proyecto Capstone</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.fondo },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  contenido: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: BottomTabInset + 16, gap: 16 },
  titulo: { ...TIPO.tituloPantalla, color: C.texto },
  subtitulo: { ...TIPO.tituloTarjeta, color: C.texto },
  texto: { fontSize: 16, lineHeight: 23, color: C.texto },
  ayuda: { fontSize: 15, lineHeight: 21, color: C.suave },
  etiqueta: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: C.texto },
  tarjeta: { backgroundColor: T.superficie, borderRadius: 22, padding: 18, gap: 12, ...SOMBRA },
  paso: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  numero: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.lila, alignItems: 'center', justifyContent: 'center' },
  textoNumero: { fontSize: 15, fontWeight: '700', color: C.morado },
  flex: { flex: 1, gap: 2 },
  pie: { fontSize: 13, lineHeight: 19, color: C.suave, textAlign: 'center' },
});
