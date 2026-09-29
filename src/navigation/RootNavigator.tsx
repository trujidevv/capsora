import React, { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icono, { type NombreIcono } from '../components/Icono';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Cargando } from '../components/Varios';
import { useAuth } from '../lib/AuthContext';
import { bienvenidaVista } from '../lib/bienvenida';
import { DatosProvider } from '../lib/DatosContext';
import { FiabilidadProvider } from '../lib/FiabilidadContext';
import AjustesScreen from '../screens/AjustesScreen';
import BienvenidaScreen from '../screens/BienvenidaScreen';
import ConsentimientoScreen from '../screens/ConsentimientoScreen';
import { faltaConsentimiento, nombreInicial } from '../logic/consentimiento';
import FamiliaScreen from '../screens/FamiliaScreen';
import FiabilidadScreen from '../screens/FiabilidadScreen';
import FormularioMedicamentoScreen from '../screens/FormularioMedicamentoScreen';
import HistorialScreen from '../screens/HistorialScreen';
import HoyScreen from '../screens/HoyScreen';
import LoginScreen from '../screens/LoginScreen';
import MedicamentosScreen from '../screens/MedicamentosScreen';
import PacienteScreen from '../screens/PacienteScreen';
import RecuperarScreen from '../screens/RecuperarScreen';
import RegistroScreen from '../screens/RegistroScreen';
import type {
  AppStackParamList,
  AuthStackParamList,
  TabsParamList,
} from './tipos';
import { crearEstilos, useTema } from '../lib/TemaContext';
import { FUENTE, type Colores } from '../theme/theme';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();

function temaNavegacion(colores: Colores, oscuro: boolean): Theme {
  const base = oscuro ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colores.primary,
      background: colores.background,
      card: colores.surface,
      text: colores.textPrimary,
      border: colores.border,
      notification: colores.accent,
    },
  };
}

const ICONOS: Record<keyof TabsParamList, NombreIcono> = {
  Hoy: 'sun',
  Medicamentos: 'pill',
  Historial: 'calendar-check',
  Familia: 'users-three',
  Ajustes: 'gear-six',
};

function opcionesCabecera(colores: Colores) {
  return {
    headerStyle: { backgroundColor: colores.background },
    headerShadowVisible: false,
    headerTintColor: colores.primaryDark,
    headerTitleStyle: {
      fontFamily: FUENTE,
      fontSize: 22,
      fontWeight: '700' as const,
      color: colores.textPrimary,
    },
  };
}

const ETIQUETAS: Record<keyof TabsParamList, string> = {
  Hoy: 'Hoy',
  Medicamentos: 'Medicinas',
  Historial: 'Historial',
  Familia: 'Familia',
  Ajustes: 'Ajustes',
};

// Alto de la barra sin contar los botones del sistema (icono 26 + etiqueta + márgenes)
const ALTO_BARRA = 66;

const iconoTab =
  (nombre: keyof TabsParamList) =>
  ({ color }: { color: string }) =>
    <Icono nombre={ICONOS[nombre]} tamano={26} color={color} />;

function EtiquetaTab({
  nombre,
  color,
}: {
  nombre: keyof TabsParamList;
  color: string;
}) {
  const styles = useEstilos();
  return (
    // Siempre en una línea: si no cabe (móvil estrecho o letra del sistema
    // grande), encoge un poco en vez de cortarse en «Medicin…»
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      maxFontSizeMultiplier={1.3}
      style={[styles.etiquetaTab, { color }]}
    >
      {ETIQUETAS[nombre]}
    </Text>
  );
}

const etiquetaTab =
  (nombre: keyof TabsParamList) =>
  ({ color }: { color: string }) =>
    <EtiquetaTab nombre={nombre} color={color} />;

function Pestanas() {
  const { colores } = useTema();
  const styles = useEstilos();
  // Con los 3 botones de Android (atrás, inicio, recientes) el hueco de abajo es
  // mayor que con gestos: la barra suma ese hueco para no quedar debajo.
  const { bottom } = useSafeAreaInsets();
  const barra = useMemo(
    () => [
      styles.barraTabs,
      { height: ALTO_BARRA + bottom, paddingBottom: bottom + 6 },
    ],
    [styles.barraTabs, bottom],
  );
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        ...opcionesCabecera(colores),
        tabBarActiveTintColor: colores.primaryDark,
        tabBarInactiveTintColor: colores.textSecondary,
        tabBarLabel: etiquetaTab(route.name),
        tabBarAccessibilityLabel: ETIQUETAS[route.name],
        tabBarStyle: barra,
        tabBarItemStyle: styles.itemTab,
        tabBarIcon: iconoTab(route.name),
      })}
    >
      <Tabs.Screen
        name="Hoy"
        component={HoyScreen}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Medicamentos"
        component={MedicamentosScreen}
        options={{ title: 'Mis medicamentos' }}
      />
      <Tabs.Screen name="Historial" component={HistorialScreen} />
      <Tabs.Screen name="Familia" component={FamiliaScreen} />
      <Tabs.Screen name="Ajustes" component={AjustesScreen} />
    </Tabs.Navigator>
  );
}

function ParteAutenticada() {
  const { colores } = useTema();
  const [primeraVez, setPrimeraVez] = useState<boolean | null>(null);
  useEffect(() => {
    bienvenidaVista().then(vista => setPrimeraVez(!vista));
  }, []);
  if (primeraVez === null) return <Cargando />;

  return (
    <DatosProvider>
      <FiabilidadProvider>
        <AppStack.Navigator
          initialRouteName={primeraVez ? 'Bienvenida' : 'Principal'}
          screenOptions={opcionesCabecera(colores)}
        >
          <AppStack.Screen
            name="Bienvenida"
            component={BienvenidaScreen}
            options={{ headerShown: false }}
          />
          <AppStack.Screen
            name="Principal"
            component={Pestanas}
            options={{ headerShown: false }}
          />
          <AppStack.Screen
            name="FormularioMedicamento"
            component={FormularioMedicamentoScreen}
            options={{ title: 'Medicamento' }}
          />
          <AppStack.Screen
            name="Fiabilidad"
            component={FiabilidadScreen}
            options={{ title: 'Que los avisos suenen' }}
          />
          <AppStack.Screen name="Paciente" component={PacienteScreen} />
        </AppStack.Navigator>
      </FiabilidadProvider>
    </DatosProvider>
  );
}

export default function RootNavigator() {
  const { usuario, session, loading } = useAuth();
  const { colores, oscuro } = useTema();
  const temaNav = useMemo(
    () => temaNavegacion(colores, oscuro),
    [colores, oscuro],
  );

  if (loading) return <Cargando />;

  return (
    <NavigationContainer theme={temaNav}>
      {usuario && session && faltaConsentimiento(session.user.user_metadata) ? (
        // Primera vez con Google: sin consentimiento no se ve nada más
        <ConsentimientoScreen
          usuarioId={usuario.id}
          nombreSugerido={nombreInicial(session.user.user_metadata)}
        />
      ) : usuario ? (
        // key: si cambia la persona, se reinicia todo el estado de la parte privada
        <ParteAutenticada key={usuario.id} />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Registro" component={RegistroScreen} />
          <AuthStack.Screen name="Recuperar" component={RecuperarScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const useEstilos = crearEstilos(colores => ({
  barraTabs: {
    backgroundColor: colores.surface,
    borderTopColor: colores.border,
    paddingTop: 6,
  },
  itemTab: { paddingVertical: 2 },
  // Única excepción a los 16 px: con 5 pestañas, «Medicinas» a 16 px no cabe en
  // un móvil de 360 dp de ancho. Van acompañadas de un icono de 26 px.
  etiquetaTab: { fontFamily: FUENTE, fontSize: 14, fontWeight: '600' },
}));
