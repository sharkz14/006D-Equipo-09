import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  evaluarFormularioDeadBug,
  formularioDeadBugVacio,
  type FormularioDeadBug,
} from '@/lib/ia/formulario-dead-bug';

type Props = {
  respuestas: FormularioDeadBug;
  onChange: (respuestas: FormularioDeadBug) => void;
};

function Opciones<T extends string>({ valor, opciones, onChange }: {
  valor: T | null;
  opciones: readonly { valor: T; texto: string }[];
  onChange: (valor: T) => void;
}) {
  return <>{opciones.map((opcion) => (
    <Pressable
      key={opcion.valor}
      accessibilityRole="radio"
      accessibilityState={{ checked: valor === opcion.valor }}
      onPress={() => onChange(opcion.valor)}
      style={[styles.opcion, valor === opcion.valor && styles.seleccionada]}
    >
      <ThemedText>{valor === opcion.valor ? '●' : '○'} {opcion.texto}</ThemedText>
    </Pressable>
  ))}</>;
}

export default function PreguntasDeadBug({ respuestas, onChange }: Props) {
  const estado = evaluarFormularioDeadBug(respuestas);
  const practico = respuestas.experiencia === 'practico';
  return (
    <ThemedView type="backgroundElement" style={styles.contenedor}>
      <ThemedText type="subtitle">Un dead bug según tu experiencia</ThemedText>
      <ThemedText type="small">
        Piloto de IA: estas respuestas ayudan a elegir entre el dead bug inicial (K11)
        y el dead bug con extensión (K12). Las preguntas son opcionales; sin respuestas
        completas se conserva la selección habitual.
      </ThemedText>
      <ThemedText>
        Piensa en esta variante: boca arriba, caderas y rodillas a unos 90°, brazos hacia
        el techo, alejando a la vez un brazo y la pierna contraria sin apoyarlos.
      </ThemedText>

      <ThemedText style={styles.pregunta}>¿Has hecho esa variante?</ThemedText>
      <Opciones<NonNullable<FormularioDeadBug['experiencia']>>
        valor={respuestas.experiencia}
        opciones={[
          { valor: 'nunca', texto: 'Nunca' },
          { valor: 'practico', texto: 'Sí, la he practicado' },
          { valor: 'desconocida', texto: 'No sé si era esta variante' },
        ]}
        onChange={(experiencia) => onChange({ ...formularioDeadBugVacio(), experiencia, core: respuestas.core })}
      />

      {practico && (
        <>
          <ThemedText style={styles.pregunta}>¿Cuándo fue la última vez?</ThemedText>
          <Opciones<NonNullable<FormularioDeadBug['antiguedad']>>
            valor={respuestas.antiguedad}
            opciones={[
              { valor: 'un_mes', texto: 'Hace aproximadamente un mes' },
              { valor: 'mas_de_12_meses', texto: 'Hace más de 12 meses' },
              { valor: 'desconocida', texto: 'No recuerdo cuándo' },
              { valor: 'otra', texto: 'En otro momento (por ejemplo, hace 3 a 11 meses)' },
            ]}
            onChange={(antiguedad) => onChange({ ...respuestas, antiguedad })}
          />
          <ThemedText style={styles.pregunta}>¿Cómo te resultó mantener la espalda baja estable?</ThemedText>
          <ThemedText type="small">
            Esta pregunta no evalúa síntomas. Si sentiste dolor, no continúes con la sesión.
          </ThemedText>
          <Opciones<NonNullable<FormularioDeadBug['control']>>
            valor={respuestas.control}
            opciones={[
              { valor: 'controlado', texto: 'Pude mantenerla estable' },
              { valor: 'dificultad_control', texto: 'Me costó mantenerla estable' },
              { valor: 'desconocido', texto: 'No lo recuerdo' },
            ]}
            onChange={(control) => onChange({ ...respuestas, control })}
          />
        </>
      )}

      {respuestas.experiencia !== null && (
        <>
          <ThemedText style={styles.pregunta}>¿Practicas ejercicios de core en el suelo?</ThemedText>
          <Opciones<NonNullable<FormularioDeadBug['core']>>
            valor={respuestas.core}
            opciones={[
              { valor: 'habitual_actual', texto: 'Sí, de forma habitual actualmente' },
              { valor: 'sin_practica_habitual', texto: 'No de forma habitual' },
              { valor: 'interrumpida_mas_de_12_meses', texto: 'Los practicaba, pero los dejé hace más de 12 meses' },
              { valor: 'desconocida', texto: 'No lo sé' },
            ]}
            onChange={(core) => onChange({ ...respuestas, core })}
          />
        </>
      )}

      <ThemedText type="small" accessibilityLiveRegion="polite">
        {estado.tipo === 'incoherente'
          ? estado.mensaje
          : estado.tipo === 'completa' && 'fueraDeEsquema' in estado.solicitud
            ? 'Esa fecha queda fuera de este piloto. Se usará la selección habitual.'
            : estado.tipo === 'completa'
              ? 'Respuestas completas. Al generar verás la elección y su motivo.'
              : 'Puedes completar las preguntas o continuar con la selección habitual.'}
      </ThemedText>
      {respuestas.experiencia !== null && (
        <Pressable accessibilityRole="button" style={styles.opcion} onPress={() => onChange(formularioDeadBugVacio())}>
          <ThemedText>Limpiar respuestas</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  pregunta: { fontWeight: '700' },
  opcion: { minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#B9B2C2' },
  seleccionada: { borderColor: '#7046B5' },
});
