import React from 'react';
import { View } from 'react-native';
import { crearEstilos, useTema } from '../lib/TemaContext';
import Capsula from './Capsula';

/** Logo de Capsora: la cápsula de la marca (verde azulado y naranja), como en la web. */
export default function Logo({ tamano = 80 }: { tamano?: number }) {
  const { colores } = useTema();
  const styles = useEstilos();
  return (
    <View
      style={[
        styles.circulo,
        { width: tamano, height: tamano, borderRadius: tamano / 2 },
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Capsora"
    >
      <Capsula
        color={colores.primary}
        color2={colores.accent}
        tamano={tamano * 0.62}
      />
    </View>
  );
}

const useEstilos = crearEstilos(colores => ({
  circulo: {
    backgroundColor: colores.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
