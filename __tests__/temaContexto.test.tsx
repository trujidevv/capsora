/**
 * Selector de tema (Ajustes → Aspecto): cambia los colores de la app, se guarda
 * en el móvil y se aplica también a los diálogos nativos de Android.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Appearance, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TemaProvider, useTema } from '../src/lib/TemaContext';
import { CLAVES } from '../src/lib/almacen';
import { coloresClaros, coloresOscuros } from '../src/theme/theme';

let tema: ReturnType<typeof useTema>;
function Espia() {
  tema = useTema();
  return <Text>{tema.oscuro ? 'oscuro' : 'claro'}</Text>;
}

async function montar() {
  await act(async () => {
    ReactTestRenderer.create(
      <TemaProvider>
        <Espia />
      </TemaProvider>,
    );
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('sin nada guardado es automático (y el sistema de los tests es claro)', async () => {
  await montar();
  expect(tema.preferencia).toBe('automatico');
  expect(tema.oscuro).toBe(false);
  expect(tema.colores).toBe(coloresClaros);
});

test('elegir «Oscuro» cambia los colores, se guarda y se aplica a Android', async () => {
  await montar();
  await act(async () => tema.cambiarPreferencia('oscuro'));

  expect(tema.oscuro).toBe(true);
  expect(tema.colores).toBe(coloresOscuros);
  expect(tema.tipografia.body.color).toBe(coloresOscuros.textPrimary);
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('dark');
  expect(JSON.parse((await AsyncStorage.getItem(CLAVES.tema))!)).toBe('oscuro');
});

test('al abrir la app se recupera lo guardado', async () => {
  await AsyncStorage.setItem(CLAVES.tema, JSON.stringify('oscuro'));
  await montar();
  expect(tema.preferencia).toBe('oscuro');
  expect(tema.oscuro).toBe(true);
  expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
});

test('un valor guardado desconocido se ignora', async () => {
  await AsyncStorage.setItem(CLAVES.tema, JSON.stringify('noche'));
  await montar();
  expect(tema.preferencia).toBe('automatico');
  expect(Appearance.setColorScheme).not.toHaveBeenCalled();
});
