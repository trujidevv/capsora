import { dosisDelDia, type EstadoDosis } from './dosis';
import { rangoFechas, type Fecha } from './fechas';
import type { MapaRegistros, Medicamento } from './tipos';

const ETIQUETA_ESTADO: Record<EstadoDosis, string> = {
  tomada: 'Tomada',
  omitida: 'Omitida',
  pendiente: 'Pendiente',
  atrasada: 'Atrasada',
  perdida: 'No marcada',
};

function celda(valor: string): string {
  if (/[";\n\r]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

function horaLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/**
 * Exporta el historial en CSV con ";" como separador (lo que espera Excel en español).
 * Garantía "antisecuestro": siempre disponible, gratis, con todos los datos.
 */
export function generarCSV(
  medicamentos: Medicamento[],
  registros: MapaRegistros,
  desde: Fecha,
  hasta: Fecha,
  ahora: Date,
): string {
  const filas = [
    [
      'Fecha',
      'Hora prevista',
      'Medicamento',
      'Dosis',
      'Estado',
      'Marcada a las',
    ],
  ];
  for (const fecha of rangoFechas(desde, hasta)) {
    for (const d of dosisDelDia(medicamentos, registros, fecha, ahora)) {
      if (d.estado === 'pendiente') continue;
      filas.push([
        fecha,
        d.hora,
        d.nombre,
        d.dosis ?? '',
        ETIQUETA_ESTADO[d.estado],
        horaLocal(d.confirmadoEn),
      ]);
    }
  }
  return filas.map(f => f.map(celda).join(';')).join('\n');
}
