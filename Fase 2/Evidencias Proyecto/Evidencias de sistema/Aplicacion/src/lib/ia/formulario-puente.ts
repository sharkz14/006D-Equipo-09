import type { EntradasPuente, SolicitudPuente } from './selector-puente';

export type FormularioPuente = {
  experiencia: EntradasPuente['experiencia_k08'] | null;
  recencia: Exclude<EntradasPuente['recencia_k08'], 'no_aplica'> | null;
  final: Exclude<EntradasPuente['fin_ultima_k08'], 'no_aplica'> | null;
  dosisPrevia: 'coincide' | 'otra_o_desconocida' | null;
};

export function formularioPuenteVacio(): FormularioPuente {
  return { experiencia: null, recencia: null, final: null, dosisPrevia: null };
}

/** Una pregunta sin responder no equivale a la respuesta explícita «no recuerdo». */
export function solicitudDesdeFormulario(formulario: FormularioPuente): SolicitudPuente | undefined {
  if (formulario.experiencia === 'nunca') {
    return {
      entradas: { experiencia_k08: 'nunca', recencia_k08: 'no_aplica', fin_ultima_k08: 'no_aplica' },
      dosisPrevia: 'no_aplica',
    };
  }
  if (formulario.experiencia === null || formulario.recencia === null ||
      formulario.final === null || formulario.dosisPrevia === null) return undefined;
  return {
    entradas: {
      experiencia_k08: formulario.experiencia,
      recencia_k08: formulario.recencia,
      fin_ultima_k08: formulario.final,
    },
    dosisPrevia: formulario.dosisPrevia,
  };
}
