import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { alerta } from '@/components/alerta';
import { usePerfil } from '@/components/perfil-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { validarFormularioPerfil, type FormularioPerfil } from '@/lib/perfil';
import { SOMBRA, T, TIPO } from '@/constants/tema';

const formularioVacio: FormularioPerfil = {
  nombre: '', edad: '', pesoKg: '', estaturaCm: '', nivel: 'P',
};

export default function PerfilScreen() {
  const { perfil, cargando, guardando, error, recargar, crear, actualizar, eliminar } = usePerfil();
  const [formulario, setFormulario] = useState<FormularioPerfil>(formularioVacio);
  const [editando, setEditando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  useEffect(() => {
    setFormulario(perfil ? {
      nombre: perfil.nombre,
      edad: String(perfil.edad),
      pesoKg: String(perfil.pesoKg),
      estaturaCm: String(perfil.estaturaCm),
      nivel: perfil.nivel,
    } : formularioVacio);
    setEditando(false);
    setErrorFormulario(null);
  }, [perfil]);

  function cambiar(campo: keyof FormularioPerfil, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErrorFormulario(null);
  }

  async function guardar() {
    if (guardando) return;
    let datos;
    try {
      datos = validarFormularioPerfil(formulario);
    } catch (fallo) {
      setErrorFormulario(fallo instanceof Error ? fallo.message : 'Revisa los datos ingresados.');
      return;
    }
    setErrorFormulario(null);
    try {
      if (perfil) await actualizar(datos);
      else await crear(datos);
      Keyboard.dismiss();
      setEditando(false);
      alerta('Perfil guardado', 'Tus datos quedaron guardados en este dispositivo.');
    } catch (fallo) {
      const mensaje = fallo instanceof Error ? fallo.message : 'No pudimos guardar el perfil. Inténtalo nuevamente.';
      setErrorFormulario(`${mensaje} Tus cambios siguen en el formulario.`);
    }
  }

  function cancelarEdicion() {
    if (!perfil || guardando) return;
    setFormulario({
      nombre: perfil.nombre, edad: String(perfil.edad),
      pesoKg: String(perfil.pesoKg), estaturaCm: String(perfil.estaturaCm),
      nivel: perfil.nivel,
    });
    setEditando(false);
    setErrorFormulario(null);
    Keyboard.dismiss();
  }

  function confirmarEliminacion() {
    alerta(
      '¿Eliminar tu perfil?',
      'Se borrarán de este dispositivo tu perfil, tus respuestas y tu historial de sesiones. Para generar otra rutina tendrás que crear un perfil nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => {
          void eliminar().catch((fallo: unknown) => {
            setErrorFormulario(fallo instanceof Error ? fallo.message : 'No pudimos eliminar el perfil. Inténtalo nuevamente.');
          });
        } },
      ],
    );
  }

  const estiloInput = styles.input;
  const colorPlaceholder = T.textoDeshabilitado;
  const mostrarFormulario = !perfil || editando;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedView style={styles.hero}>
              <ThemedText type="title" style={styles.titulo} accessibilityRole="header">Mi perfil</ThemedText>
              <ThemedText style={styles.suave}>Tu punto de partida en Kinetia.</ThemedText>
            </ThemedView>

            {cargando ? (
              <ThemedView style={styles.card}>
                <ActivityIndicator color={T.acentoTexto} accessibilityLabel="Cargando perfil" />
                <ThemedText>Cargando tu perfil…</ThemedText>
              </ThemedView>
            ) : error ? (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText accessibilityRole="alert">{error}</ThemedText>
                <Pressable style={styles.botonPrincipal} onPress={() => { void recargar(); }} accessibilityRole="button">
                  <ThemedText style={styles.textoBoton}>Reintentar</ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="subtitle" style={styles.tituloTarjeta}>
                  {mostrarFormulario ? (perfil ? 'Editar perfil' : 'Crear perfil') : perfil.nombre}
                </ThemedText>

                {mostrarFormulario ? (
                  <>
                    <ThemedText type="small">Completa todos los campos. Kinetia está dirigida a personas de 18 años o más.</ThemedText>

                    <ThemedText>Nombre</ThemedText>
                    <TextInput style={estiloInput} value={formulario.nombre} onChangeText={(v) => cambiar('nombre', v)}
                      placeholder="¿Cómo te llamas?" placeholderTextColor={colorPlaceholder}
                      accessibilityLabel="Nombre" editable={!guardando} maxLength={80} autoCapitalize="words" />

                    <ThemedText>Edad (años)</ThemedText>
                    <TextInput style={estiloInput} value={formulario.edad} onChangeText={(v) => cambiar('edad', v)}
                      placeholder="Ejemplo: 24" placeholderTextColor={colorPlaceholder}
                      accessibilityLabel="Edad en años" keyboardType="number-pad" editable={!guardando} maxLength={3} />

                    <ThemedText>Peso (kg)</ThemedText>
                    <TextInput style={estiloInput} value={formulario.pesoKg} onChangeText={(v) => cambiar('pesoKg', v)}
                      placeholder="Ejemplo: 62,5" placeholderTextColor={colorPlaceholder}
                      accessibilityLabel="Peso en kilogramos" keyboardType="decimal-pad" editable={!guardando} maxLength={10} />

                    <ThemedText>Estatura (cm)</ThemedText>
                    <TextInput style={estiloInput} value={formulario.estaturaCm} onChangeText={(v) => cambiar('estaturaCm', v)}
                      placeholder="Ejemplo: 165" placeholderTextColor={colorPlaceholder}
                      accessibilityLabel="Estatura en centímetros" keyboardType="decimal-pad" editable={!guardando} maxLength={10} />

                    <ThemedText type="subtitle" style={styles.seccion}>Experiencia entrenando fuerza</ThemedText>
                    <ThemedText type="small">Este nivel será el valor inicial al configurar tu rutina.</ThemedText>
                    {(['P', 'I'] as const).map((nivel) => (
                      <Pressable key={nivel} onPress={() => cambiar('nivel', nivel)} disabled={guardando}
                        accessibilityRole="radio" accessibilityState={{ checked: formulario.nivel === nivel, disabled: guardando }}
                        style={[styles.opcion, formulario.nivel === nivel && styles.opcionSeleccionada]}>
                        <ThemedText>{formulario.nivel === nivel ? '● ' : '○ '}{nivel === 'P' ? 'Principiante' : 'Intermedio'}</ThemedText>
                      </Pressable>
                    ))}
                    <ThemedText type="small">
                      Como referencia, el nivel intermedio supone al menos 6 meses entrenando fuerza,
                      unas 2 sesiones semanales en las últimas 8 semanas y familiaridad con series,
                      repeticiones y descansos. Si tienes dudas, elige principiante.
                    </ThemedText>

                    {errorFormulario && <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">{errorFormulario}</ThemedText>}
                    <Pressable onPress={() => { void guardar(); }} disabled={guardando} accessibilityRole="button"
                      accessibilityState={{ disabled: guardando, busy: guardando }}
                      style={[styles.botonPrincipal, guardando && styles.deshabilitado]}>
                      <ThemedText style={styles.textoBoton}>{guardando ? 'Guardando…' : 'Guardar perfil'}</ThemedText>
                    </Pressable>
                    {perfil && (
                      <Pressable style={styles.opcion} onPress={cancelarEdicion} disabled={guardando}
                        accessibilityRole="button" accessibilityState={{ disabled: guardando }}>
                        <ThemedText style={styles.centrado}>Cancelar edición</ThemedText>
                      </Pressable>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.datos}>
                      <ThemedText>Edad: {perfil.edad} años</ThemedText>
                      <ThemedText>Peso: {String(perfil.pesoKg).replace('.', ',')} kg</ThemedText>
                      <ThemedText>Estatura: {String(perfil.estaturaCm).replace('.', ',')} cm</ThemedText>
                      <ThemedText>Nivel de fuerza: {perfil.nivel === 'P' ? 'Principiante' : 'Intermedio'}</ThemedText>
                    </View>
                    <Pressable style={styles.botonPrincipal} onPress={() => router.navigate('/')} disabled={guardando}
                      accessibilityRole="button" accessibilityState={{ disabled: guardando }}>
                      <ThemedText style={styles.textoBoton}>Configurar mi rutina</ThemedText>
                    </Pressable>
                    <Pressable style={styles.opcion} onPress={() => { setEditando(true); setErrorFormulario(null); }}
                      disabled={guardando} accessibilityRole="button" accessibilityState={{ disabled: guardando }}>
                      <ThemedText style={styles.centrado}>Editar perfil</ThemedText>
                    </Pressable>
                    <Pressable style={[styles.opcion, styles.eliminar]} onPress={confirmarEliminacion}
                      disabled={guardando} accessibilityRole="button" accessibilityState={{ disabled: guardando, busy: guardando }}>
                      <ThemedText style={styles.centrado}>{guardando ? 'Eliminando…' : 'Eliminar perfil'}</ThemedText>
                    </Pressable>
                    {errorFormulario && <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">{errorFormulario}</ThemedText>}
                  </>
                )}
              </ThemedView>
            )}
            <ThemedText type="small" style={styles.suave}>
              El perfil se guarda en este dispositivo. Tu edad, peso y estatura fijan límites de carga
              (series, intensidad y descanso) en cada rutina. Tu nombre nunca se envía a la IA.
            </ThemedText>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: BottomTabInset + Spacing.three, gap: Spacing.three },
  hero: { paddingVertical: Spacing.two, gap: 2 },
  titulo: { ...TIPO.tituloPantalla },
  tituloTarjeta: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  seccion: { ...TIPO.tituloTarjeta },
  suave: { color: T.suave },
  card: { gap: 14, padding: 20, borderRadius: 22, ...SOMBRA },
  input: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: 'transparent', borderRadius: 999, color: T.texto, backgroundColor: T.superficieAlta, fontSize: 16 },
  opcion: { minHeight: 48, padding: 14, borderRadius: 999, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: T.superficieAlta, justifyContent: 'center' },
  opcionSeleccionada: { borderColor: T.acento, backgroundColor: T.acentoSuave },
  botonPrincipal: { minHeight: 50, padding: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: T.acento },
  textoBoton: { color: T.sobreAcento, fontWeight: '700', textAlign: 'center' },
  centrado: { textAlign: 'center' },
  datos: { gap: 12 },
  eliminar: { backgroundColor: T.alertaFondo },
  deshabilitado: { opacity: 0.55 },
});
