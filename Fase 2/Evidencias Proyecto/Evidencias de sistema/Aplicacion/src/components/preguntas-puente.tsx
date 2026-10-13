import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formularioPuenteVacio, solicitudDesdeFormulario, type FormularioPuente } from '@/lib/ia/formulario-puente';

type Props = {
  respuestas: FormularioPuente;
  onChange: (respuestas: FormularioPuente) => void;
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

export default function PreguntasPuente({ respuestas, onChange }: Props) {
  const solicitud = solicitudDesdeFormulario(respuestas);
  return (
    <ThemedView type="backgroundElement" style={styles.contenedor}>
      <ThemedText type="subtitle">Un puente según tu experiencia</ThemedText>
      <ThemedText type="small">
        Piloto de IA: estas respuestas ayudan a elegir entre puente bilateral (K06)
        y unilateral (K08). Las preguntas son opcionales; sin respuestas completas
        se conserva la selección habitual.
      </ThemedText>
      <ThemedText>
        Piensa en esta variante: puente sobre una pierna, con la otra flexionada
        hacia el pecho y sostenida con las manos detrás del muslo.
      </ThemedText>
      <ThemedText style={styles.pregunta}>¿Has hecho esa variante?</ThemedText>
      <Opciones<FormularioPuente['experiencia'] & string>
        valor={respuestas.experiencia}
        opciones={[
          { valor: 'nunca', texto: 'Nunca' },
          { valor: 'alguna_vez', texto: 'Alguna vez' },
          { valor: 'habitual', texto: 'Era habitual cuando la practicaba' },
          { valor: 'desconocida', texto: 'No recuerdo si era esta variante' },
        ]}
        onChange={(experiencia) => onChange({ ...formularioPuenteVacio(), experiencia })}
      />
      {respuestas.experiencia !== null && respuestas.experiencia !== 'nunca' && (
        <>
          <ThemedText style={styles.pregunta}>¿Cuándo fue la última vez?</ThemedText>
          <Opciones<FormularioPuente['recencia'] & string>
            valor={respuestas.recencia}
            opciones={[
              { valor: 'menos_3_meses', texto: 'Hace menos de 3 meses' },
              { valor: 'entre_3_y_12_meses', texto: 'Hace entre 3 y 12 meses, incluidos ambos límites' },
              { valor: 'mas_12_meses', texto: 'Hace más de 12 meses' },
              { valor: 'desconocida', texto: 'No recuerdo cuándo' },
            ]}
            onChange={(recencia) => onChange({ ...respuestas, recencia })}
          />
          <ThemedText style={styles.pregunta}>¿Qué tenías planificado esa vez?</ThemedText>
          <ThemedText type="small">
            Este piloto compara experiencias con 2 series de 6 repeticiones por
            lado, 30 segundos de descanso entre lados y 90 segundos entre series.
          </ThemedText>
          <Opciones<FormularioPuente['dosisPrevia'] & string>
            valor={respuestas.dosisPrevia}
            opciones={[
              { valor: 'coincide', texto: 'Sí, esa era la cantidad y los descansos planificados' },
              { valor: 'otra_o_desconocida', texto: 'Era diferente o no lo recuerdo' },
            ]}
            onChange={(dosisPrevia) => onChange({ ...respuestas, dosisPrevia })}
          />
          <ThemedText style={styles.pregunta}>¿Cómo terminó ese intento?</ThemedText>
          <Opciones<FormularioPuente['final'] & string>
            valor={respuestas.final}
            opciones={[
              { valor: 'con_margen', texto: 'Completé lo planificado y sentía que podía hacer más' },
              { valor: 'justo', texto: 'Completé lo planificado, pero llegué justo' },
              { valor: 'paro_antes_por_esfuerzo', texto: 'Paré antes por cansancio, sin dolor ni otros síntomas' },
              { valor: 'desconocido', texto: 'No recuerdo cómo terminé' },
            ]}
            onChange={(final) => onChange({ ...respuestas, final })}
          />
        </>
      )}
      <ThemedText type="small" accessibilityLiveRegion="polite">
        {solicitud?.dosisPrevia === 'otra_o_desconocida'
          ? 'La experiencia queda fuera de este piloto. Se usará la selección habitual.'
          : solicitud
            ? 'Respuestas completas. Al generar verás la elección y su motivo.'
            : 'Puedes completar las preguntas o continuar con la selección habitual.'}
      </ThemedText>
      {respuestas.experiencia !== null && (
        <Pressable accessibilityRole="button" style={styles.opcion} onPress={() => onChange(formularioPuenteVacio())}>
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
