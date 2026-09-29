import React from 'react';
import { Text, View } from 'react-native';
import Icono from './Icono';
import type { DatosPaciente } from '../data/paciente';
import {
  dosisDelDia,
  estadoParaCuidador,
  latidoValido,
  resumir,
  tomasVencidas,
  type EstadoCuidador,
} from '../logic/dosis';
import { haceCuanto, hoy } from '../logic/fechas';
import { spacing, FUENTE } from '../theme/theme';
import EtiquetaEstado from './EtiquetaEstado';
import { crearEstilos, useTema } from '../lib/TemaContext';

export const EXPLICACION_CUIDADOR: Record<EstadoCuidador, string> = {
  verde: 'Ha tomado todo lo que le tocaba hasta ahora.',
  ambar: 'Tiene alguna toma atrasada o ha marcado que no la tomaba.',
  rojo: 'Hay tomas que no se han marcado como hechas.',
  neutro: 'Hoy no tiene tomas programadas.',
  desconocido:
    'Hay tomas sin marcar, pero su móvil no da señales (o tiene los avisos desactivados). Puede que se la haya tomado y no lo sepamos: mejor llama para confirmarlo.',
};

export function calcularEstadoPaciente(datos: DatosPaciente, ahora: Date) {
  const dosis = dosisDelDia(
    datos.medicamentos,
    datos.registros,
    hoy(ahora),
    ahora,
  );
  const resumen = resumir(dosis);
  return {
    dosis,
    resumen,
    estado: estadoParaCuidador(resumen, datos.latido, ahora),
  };
}

export function TextoLatido({
  datos,
  ahora,
}: {
  datos: DatosPaciente;
  ahora: Date;
}) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  if (!datos.latido) {
    return (
      <Text style={tipografia.caption}>
        Su móvil aún no ha enviado ninguna señal.
      </Text>
    );
  }
  const hace = haceCuanto(new Date(datos.latido.recibidoEn), ahora);
  if (!datos.latido.notificacionesOk) {
    return (
      <Text style={[tipografia.caption, styles.alerta]}>
        <Icono nombre="warning" tamano={16} color={colores.warningDark} /> Tiene
        los avisos desactivados en el móvil (señal {hace}).
      </Text>
    );
  }
  return (
    <Text
      style={[
        tipografia.caption,
        !latidoValido(datos.latido, ahora) && styles.alerta,
      ]}
    >
      Última señal de su móvil: {hace}
    </Text>
  );
}

/** Estado de hoy de la persona cuidada, en grande. */
export default function ResumenPaciente({
  datos,
  ahora,
}: {
  datos: DatosPaciente;
  ahora: Date;
}) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const { resumen, estado } = calcularEstadoPaciente(datos, ahora);
  const vencidas = tomasVencidas(resumen);
  const partes: string[] = [];
  if (resumen.total > 0) {
    partes.push(
      vencidas === 0
        ? 'Aún no le tocaba ninguna toma'
        : `${resumen.tomadas} de ${vencidas} tomas hechas hasta ahora`,
    );
    if (resumen.omitidas > 0)
      partes.push(
        `${resumen.omitidas} no tomada${resumen.omitidas > 1 ? 's' : ''}`,
      );
    if (resumen.pendientes > 0) partes.push(`${resumen.pendientes} más tarde`);
  }
  return (
    <View style={styles.resumen}>
      <EtiquetaEstado estado={estado} />
      {partes.length > 0 ? (
        <Text style={tipografia.bodyStrong}>{partes.join(' · ')}</Text>
      ) : null}
      <TextoLatido datos={datos} ahora={ahora} />
    </View>
  );
}

const useEstilos = crearEstilos(colores => ({
  resumen: { gap: spacing.xs },
  alerta: { fontFamily: FUENTE, color: colores.warningDark, fontWeight: '600' },
}));
