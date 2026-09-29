import { CLAVES, guardarJSON, leerJSON } from './almacen';

export const bienvenidaVista = () =>
  leerJSON<boolean>(CLAVES.bienvenida, false);
export const marcarBienvenidaVista = () => guardarJSON(CLAVES.bienvenida, true);
