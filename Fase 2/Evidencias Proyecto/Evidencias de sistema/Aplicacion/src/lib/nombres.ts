/**
 * Nombres amigables e indicación clave de cada ejercicio (propuesta del 05-11-2026, pendiente de revisión del
 * preparador físico). Solo se usan para mostrar: el generador, la IA, las fichas y el registro siguen usando los
 * identificadores y los nombres técnicos del catálogo, así que la evaluación de la IA no cambia.
 *
 * La indicación clave describe lo que distingue a la variante (cómo se reconoce), no la técnica completa, que sigue
 * en «Ver técnica paso a paso».
 */
export const NOMBRES: Readonly<Record<string, { nombre: string; indicacion?: string }>> = {
  K01: { nombre: 'Sentadilla', indicacion: 'Solo con tu peso corporal.' },
  K02: { nombre: 'Sentadilla con mancuerna', indicacion: 'Sostén una mancuerna frente al pecho con las dos manos.' },
  K03: { nombre: 'Zancada fija', indicacion: 'Un pie adelante y otro atrás; los pies no se mueven.' },
  K04: { nombre: 'Zancada fija con mancuerna', indicacion: 'Un pie adelante y otro atrás, con una mancuerna frente al pecho.' },
  K05: { nombre: 'Peso muerto rumano', indicacion: 'Con una mancuerna sujeta con las dos manos.' },
  K06: { nombre: 'Puente de glúteos', indicacion: 'Boca arriba, con los dos pies apoyados en el suelo.' },
  K07: { nombre: 'Puente con mancuerna', indicacion: 'Con una mancuerna sobre la cadera, sujeta con las dos manos.' },
  K08: { nombre: 'Puente a una pierna', indicacion: 'Sujeta la otra pierna por detrás del muslo.' },
  K09: { nombre: 'Elevación de talones', indicacion: 'En suelo plano y sin apoyarte en nada.' },
  K10: { nombre: 'Elevación de talones con mancuerna', indicacion: 'Con una mancuerna frente al pecho, sujeta con las dos manos.' },
  K11: { nombre: 'Dead bug inicial', indicacion: 'Boca arriba, parte con las manos y los pies apoyados.' },
  K12: { nombre: 'Dead bug', indicacion: 'Estira a la vez un brazo y la pierna del lado contrario.' },
  K13: { nombre: 'Bird dog', indicacion: 'En cuatro apoyos, estira un brazo y la pierna contraria.' },
  K14: { nombre: 'Plancha lateral con rodillas', indicacion: 'De lado, con el antebrazo y las rodillas en el suelo.' },
  P01: { nombre: 'Marcha' },
  P02: { nombre: 'Marcha con giros de hombros' },
  C01: { nombre: 'Caminata suave' },
  C02: { nombre: 'Estiramiento de glúteo' },
  C03: { nombre: 'Estiramiento de cuádriceps' },
};

export function nombreAmigable(id: string, respaldo: string): string {
  return NOMBRES[id]?.nombre ?? respaldo;
}

export function indicacionClave(id: string): string | null {
  return NOMBRES[id]?.indicacion ?? null;
}
