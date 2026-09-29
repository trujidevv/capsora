import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LimiteDeErrores from './src/components/LimiteDeErrores';
import { AuthProvider } from './src/lib/AuthContext';
import { TemaProvider, useTema } from './src/lib/TemaContext';
import RootNavigator from './src/navigation/RootNavigator';

function BarraDeEstado() {
  const { oscuro } = useTema();
  return <StatusBar barStyle={oscuro ? 'light-content' : 'dark-content'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <BarraDeEstado />
        <LimiteDeErrores>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </LimiteDeErrores>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
