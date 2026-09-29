import React, { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { crearEstilos, useTema } from '../lib/TemaContext';
import { mezclar } from '../logic/color';
import { DEFAULT_PILL_COLOR } from '../theme/theme';
import Icono from './Icono';

// Fuera del componente, como recomienda Reanimated. Con «reducir movimiento»
// activado en el móvil, la marca aparece sin animación.
const APARECER = ZoomIn.duration(220);

interface Props {
  /** Color de la pastilla (#RRGGBB) */
  color: string | null;
  /** Color de la otra mitad; por defecto, una versión clara del primero */
  color2?: string;
  tamano?: number;
  /** Muestra una marca verde (toma hecha) */
  marcada?: boolean;
}

/**
 * Cápsula inclinada con el color de la pastilla, para reconocerla de un vistazo.
 * Es decorativa: el nombre del medicamento va siempre en texto al lado.
 */
export default function Capsula({
  color,
  color2,
  tamano = 32,
  marcada = false,
}: Props) {
  const { colores } = useTema();
  const styles = useEstilos();
  const base = color ?? DEFAULT_PILL_COLOR;
  const { largo, alto, clara, borde } = useMemo(() => {
    // Cabe inclinada 45° dentro de un cuadrado de lado `tamano`
    const l = tamano * 0.98;
    return {
      largo: l,
      alto: l * 0.42,
      clara: color2 ?? mezclar(base, '#FFFFFF', 0.55),
      borde: mezclar(base, '#000000', 0.28),
    };
  }, [tamano, base, color2]);
  const marca = Math.round(tamano * 0.5);

  return (
    <View
      style={[styles.caja, { width: tamano, height: tamano }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.capsula,
          {
            width: largo,
            height: alto,
            borderRadius: alto / 2,
            borderColor: borde,
          },
        ]}
      >
        <View style={[styles.mitad, { backgroundColor: base }]} />
        <View style={[styles.mitad, { backgroundColor: clara }]} />
      </View>
      {marcada ? (
        <Animated.View
          entering={APARECER}
          style={[
            styles.marca,
            {
              width: marca,
              height: marca,
              borderRadius: marca / 2,
              backgroundColor: colores.success,
              borderColor: colores.surface,
            },
          ]}
        >
          <Icono
            nombre="check"
            tamano={Math.round(marca * 0.62)}
            color={colores.textOnSuccess}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const useEstilos = crearEstilos(() => ({
  caja: { alignItems: 'center', justifyContent: 'center' },
  capsula: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1.5,
    transform: [{ rotate: '-45deg' }],
  },
  mitad: { flex: 1 },
  marca: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
