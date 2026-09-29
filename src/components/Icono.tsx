import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useTema } from '../lib/TemaContext';
import { ICONOS, type NombreIcono } from './iconos';

export type { NombreIcono } from './iconos';

interface Props {
  nombre: NombreIcono;
  tamano?: number;
  /** Por defecto, el color del texto principal del tema */
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Icono de Phosphor (fuente PastillinIconos, ver scripts/generar-iconos.py).
 * Es decorativo: el lector de pantalla lo salta. El significado tiene que ir en
 * el texto de al lado o en el accessibilityLabel del botón.
 */
export default function Icono({ nombre, tamano = 24, color, style }: Props) {
  const { colores } = useTema();
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      // El tamaño del icono no crece con la letra del sistema, para no romper
      // la maquetación; el texto de al lado sí crece.
      allowFontScaling={false}
      style={[
        estilos.base,
        { fontSize: tamano, lineHeight: tamano },
        { color: color ?? colores.textPrimary },
        style,
        estilos.fuente,
      ]}
    >
      {ICONOS[nombre]}
    </Text>
  );
}

const estilos = StyleSheet.create({
  base: { includeFontPadding: false },
  // Con una fuente propia, Android necesita peso normal para encontrarla
  fuente: { fontFamily: 'PastillinIconos', fontWeight: 'normal' },
});
