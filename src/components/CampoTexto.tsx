import React, { forwardRef } from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';
import { minTouchTarget, radii, spacing, FUENTE } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

interface Props extends TextInputProps {
  etiqueta: string;
  ayuda?: string;
  error?: string | null;
}

const CampoTexto = forwardRef<TextInputInstance, Props>(
  function CampoTextoConRef({ etiqueta, ayuda, error, style, ...resto }, ref) {
    const { colores, tipografia } = useTema();
    const styles = useEstilos();
    return (
      <View style={styles.contenedor}>
        <Text style={tipografia.bodyStrong}>{etiqueta}</Text>
        <TextInput
          ref={ref}
          style={[styles.input, error ? styles.inputError : null, style]}
          placeholderTextColor={colores.textSecondary}
          accessibilityLabel={etiqueta}
          {...resto}
        />
        {error ? (
          <Text style={[tipografia.caption, styles.error]}>{error}</Text>
        ) : ayuda ? (
          <Text style={tipografia.caption}>{ayuda}</Text>
        ) : null}
      </View>
    );
  },
);

export default CampoTexto;

const useEstilos = crearEstilos(colores => ({
  contenedor: { gap: spacing.xs },
  input: {
    fontFamily: FUENTE,
    borderWidth: 1.5,
    borderColor: colores.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 18,
    color: colores.textPrimary,
    backgroundColor: colores.surface,
    minHeight: minTouchTarget + 4,
  },
  inputError: { borderColor: colores.danger },
  error: { color: colores.dangerDark },
}));
