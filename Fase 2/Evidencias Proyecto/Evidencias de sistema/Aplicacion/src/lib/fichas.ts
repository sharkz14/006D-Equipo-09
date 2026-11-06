/**
 * Instrucciones para la sesión guiada, copiadas sin cambios de las fichas simples v0.1 del repositorio
 * («Cómo hacerlo», «Dos puntos técnicos» y «Dos errores frecuentes»). Son borradores pendientes de revisión
 * profesional. Archivo generado por herramientas/extraer_fichas.py: no editar a mano.
 */
export interface FichaApp {
  id: string;
  titulo: string;
  pasos: string[];
  puntos: string[];
  errores: string[];
  /** La ficha marca este texto como «borrador para la app». */
  textoBorrador: boolean;
  archivo: string;
}

export const FICHAS: Record<string, FichaApp> = {
  "K05": {
    "id": "K05",
    "titulo": "Peso muerto rumano bilateral con una mancuerna",
    "pasos": [
      "Con la mancuerna ya sujeta delante de los muslos, separa los pies al ancho de las caderas y flexiona ligeramente las rodillas.",
      "Lleva las caderas hacia atrás mientras inclinas el tronco desde la cadera, manteniendo estable la espalda.",
      "Baja la mancuerna cerca del cuerpo, con los brazos extendidos. Detén el descenso antes de perder esa posición; no necesitas alcanzar el suelo.",
      "Empuja el suelo y lleva las caderas hacia delante para volver a estar de pie, sin inclinarte hacia atrás al terminar."
    ],
    "puntos": [
      "Conserva una ligera flexión de rodillas.",
      "Acompaña la inclinación del tronco con la cabeza, sin levantar la mirada al frente."
    ],
    "errores": [
      "Bajar principalmente doblando más las rodillas.",
      "Buscar más profundidad redondeando la espalda."
    ],
    "textoBorrador": true,
    "archivo": "Kinetia_ficha_simple_K05_v0.1.md"
  },
  "C02": {
    "id": "C02",
    "titulo": "Estiramiento de glúteo boca arriba",
    "pasos": [
      "Túmbate boca arriba y acerca las rodillas al pecho.",
      "Cruza una pierna sobre el muslo contrario. Sujeta detrás de ese muslo con ambas manos y acércalo suavemente.",
      "Mantén el tiempo indicado, suelta y cambia de lado."
    ],
    "puntos": [
      "Respira con normalidad.",
      "Busca una tensión suave, sin dolor."
    ],
    "errores": [
      "Tirar con fuerza.",
      "Hacer rebotes."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_C02_C03_v0.1.md"
  },
  "C03": {
    "id": "C03",
    "titulo": "Estiramiento de cuádriceps acostado de lado",
    "pasos": [
      "Túmbate de lado y sostén la cabeza con la mano inferior.",
      "Sujeta la parte superior del pie de arriba y acerca suavemente el talón al glúteo, manteniendo las rodillas juntas.",
      "Mantén el tiempo indicado, suelta y cambia de lado."
    ],
    "puntos": [
      "Respira con normalidad.",
      "Usa una tensión suave, sin dolor."
    ],
    "errores": [
      "Tirar bruscamente del pie.",
      "Hacer rebotes."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_C02_C03_v0.1.md"
  },
  "K01": {
    "id": "K01",
    "titulo": "Sentadilla con peso corporal",
    "pasos": [
      "Separa los pies un poco más que tus caderas, con las puntas ligeramente hacia fuera y los brazos junto al cuerpo.",
      "Flexiona caderas y rodillas para bajar con control.",
      "Mantén los pies apoyados y el tronco estable.",
      "Empuja el suelo para volver a levantarte; suelta el aire al subir."
    ],
    "puntos": [
      "Orienta las rodillas con los pies.",
      "Sube caderas y tronco juntos."
    ],
    "errores": [
      "Levantar los talones.",
      "Dejarse caer o rebotar."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K01_K02_v0.1.md"
  },
  "K02": {
    "id": "K02",
    "titulo": "Sentadilla goblet con una mancuerna",
    "pasos": [
      "Sujeta una mancuerna vertical cerca del pecho, con ambas manos por su extremo superior.",
      "Coloca los pies en una posición estable y flexiona caderas y rodillas para bajar.",
      "Mantén los pies apoyados y la mancuerna cerca del cuerpo.",
      "Vuelve a levantarte con control, sin balancear la carga."
    ],
    "puntos": [
      "Conserva un agarre firme.",
      "Mantén estable el tronco."
    ],
    "errores": [
      "Alejar la mancuerna del pecho.",
      "Moverla con tirones."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K01_K02_v0.1.md"
  },
  "K03": {
    "id": "K03",
    "titulo": "Sentadilla dividida estática sin carga",
    "pasos": [
      "Coloca un pie delante y otro detrás, separados también hacia los lados. Pon las manos en las caderas.",
      "Mantén apoyado el pie delantero y eleva el talón trasero, dejando su parte delantera en el suelo.",
      "Flexiona ambas rodillas para bajar con control, sin desplazar los pies.",
      "Vuelve a subir a la misma posición. Completa las repeticiones antes de cambiar la pierna que está delante."
    ],
    "puntos": [
      "Orienta la rodilla delantera con su pie.",
      "Mantén el tronco y la pelvis estables."
    ],
    "errores": [
      "Levantar el talón delantero.",
      "Colocar los pies en una línea demasiado estrecha y perder estabilidad."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K03_K04_v0.1.md"
  },
  "K04": {
    "id": "K04",
    "titulo": "Sentadilla dividida estática goblet",
    "pasos": [
      "Con la mancuerna vertical cerca del pecho y ambas manos sujetándola, coloca un pie delante y otro detrás, con separación lateral.",
      "Mantén apoyado el pie delantero y el antepié trasero, con el talón trasero elevado.",
      "Flexiona ambas rodillas y baja con control, manteniendo los pies en su sitio y la carga cerca del cuerpo.",
      "Vuelve a subir a la posición dividida. Termina las repeticiones antes de cambiar de lado."
    ],
    "puntos": [
      "Conserva estable el apoyo delantero.",
      "Mantén el agarre firme y el tronco controlado."
    ],
    "errores": [
      "Alejar la mancuerna del pecho.",
      "Girar o desplazar los pies durante el descenso."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K03_K04_v0.1.md"
  },
  "K06": {
    "id": "K06",
    "titulo": "Puente de glúteos bilateral en el suelo",
    "pasos": [
      "Túmbate boca arriba, flexiona las rodillas y apoya los pies al ancho de las caderas. Deja los brazos a los lados.",
      "Activa suavemente el abdomen y presiona el suelo con los pies.",
      "Eleva la pelvis contrayendo los glúteos, sin arquear la zona lumbar para subir más.",
      "Baja la pelvis de forma controlada y repite."
    ],
    "puntos": [
      "Conserva los talones apoyados.",
      "Acompaña la subida soltando el aire, sin contener la respiración."
    ],
    "errores": [
      "Buscar altura arqueando la espalda.",
      "Dejar caer la pelvis al bajar."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K06_K08_v0.1.md"
  },
  "K07": {
    "id": "K07",
    "titulo": "Puente bilateral con una mancuerna sobre la pelvis",
    "pasos": [
      "Boca arriba, con rodillas flexionadas y pies apoyados, mantén la mancuerna atravesada sobre la pelvis y sujétala con ambas manos.",
      "Activa suavemente el abdomen y presiona el suelo con los pies.",
      "Eleva la pelvis con los glúteos mientras mantienes la carga estable, sin arquear la espalda para subir más.",
      "Baja de forma controlada sin soltar la mancuerna."
    ],
    "puntos": [
      "Controla la carga con ambas manos durante toda la repetición.",
      "Conserva los pies apoyados."
    ],
    "errores": [
      "Permitir que la mancuerna ruede o se desplace.",
      "Impulsar la subida arqueando la zona lumbar."
    ],
    "textoBorrador": true,
    "archivo": "Kinetia_fichas_simples_K06_K08_v0.1.md"
  },
  "K08": {
    "id": "K08",
    "titulo": "Puente de glúteos unilateral en el suelo",
    "pasos": [
      "Túmbate boca arriba. Sujeta un muslo por detrás con ambas manos y acerca suavemente esa rodilla al pecho.",
      "Apoya el otro pie ligeramente hacia el centro del cuerpo y activa el abdomen.",
      "Eleva la pelvis presionando con el pie apoyado, sin girarte ni arquear la espalda.",
      "Baja despacio. Completa ese lado antes de cambiar de pierna."
    ],
    "puntos": [
      "Mantén el pie de apoyo completo en el suelo.",
      "Conserva la pelvis estable durante el recorrido."
    ],
    "errores": [
      "Girar la pelvis al subir.",
      "Despegar el talón de apoyo."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K06_K08_v0.1.md"
  },
  "K09": {
    "id": "K09",
    "titulo": "Elevación bilateral de talones en el suelo",
    "pasos": [
      "Ponte de pie con los pies al ancho de las caderas, orientados hacia delante y los brazos relajados.",
      "Eleva lentamente ambos talones, manteniendo apoyada la parte delantera de los pies.",
      "Mantén el cuerpo erguido y sube solo hasta donde puedas conservar el equilibrio.",
      "Baja con control hasta apoyar los talones en el suelo y repite."
    ],
    "puntos": [
      "Mantén las rodillas extendidas sin forzarlas hacia atrás.",
      "Conserva la orientación de los pies durante el movimiento."
    ],
    "errores": [
      "Rebotar o dejar caer los talones.",
      "Doblar las rodillas para impulsarse."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K09_K10_v0.1.md"
  },
  "K10": {
    "id": "K10",
    "titulo": "Elevación bilateral de talones con una mancuerna",
    "pasos": [
      "Con la mancuerna ya sujeta cerca del pecho, coloca los pies al ancho de las caderas y orientados hacia delante.",
      "Eleva ambos talones despacio, conservando el apoyo de la parte delantera de los pies.",
      "Mantén el tronco erguido y la carga quieta; conserva las rodillas extendidas sin forzarlas.",
      "Baja los talones hasta el suelo de forma controlada, sin rebote."
    ],
    "puntos": [
      "Conserva el agarre con ambas manos y la carga cerca del cuerpo.",
      "Limita la altura a la que puedas mantener el equilibrio."
    ],
    "errores": [
      "Balancear la mancuerna para impulsarse.",
      "Inclinar el tronco mientras suben los talones."
    ],
    "textoBorrador": true,
    "archivo": "Kinetia_fichas_simples_K09_K10_v0.1.md"
  },
  "K11": {
    "id": "K11",
    "titulo": "Dead bug inicial desde apoyos en el suelo",
    "pasos": [
      "Boca arriba, dobla las rodillas, apoya los pies y deja las manos en el suelo más allá de la cabeza.",
      "Activa suavemente el abdomen mientras sigues respirando.",
      "Eleva el brazo derecho y la pierna izquierda, con la rodilla doblada.",
      "Regresa al apoyo y repite con el brazo izquierdo y la pierna derecha."
    ],
    "puntos": [
      "Mueve juntos brazo y pierna contrarios.",
      "Conserva quietas la pelvis y la espalda."
    ],
    "errores": [
      "Levantar las dos piernas a la vez.",
      "Contener la respiración."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K11_K12_v0.1.md"
  },
  "K12": {
    "id": "K12",
    "titulo": "Dead bug con extensión contralateral",
    "pasos": [
      "Boca arriba, eleva los brazos al techo y dobla caderas y rodillas a unos 90°.",
      "Activa el abdomen y conserva un contacto suave de la zona lumbar con el suelo.",
      "Lleva el brazo derecho hacia atrás mientras estiras la pierna izquierda, sin apoyarlos ni arquear la espalda.",
      "Regresa y alterna: brazo izquierdo y pierna derecha."
    ],
    "puntos": [
      "Acorta el recorrido si pierdes el control de la espalda.",
      "Respira durante el movimiento."
    ],
    "errores": [
      "Arquear la zona lumbar para alcanzar más lejos.",
      "Mover las extremidades con tirones."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K11_K12_v0.1.md"
  },
  "K13": {
    "id": "K13",
    "titulo": "Bird dog contralateral",
    "pasos": [
      "Apoya las manos bajo los hombros y las rodillas bajo las caderas, con los dedos de los pies recogidos y apoyados.",
      "Activa el abdomen y mira hacia el suelo.",
      "Alarga un brazo hacia delante y la pierna contraria hacia atrás, sin mover la pelvis ni arquear la espalda.",
      "Regresa despacio a los apoyos y alterna."
    ],
    "puntos": [
      "Conserva la cabeza alineada con el tronco.",
      "Eleva las extremidades solo hasta donde mantengas el control."
    ],
    "errores": [
      "Girar la pelvis.",
      "Levantar demasiado la pierna y arquear la zona lumbar."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K13_K14_v0.1.md"
  },
  "K14": {
    "id": "K14",
    "titulo": "Plancha lateral con rodillas apoyadas",
    "pasos": [
      "Túmbate de lado, superpone las piernas y dobla las rodillas cómodamente.",
      "Apoya el antebrazo con el codo bajo el hombro; deja la mano superior sobre la cadera.",
      "Activa el abdomen y eleva la pelvis, manteniendo la rodilla inferior apoyada y el tronco alineado.",
      "Sostén el tiempo indicado mientras respiras y baja con control."
    ],
    "puntos": [
      "Conserva la alineación de cabeza y tronco.",
      "Mantén el pecho orientado hacia delante."
    ],
    "errores": [
      "Dejar caer la pelvis.",
      "Girar el tronco hacia el suelo."
    ],
    "textoBorrador": false,
    "archivo": "Kinetia_fichas_simples_K13_K14_v0.1.md"
  }
};
