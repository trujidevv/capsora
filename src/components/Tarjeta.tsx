import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { minTouchTarget, radii, spacing } from '../theme/theme';
import { crearEstilos } from '../lib/TemaContext';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function Tarjeta({
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const styles = useEstilos();
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [
          styles.tarjeta,
          styles.pulsable,
          pressed && styles.pulsada,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.tarjeta, style]}>{children}</View>;
}

const useEstilos = crearEstilos((colores, _tipografia, sombra) => ({
  tarjeta: {
    backgroundColor: colores.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colores.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...sombra,
  },
  pulsable: { minHeight: minTouchTarget },
  pulsada: { backgroundColor: colores.primaryLight },
}));
