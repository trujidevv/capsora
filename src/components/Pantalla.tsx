import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

interface Props {
  children: React.ReactNode;
  /** Por defecto la pantalla hace scroll */
  scroll?: boolean;
  refrescando?: boolean;
  onRefrescar?: () => void;
  /** Bordes con margen de seguridad (notch, barra de gestos). Con cabecera, solo abajo. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Algo fijo abajo (por ejemplo, el botón Guardar) */
  pie?: React.ReactNode;
}

export default function Pantalla({
  children,
  scroll = true,
  refrescando,
  onRefrescar,
  edges = ['bottom'],
  contentStyle,
  pie,
}: Props) {
  const { colores } = useTema();
  const styles = useEstilos();
  const contenido = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.contenido, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefrescar ? (
          <RefreshControl
            refreshing={Boolean(refrescando)}
            onRefresh={onRefrescar}
            colors={[colores.primary]}
            tintColor={colores.primary}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.contenido, styles.fijo, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.fondo} edges={edges}>
      <KeyboardAvoidingView
        style={styles.fondo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {contenido}
        {pie ? <View style={styles.pie}>{pie}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useEstilos = crearEstilos(colores => ({
  fondo: { flex: 1, backgroundColor: colores.background },
  contenido: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  fijo: { flex: 1 },
  pie: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colores.border,
    backgroundColor: colores.surface,
  },
}));
