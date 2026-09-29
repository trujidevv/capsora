import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icono, { type NombreIcono } from './Icono';
import { minTouchTarget, radii, spacing, type Colores } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

type Tipo = 'info' | 'alerta' | 'peligro' | 'exito';

function estiloDe(
  colores: Colores,
): Record<
  Tipo,
  { fondo: string; borde: string; color: string; icono: NombreIcono }
> {
  return {
    info: {
      fondo: colores.primaryLight,
      borde: colores.primary,
      color: colores.primaryDark,
      icono: 'info',
    },
    alerta: {
      fondo: colores.warningLight,
      borde: colores.warning,
      color: colores.warningDark,
      icono: 'warning',
    },
    peligro: {
      fondo: colores.dangerLight,
      borde: colores.danger,
      color: colores.dangerDark,
      icono: 'warning-octagon',
    },
    exito: {
      fondo: colores.successLight,
      borde: colores.success,
      color: colores.successDark,
      icono: 'check-circle',
    },
  };
}

interface Props {
  tipo?: Tipo;
  titulo: string;
  texto?: string;
  accion?: { titulo: string; onPress: () => void };
}

/** Mensaje destacado dentro de una pantalla (no es una notificación). */
export default function Aviso({ tipo = 'info', titulo, texto, accion }: Props) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const e = estiloDe(colores)[tipo];
  return (
    <View
      style={[styles.caja, { backgroundColor: e.fondo, borderColor: e.borde }]}
      accessible
      accessibilityRole={
        tipo === 'peligro' || tipo === 'alerta' ? 'alert' : 'summary'
      }
    >
      <View style={styles.fila}>
        <Icono
          nombre={e.icono}
          tamano={24}
          color={e.color}
          style={styles.icono}
        />
        <View style={styles.textos}>
          <Text style={[tipografia.bodyStrong, { color: e.color }]}>
            {titulo}
          </Text>
          {texto ? <Text style={tipografia.body}>{texto}</Text> : null}
        </View>
      </View>
      {accion ? (
        <Pressable
          onPress={accion.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.accion,
            { borderColor: e.borde },
            pressed && styles.pulsada,
          ]}
        >
          <View style={styles.filaAccion}>
            <Text style={[tipografia.bodyStrong, { color: e.color }]}>
              {accion.titulo}
            </Text>
            <Icono nombre="caret-right" tamano={20} color={e.color} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const useEstilos = crearEstilos(colores => ({
  caja: {
    borderWidth: 1.5,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fila: { flexDirection: 'row', gap: spacing.sm },
  icono: { marginTop: 1 },
  filaAccion: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  textos: { flex: 1, gap: spacing.xs },
  accion: {
    minHeight: minTouchTarget,
    borderWidth: 1.5,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.surface,
  },
  pulsada: { opacity: 0.8 },
}));
