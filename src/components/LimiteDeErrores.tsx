import React from 'react';
import { Text, View } from 'react-native';
import Boton from './Boton';
import Icono from './Icono';
import Pantalla from './Pantalla';
import { registrarFallo } from '../lib/informesFallos';
import { spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

function PantallaFallo({ onReintentar }: { onReintentar: () => void }) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  return (
    <Pantalla edges={['top', 'bottom']}>
      <View style={styles.centro}>
        <View style={styles.circulo}>
          <Icono nombre="warning" tamano={40} color={colores.warningDark} />
        </View>
        <Text
          style={[tipografia.title, styles.texto]}
          accessibilityRole="header"
        >
          Algo ha fallado
        </Text>
        <Text style={[tipografia.body, styles.texto]}>
          Tus medicamentos y tus avisos siguen guardados. Pulsa el botón para
          volver a la app.
        </Text>
        <Boton titulo="Volver a empezar" onPress={onReintentar} />
      </View>
    </Pantalla>
  );
}

interface Props {
  children: React.ReactNode;
}

/**
 * Si una pantalla falla, en vez de quedarse en blanco enseña «Algo ha fallado»
 * y envía el error a los informes de fallos.
 */
export default class LimiteDeErrores extends React.Component<
  Props,
  { hayError: boolean }
> {
  state = { hayError: false };

  static getDerivedStateFromError() {
    return { hayError: true };
  }

  componentDidCatch(error: unknown) {
    registrarFallo(error);
  }

  render() {
    if (this.state.hayError) {
      return (
        <PantallaFallo
          onReintentar={() => this.setState({ hayError: false })}
        />
      );
    }
    return this.props.children;
  }
}

const useEstilos = crearEstilos(colores => ({
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  circulo: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colores.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { textAlign: 'center' },
}));
