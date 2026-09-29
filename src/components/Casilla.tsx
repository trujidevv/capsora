import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icono from './Icono';
import { minTouchTarget, radii, spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

interface Props {
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
  /** Texto (puede incluir enlaces como <Text onPress>) */
  children: React.ReactNode;
  error?: boolean;
}

/** Casilla de verificación grande (toda la fila se puede pulsar). */
export default function Casilla({
  marcada,
  onCambiar,
  children,
  error,
}: Props) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  return (
    <Pressable
      onPress={() => onCambiar(!marcada)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      style={({ pressed }) => [styles.fila, pressed && styles.pulsada]}
    >
      <View
        style={[
          styles.caja,
          marcada && styles.cajaMarcada,
          error && !marcada && styles.cajaError,
        ]}
      >
        {marcada ? (
          <Icono nombre="check" tamano={20} color={colores.textOnPrimary} />
        ) : null}
      </View>
      <Text style={[tipografia.body, styles.texto]}>{children}</Text>
    </Pressable>
  );
}

const useEstilos = crearEstilos(colores => ({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minTouchTarget,
    paddingVertical: spacing.xs,
  },
  caja: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colores.primary,
    backgroundColor: colores.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaMarcada: { backgroundColor: colores.primary },
  cajaError: { borderColor: colores.danger },
  pulsada: { opacity: 0.7 },
  texto: { flex: 1 },
}));
