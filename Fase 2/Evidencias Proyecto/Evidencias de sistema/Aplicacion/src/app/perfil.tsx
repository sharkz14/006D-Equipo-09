import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, useColorScheme, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePerfil } from '@/components/perfil-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { validarFormularioPerfil, type FormularioPerfil } from '@/lib/perfil';

const formularioVacio: FormularioPerfil = {
  nombre: '', edad: '', pesoKg: '', estaturaCm: '', nivel: 'P',
};

export default function PerfilScreen() {
  const { perfil, cargando, guardando, error, recargar, crear, actualizar, eliminar } = usePerfil();
  const [formulario, setFormulario] = useState<FormularioPerfil>(formularioVacio);
  const [editando, setEditando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const oscuro = useColorScheme() === 'dark';

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
      Alert.alert('Perfil guardado', 'Tus datos quedaron guardados en este dispositivo.');
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
    Alert.alert(
      '¿Eliminar tu perfil?',
      'Se borrarán tus datos de perfil de este dispositivo. Para generar otra rutina tendrás que crear un perfil nuevo.',
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

  const estiloInput = [styles.input, oscuro && styles.inputOscuro];
  const colorPlaceholder = oscuro ? '#ABA4B5' : '#6F687A';
  const mostrarFormulario = !perfil || editando;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedView style={styles.hero}>
              <ThemedText type="title">Mi perfil</ThemedText>
              <ThemedText>Tu punto de partida en Kinetia.</ThemedText>
            </ThemedView>

            {cargando ? (
              <ThemedView style={styles.card}>
                <ActivityIndicator color="#7046B5" accessibilityLabel="Cargando perfil" />
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
                <ThemedText type="subtitle">
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

                    <ThemedText type="subtitle">Experiencia entrenando fuerza</ThemedText>
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
            <ThemedText type="small">
              El perfil se guarda en este dispositivo. Por ahora, peso y estatura quedan registrados
              como datos de tu perfil; no ajustan los ejercicios ni su intensidad.
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
  hero: { alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.three },
  card: { gap: 16, padding: 20, borderRadius: 20 },
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#8D8398', borderRadius: 12, color: '#251E2E', backgroundColor: '#FFFFFF', fontSize: 16 },
  inputOscuro: { color: '#FAF7FF', backgroundColor: '#221C2B', borderColor: '#ADA3B7' },
  opcion: { minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#B9B2C2', justifyContent: 'center' },
  opcionSeleccionada: { borderColor: '#7046B5' },
  botonPrincipal: { minHeight: 48, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7046B5' },
  textoBoton: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  centrado: { textAlign: 'center' },
  datos: { gap: 12 },
  eliminar: { borderColor: '#C46170' },
  deshabilitado: { opacity: 0.55 },
});
