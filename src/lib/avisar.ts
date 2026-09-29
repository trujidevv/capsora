import { Alert, Platform, ToastAndroid } from 'react-native';
import { mensajeDeError } from './errores';

/** Mensaje corto que desaparece solo (en Android, un "toast"). */
export function avisoBreve(texto: string): void {
  if (Platform.OS === 'android') ToastAndroid.show(texto, ToastAndroid.LONG);
  else Alert.alert(texto);
}

export function mostrarError(
  error: unknown,
  titulo = 'No se ha podido completar',
): void {
  Alert.alert(titulo, mensajeDeError(error));
}

/** Pregunta de sí/no. Devuelve true si se confirma. */
export function confirmar(
  titulo: string,
  texto: string,
  textoSi: string,
  peligro = false,
): Promise<boolean> {
  return new Promise(resolver => {
    Alert.alert(
      titulo,
      texto,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
        {
          text: textoSi,
          style: peligro ? 'destructive' : 'default',
          onPress: () => resolver(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolver(false) },
    );
  });
}

/** Pregunta con varias respuestas (hasta 3 en Android). Devuelve el valor elegido. */
export function elegir<T>(
  titulo: string,
  texto: string,
  opciones: { texto: string; valor: T; estilo?: 'cancel' | 'destructive' }[],
  siCierra: T,
): Promise<T> {
  return new Promise(resolver => {
    Alert.alert(
      titulo,
      texto,
      opciones.map(o => ({
        text: o.texto,
        style: o.estilo ?? 'default',
        onPress: () => resolver(o.valor),
      })),
      { cancelable: true, onDismiss: () => resolver(siCierra) },
    );
  });
}
