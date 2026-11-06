import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Igual que Alert.alert, pero también funciona en la versión web.
 * En la web Alert.alert no muestra nada, así que ahí se usan los diálogos del navegador:
 * cada acción se ofrece con «Aceptar» (primero las normales y al final las destructivas);
 * si se rechazan todas, se ejecuta la opción de cancelar.
 */
export function alerta(titulo: string, mensaje?: string, botones?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(titulo, mensaje, botones);
    return;
  }
  const texto = mensaje ? `${titulo}\n\n${mensaje}` : titulo;
  const lista = botones ?? [];
  const cancelar = lista.find((b) => b.style === 'cancel');
  const acciones = [
    ...lista.filter((b) => b.style !== 'cancel' && b.style !== 'destructive'),
    ...lista.filter((b) => b.style === 'destructive'),
  ];
  if (acciones.length === 0) {
    window.alert(texto);
    cancelar?.onPress?.();
    return;
  }
  if (acciones.length === 1 && !cancelar) {
    window.alert(texto);
    acciones[0].onPress?.();
    return;
  }
  for (const accion of acciones) {
    const pie = `Aceptar: ${accion.text ?? 'Sí'}${cancelar ? `\nCancelar: ${acciones.length > 1 && accion !== acciones[acciones.length - 1]
      ? 'ver otras opciones' : cancelar.text ?? 'Volver'}` : ''}`;
    if (window.confirm(`${texto}\n\n${pie}`)) {
      accion.onPress?.();
      return;
    }
  }
  cancelar?.onPress?.();
}
