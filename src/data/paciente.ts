import { hoy, sumarDias } from '../logic/fechas';
import {
  mapaDeRegistros,
  type Latido,
  type MapaRegistros,
  type Medicamento,
} from '../logic/tipos';
import { obtenerLatido } from './latidos';
import { obtenerMedicamentos } from './medicamentos';
import { obtenerRegistros } from './tomas';

export interface DatosPaciente {
  medicamentos: Medicamento[];
  registros: MapaRegistros;
  latido: Latido | null;
}

/** Lo que el cuidador puede ver de la persona que cuida (solo lectura, lo garantiza RLS). */
export async function obtenerDatosPaciente(
  pacienteId: string,
  dias = 7,
): Promise<DatosPaciente> {
  const [medicamentos, latido] = await Promise.all([
    obtenerMedicamentos(pacienteId),
    obtenerLatido(pacienteId).catch(() => null),
  ]);
  const ids = medicamentos.flatMap(m => m.horarios.map(h => h.id));
  const registros = await obtenerRegistros(
    ids,
    sumarDias(hoy(), -(dias - 1)),
    hoy(),
  );
  return { medicamentos, registros: mapaDeRegistros(registros), latido };
}
