import type { EntradasK11K12 } from './selectorK11K12';

/**
 * Respuestas de la pantalla para el piloto K11/K12. `null` = pregunta sin responder,
 * que NO equivale a «no lo sé». `otra` = fecha fuera de las categorías del modelo.
 */
export type FormularioDeadBug = {
  experiencia: EntradasK11K12['experiencia_k12'] | null;
  control: Exclude<EntradasK11K12['control_k12'], 'no_aplica'> | null;
  antiguedad: Exclude<EntradasK11K12['antiguedad_k12'], 'no_aplica'> | 'otra' | null;
  core: EntradasK11K12['historia_core'] | null;
};

/** Lo que recibe el generador: entradas completas o una respuesta fuera del esquema. */
export type SolicitudDeadBug =
  | { entradas: EntradasK11K12 }
  | { fueraDeEsquema: 'fecha_no_contemplada' };

export type EstadoFormularioDeadBug =
  | { tipo: 'completa'; solicitud: SolicitudDeadBug }
  | { tipo: 'incompleta' }
  | { tipo: 'incoherente'; mensaje: string };

export function formularioDeadBugVacio(): FormularioDeadBug {
  return { experiencia: null, control: null, antiguedad: null, core: null };
}

export function evaluarFormularioDeadBug(f: FormularioDeadBug): EstadoFormularioDeadBug {
  if (f.experiencia === null || f.core === null) return { tipo: 'incompleta' };
  if (f.experiencia === 'nunca') {
    return { tipo: 'completa', solicitud: { entradas: {
      experiencia_k12: 'nunca', control_k12: 'no_aplica',
      historia_core: f.core, antiguedad_k12: 'no_aplica' } } };
  }
  if (f.experiencia === 'desconocida') {
    return { tipo: 'completa', solicitud: { entradas: {
      experiencia_k12: 'desconocida', control_k12: 'desconocido',
      historia_core: f.core, antiguedad_k12: 'desconocida' } } };
  }
  if (f.control === null || f.antiguedad === null) return { tipo: 'incompleta' };
  if (f.antiguedad === 'otra') {
    return { tipo: 'completa', solicitud: { fueraDeEsquema: 'fecha_no_contemplada' } };
  }
  if (f.antiguedad === 'un_mes' && f.core === 'interrumpida_mas_de_12_meses') {
    return { tipo: 'incoherente', mensaje:
      'Si hiciste esta variante hace un mes, no dejaste el core hace más de 12 meses. Revisa una de las dos respuestas.' };
  }
  return { tipo: 'completa', solicitud: { entradas: {
    experiencia_k12: 'practico', control_k12: f.control,
    historia_core: f.core, antiguedad_k12: f.antiguedad } } };
}

export function solicitudDeadBugDesdeFormulario(f: FormularioDeadBug): SolicitudDeadBug | undefined {
  const estado = evaluarFormularioDeadBug(f);
  return estado.tipo === 'completa' ? estado.solicitud : undefined;
}
