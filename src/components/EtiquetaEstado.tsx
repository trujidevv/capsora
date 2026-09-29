import React from 'react';
import { Text, View } from 'react-native';
import Icono, { type NombreIcono } from './Icono';
import type { EstadoCuidador, EstadoDosis } from '../logic/dosis';
import { radii, spacing, type Colores, FUENTE } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

type Estado = EstadoDosis | EstadoCuidador;

export function infoEstado(
  colores: Colores,
): Record<
  Estado,
  { texto: string; icono: NombreIcono; fondo: string; color: string }
> {
  return {
    tomada: {
      texto: 'Tomada',
      icono: 'check',
      fondo: colores.successLight,
      color: colores.successDark,
    },
    omitida: {
      texto: 'Omitida',
      icono: 'minus',
      fondo: colores.unknownLight,
      color: colores.unknownDark,
    },
    pendiente: {
      texto: 'Pendiente',
      icono: 'clock',
      fondo: colores.primaryLight,
      color: colores.primaryDark,
    },
    atrasada: {
      texto: 'Atrasada',
      icono: 'warning',
      fondo: colores.warningLight,
      color: colores.warningDark,
    },
    perdida: {
      texto: 'Sin tomar',
      icono: 'x',
      fondo: colores.dangerLight,
      color: colores.dangerDark,
    },
    verde: {
      texto: 'Todo en orden',
      icono: 'check',
      fondo: colores.successLight,
      color: colores.successDark,
    },
    ambar: {
      texto: 'Hay algo pendiente',
      icono: 'warning',
      fondo: colores.warningLight,
      color: colores.warningDark,
    },
    rojo: {
      texto: 'Tomas sin hacer',
      icono: 'x',
      fondo: colores.dangerLight,
      color: colores.dangerDark,
    },
    neutro: {
      texto: 'Sin tomas hoy',
      icono: 'minus',
      fondo: colores.unknownLight,
      color: colores.unknownDark,
    },
    desconocido: {
      texto: 'No podemos confirmar',
      icono: 'question',
      fondo: colores.unknownLight,
      color: colores.unknownDark,
    },
  };
}

export default function EtiquetaEstado({
  estado,
  texto,
}: {
  estado: Estado;
  texto?: string;
}) {
  const { colores } = useTema();
  const styles = useEstilos();
  const info = infoEstado(colores)[estado];
  return (
    <View style={[styles.etiqueta, { backgroundColor: info.fondo }]}>
      <Icono nombre={info.icono} tamano={16} color={info.color} />
      <Text style={[styles.texto, { color: info.color }]}>
        {texto ?? info.texto}
      </Text>
    </View>
  );
}

const useEstilos = crearEstilos(() => ({
  etiqueta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  texto: { fontFamily: FUENTE, fontSize: 16, fontWeight: '700' },
}));
