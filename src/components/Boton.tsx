import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Icono, { type NombreIcono } from './Icono';
import {
  minTouchTarget,
  radii,
  spacing,
  type Colores,
  FUENTE,
} from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

type Variante =
  | 'primario'
  | 'acento'
  | 'secundario'
  | 'peligro'
  | 'texto'
  | 'textoPeligro';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Icono a la izquierda del texto */
  icono?: NombreIcono;
  compacto?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

function coloresBoton(colores: Colores) {
  const FONDO: Record<Variante, string> = {
    primario: colores.primary,
    acento: colores.accent,
    secundario: colores.surface,
    peligro: colores.surface,
    texto: 'transparent',
    textoPeligro: 'transparent',
  };

  const TEXTO: Record<Variante, string> = {
    primario: colores.textOnPrimary,
    acento: colores.textOnAccent,
    secundario: colores.primary,
    peligro: colores.danger,
    texto: colores.primary,
    textoPeligro: colores.danger,
  };

  const BORDE: Record<Variante, string> = {
    primario: colores.primary,
    acento: colores.accent,
    secundario: colores.primary,
    peligro: colores.danger,
    texto: 'transparent',
    textoPeligro: 'transparent',
  };
  return { FONDO, TEXTO, BORDE };
}

export default function Boton({
  titulo,
  onPress,
  variante = 'primario',
  cargando,
  deshabilitado,
  icono,
  compacto,
  style,
  accessibilityHint,
}: Props) {
  const { colores } = useTema();
  const styles = useEstilos();
  const { FONDO, TEXTO, BORDE } = coloresBoton(colores);
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: Boolean(inactivo),
        busy: Boolean(cargando),
      }}
      style={({ pressed }) => [
        styles.base,
        compacto && styles.compacto,
        { backgroundColor: FONDO[variante], borderColor: BORDE[variante] },
        inactivo && styles.inactivo,
        pressed && styles.pulsado,
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={TEXTO[variante]} />
      ) : (
        <View style={styles.fila}>
          {icono ? (
            <Icono
              nombre={icono}
              tamano={compacto ? 20 : 22}
              color={TEXTO[variante]}
            />
          ) : null}
          <Text
            style={[
              styles.texto,
              compacto && styles.textoCompacto,
              { color: TEXTO[variante] },
            ]}
          >
            {titulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const useEstilos = crearEstilos((_colores, tipografia) => ({
  base: {
    minHeight: minTouchTarget + 4,
    borderRadius: radii.md,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    // Si el texto no cabe (letra del móvil grande), pasa a dos líneas sin cortarse
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compacto: { minHeight: minTouchTarget, paddingHorizontal: spacing.md },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  texto: { ...tipografia.button, textAlign: 'center', flexShrink: 1 },
  textoCompacto: { fontFamily: FUENTE, fontSize: 17 },
  inactivo: { opacity: 0.5 },
  pulsado: { opacity: 0.85, transform: [{ scale: 0.99 }] },
}));
