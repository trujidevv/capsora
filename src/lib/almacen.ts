import AsyncStorage from '@react-native-async-storage/async-storage';

/** Claves de todo lo que la app guarda en el móvil. */
export const CLAVES = {
  agenda: 'medi.agenda.v1',
  registradas: 'medi.registradas.v2',
  cola: 'medi.cola-tomas.v1',
  ajustes: 'medi.ajustes.v1',
  latido: 'medi.latido.v1',
  bienvenida: 'medi.bienvenida.v1',
  instantanea: 'medi.instantanea.v1',
  usuario: 'medi.usuario.v1',
  renovacion: 'medi.renovacion.v1',
  /** Nombre de quien me cuida, para enseñarlo en Hoy también sin conexión */
  miCuidador: 'medi.mi-cuidador.v1',
  /** Tema elegido en Ajustes; es del móvil, no se borra al cerrar sesión */
  tema: 'medi.tema.v1',
  /** Enviar informes de fallos (Ajustes); también es del móvil */
  informesFallos: 'medi.informes-fallos.v1',
} as const;

/** Lo que se borra al cerrar sesión (los ajustes del dispositivo se conservan). */
export const CLAVES_DE_USUARIO = [
  CLAVES.agenda,
  CLAVES.registradas,
  CLAVES.cola,
  CLAVES.latido,
  CLAVES.instantanea,
  CLAVES.usuario,
  CLAVES.renovacion,
  CLAVES.miCuidador,
];

export async function leerJSON<T>(clave: string, porDefecto: T): Promise<T> {
  try {
    const texto = await AsyncStorage.getItem(clave);
    return texto ? (JSON.parse(texto) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

export async function guardarJSON(
  clave: string,
  valor: unknown,
): Promise<void> {
  await AsyncStorage.setItem(clave, JSON.stringify(valor));
}

export async function borrarClaves(claves: string[]): Promise<void> {
  await AsyncStorage.removeMany(claves);
}
