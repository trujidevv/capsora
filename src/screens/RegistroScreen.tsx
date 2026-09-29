import React, { useRef, useState } from 'react';
import { Alert, Text, View, type TextInputInstance } from 'react-native';
import Logo from '../components/Logo';
import Boton from '../components/Boton';
import { EntrarConGoogle } from '../components/BotonGoogle';
import CampoTexto from '../components/CampoTexto';
import Casilla from '../components/Casilla';
import Pantalla from '../components/Pantalla';
import { MensajeError } from '../components/Varios';
import {
  abrirEnlace,
  URL_PRIVACIDAD,
  VERSION_PRIVACIDAD,
} from '../lib/enlaces';
import { mensajeDeError } from '../lib/errores';
import { supabase } from '../lib/supabase';
import type { PantallaAuth } from '../navigation/tipos';
import { spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

export default function RegistroScreen({
  navigation,
}: PantallaAuth<'Registro'>) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [faltaAceptar, setFaltaAceptar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refEmail = useRef<TextInputInstance>(null);
  const refPassword = useRef<TextInputInstance>(null);

  async function registrarme() {
    if (!nombre.trim())
      return setError('Escribe tu nombre: es lo que verá tu familiar.');
    if (!email.trim()) return setError('Escribe tu correo electrónico.');
    if (password.length < 6)
      return setError('La contraseña debe tener al menos 6 caracteres.');
    if (!acepto) {
      setFaltaAceptar(true);
      return setError(
        'Para crear la cuenta tienes que aceptar la política de privacidad.',
      );
    }

    setCargando(true);
    setError(null);
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre: nombre.trim(),
          // Consentimiento expreso para datos de salud (RGPD, art. 9): queda
          // guardado con la cuenta para poder demostrarlo.
          privacidad_version: VERSION_PRIVACIDAD,
          privacidad_aceptada_en: new Date().toISOString(),
        },
      },
    });
    setCargando(false);

    if (e) {
      setError(mensajeDeError(e));
    } else if (!data.session) {
      // Solo pasa si en Supabase está activada la confirmación por correo
      Alert.alert(
        'Revisa tu correo',
        'Te hemos enviado un enlace para confirmar la cuenta. Después, inicia sesión.',
      );
      navigation.navigate('Login', { email: email.trim() });
    }
    // Si hay sesión, la app pasa sola a la parte privada.
  }

  return (
    <Pantalla edges={['top', 'bottom']} contentStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Logo tamano={72} />
        <Text style={tipografia.title} accessibilityRole="header">
          Crear cuenta
        </Text>
        <Text style={tipografia.bodySecondary}>
          Gratis. Sin límite de medicamentos.
        </Text>
      </View>

      <CampoTexto
        etiqueta="Tu nombre"
        placeholder="Ej. Carmen"
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        value={nombre}
        onChangeText={setNombre}
        onSubmitEditing={() => refEmail.current?.focus()}
      />
      <CampoTexto
        ref={refEmail}
        etiqueta="Correo electrónico"
        placeholder="nombre@correo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => refPassword.current?.focus()}
      />
      <CampoTexto
        ref={refPassword}
        etiqueta="Contraseña"
        placeholder="Mínimo 6 caracteres"
        secureTextEntry={!verPassword}
        autoComplete="new-password"
        returnKeyType="go"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={registrarme}
      />
      <Boton
        variante="texto"
        compacto
        titulo={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onPress={() => setVerPassword(v => !v)}
        style={styles.izquierda}
      />

      <Casilla
        marcada={acepto}
        onCambiar={v => {
          setAcepto(v);
          if (v) setFaltaAceptar(false);
        }}
        error={faltaAceptar}
      >
        Acepto la{' '}
        <Text style={styles.enlace} onPress={() => abrirEnlace(URL_PRIVACIDAD)}>
          política de privacidad
        </Text>{' '}
        y que Capsora guarde mis datos de medicación para recordármela.
      </Casilla>

      {error ? <MensajeError texto={error} /> : null}

      <Boton
        titulo="Crear mi cuenta"
        onPress={registrarme}
        cargando={cargando}
      />
      <EntrarConGoogle onError={setError} />
      <Boton
        variante="secundario"
        titulo="Ya tengo cuenta"
        onPress={() => navigation.navigate('Login')}
      />
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  contenido: { justifyContent: 'center' },
  cabecera: { gap: spacing.sm, marginBottom: spacing.md },
  izquierda: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  enlace: { color: colores.primary, textDecorationLine: 'underline' },
}));
