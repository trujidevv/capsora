import { Alert } from 'react-native';
import type { ItemToma, ResultadoRegistro } from '../data/tomas';
import { estaHecha, type Dosis } from '../logic/dosis';
import type { EstadoRegistro } from '../logic/tipos';
import type { Fecha } from '../logic/fechas';
import { avisoBreve, mostrarError } from './avisar';

export interface AccionesDosis {
  marcar: (
    items: ItemToma[],
    estado: EstadoRegistro,
  ) => Promise<ResultadoRegistro>;
  deshacer: (horarioId: string, fecha: Fecha) => Promise<void>;
}

const item = (d: Dosis): ItemToma => ({
  horarioId: d.horarioId,
  fecha: d.fecha,
});

export async function marcarDosis(
  acciones: AccionesDosis,
  dosis: Dosis[],
  estado: EstadoRegistro,
): Promise<void> {
  try {
    const resultado = await acciones.marcar(dosis.map(item), estado);
    if (resultado === 'en_cola') {
      avisoBreve('Guardado en el móvil. Se enviará cuando vuelva internet.');
    } else if (estado === 'tomado') {
      avisoBreve(
        dosis.length > 1
          ? `${dosis.length} tomas marcadas`
          : `${dosis[0].nombre}: tomada ✓`,
      );
    }
  } catch (e) {
    mostrarError(e);
  }
}

/** Menú al pulsar una toma: tomar, no tomar o deshacer. */
export function opcionesDosis(acciones: AccionesDosis, d: Dosis): void {
  const detalle = [d.dosis, `a las ${d.hora}`].filter(Boolean).join(' · ');
  if (estaHecha(d)) {
    Alert.alert(
      d.nombre,
      `${detalle}\n\nMarcada como ${
        d.estado === 'tomada' ? 'tomada' : 'no tomada'
      }.`,
      [
        { text: 'Cerrar', style: 'cancel' },
        {
          text: 'Deshacer',
          style: 'destructive',
          onPress: () => {
            acciones.deshacer(d.horarioId, d.fecha).catch(e => mostrarError(e));
          },
        },
      ],
    );
    return;
  }
  Alert.alert(d.nombre, detalle, [
    {
      text: 'No la tomaré',
      onPress: () => marcarDosis(acciones, [d], 'omitido'),
    },
    { text: 'Cancelar', style: 'cancel' },
    { text: '✓ Tomada', onPress: () => marcarDosis(acciones, [d], 'tomado') },
  ]);
}
