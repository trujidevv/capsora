import React from 'react';
import { Text, View } from 'react-native';
import Logo from '../components/Logo';
import Icono from '../components/Icono';
import Aviso from '../components/Aviso';
import Boton from '../components/Boton';
import Pantalla from '../components/Pantalla';
import { marcarBienvenidaVista } from '../lib/bienvenida';
import type { PantallaApp } from '../navigation/tipos';
import { radii, spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

const PUNTOS = [
  {
    icono: 'bell-ringing' as const,
    titulo: 'Te avisamos a la hora exacta',
    texto: 'Aunque el móvil esté bloqueado o sin internet.',
  },
  {
    icono: 'check-circle' as const,
    titulo: 'Marcas «Tomada» desde el propio aviso',
    texto: 'Sin abrir la app. Y si se te pasa, te lo recordamos otra vez.',
  },
  {
    icono: 'users-three' as const,
    titulo: 'Un familiar puede ver si todo va bien',
    texto: 'Sin tener que llamarte cada día para preguntar.',
  },
];

export default function BienvenidaScreen({
  navigation,
}: PantallaApp<'Bienvenida'>) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  async function ahoraNo() {
    await marcarBienvenidaVista();
    navigation.reset({ index: 0, routes: [{ name: 'Principal' }] });
  }

  return (
    <Pantalla edges={['top', 'bottom']}>
      <Logo />
      <Text style={tipografia.title} accessibilityRole="header">
        Te damos la bienvenida
      </Text>
      <Text style={tipografia.bodySecondary}>
        Así funciona, en tres frases:
      </Text>

      {PUNTOS.map(p => (
        <View key={p.titulo} style={styles.punto}>
          <View style={styles.icono}>
            <Icono nombre={p.icono} tamano={28} color={colores.primary} />
          </View>
          <View style={styles.textos}>
            <Text style={tipografia.bodyStrong}>{p.titulo}</Text>
            <Text style={tipografia.bodySecondary}>{p.texto}</Text>
          </View>
        </View>
      ))}

      <Aviso
        tipo="info"
        titulo="Importante"
        texto="Esta app es solo un recordatorio. No es un producto sanitario ni sustituye a tu médico o farmacéutico."
      />

      <Text style={tipografia.body}>
        Antes de empezar, vamos a asegurarnos de que tu móvil deja sonar los
        avisos. Es un minuto.
      </Text>
      <Boton
        titulo="Configurar los avisos"
        onPress={() =>
          navigation.navigate('Fiabilidad', { desdeBienvenida: true })
        }
      />
      <Boton variante="texto" titulo="Ahora no" onPress={ahoraNo} />
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  punto: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colores.surface,
    borderWidth: 1,
    borderColor: colores.border,
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colores.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: spacing.xs },
}));
