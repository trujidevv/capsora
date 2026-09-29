import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { entrarConGoogle, googleDisponible } from '../lib/googleAuth';
import { mensajeDeError } from '../lib/errores';
import { minTouchTarget, radii, spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

// Logo «G» oficial (kit de marca de Google), recortado sobre el fondo de cada
// modo. Es la única imagen de icono de la app: las normas de Google piden su
// logo tal cual, así que no puede ir con <Icono>.
const LOGO_CLARO = require('../assets/google/g-claro.png');
const LOGO_OSCURO = require('../assets/google/g-oscuro.png');

interface Props {
  onPress: () => void;
  cargando?: boolean;
}

/** «Continuar con Google», con los colores y el logo que exige Google. */
export default function BotonGoogle({ onPress, cargando }: Props) {
  const { colores, oscuro } = useTema();
  const styles = useEstilos();
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
      accessibilityState={{
        disabled: Boolean(cargando),
        busy: Boolean(cargando),
      }}
      style={({ pressed }) => [styles.boton, pressed && styles.pulsado]}
    >
      {cargando ? (
        <ActivityIndicator color={colores.googleTexto} />
      ) : (
        <View style={styles.fila}>
          <Image
            source={oscuro ? LOGO_OSCURO : LOGO_CLARO}
            style={styles.logo}
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.texto}>Continuar con Google</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * «o» + «Continuar con Google», para Iniciar sesión y Crear cuenta. No sale si
 * Google no está configurado (GOOGLE_WEB_CLIENT_ID en .env).
 */
export function EntrarConGoogle({
  onError,
}: {
  onError: (mensaje: string | null) => void;
}) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const [cargando, setCargando] = useState(false);
  if (!googleDisponible()) return null;

  async function entrar() {
    setCargando(true);
    onError(null);
    try {
      // Si entra, la app cambia sola de pantalla (y si es nueva, pide el consentimiento)
      await entrarConGoogle();
    } catch (e) {
      onError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.seccion}>
      <View style={styles.separador} accessible={false}>
        <View style={styles.linea} />
        <Text style={tipografia.bodySecondary}>o</Text>
        <View style={styles.linea} />
      </View>
      <BotonGoogle onPress={entrar} cargando={cargando} />
    </View>
  );
}

const useEstilos = crearEstilos((colores, tipografia) => ({
  seccion: { gap: spacing.md },
  separador: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linea: { flex: 1, height: 1, backgroundColor: colores.border },
  boton: {
    minHeight: minTouchTarget + 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colores.googleBorde,
    backgroundColor: colores.googleFondo,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 20, height: 20 },
  texto: { ...tipografia.button, color: colores.googleTexto },
}));
