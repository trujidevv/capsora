import React, { useRef, useState } from 'react';
import { Text, View, type TextInputInstance } from 'react-native';
import Logo from '../components/Logo';
import Boton from '../components/Boton';
import { EntrarConGoogle } from '../components/BotonGoogle';
import CampoTexto from '../components/CampoTexto';
import Pantalla from '../components/Pantalla';
import { MensajeError } from '../components/Varios';
import { avisoBreve } from '../lib/avisar';
import { esCorreoSinConfirmar, mensajeDeError } from '../lib/errores';
import { supabase } from '../lib/supabase';
import type { PantallaAuth } from '../navigation/tipos';
import { spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

export default function LoginScreen({
  navigation,
  route,
}: PantallaAuth<'Login'>) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cuenta creada pero sin pulsar el enlace del correo: se ofrece reenviarlo
  const [sinConfirmar, setSinConfirmar] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const refPassword = useRef<TextInputInstance>(null);

  async function entrar() {
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setCargando(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setCargando(false);
    setSinConfirmar(esCorreoSinConfirmar(e));
    if (e) setError(mensajeDeError(e));
  }

  async function reenviarConfirmacion() {
    setReenviando(true);
    const { error: e } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    setReenviando(false);
    if (e) return setError(mensajeDeError(e));
    setError(null);
    setSinConfirmar(false);
    avisoBreve(
      `Te hemos enviado otro correo a ${email.trim()}. Mira también en Spam.`,
    );
  }

  return (
    <Pantalla edges={['top', 'bottom']} contentStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Logo />
        <Text style={tipografia.title} accessibilityRole="header">
          Iniciar sesión
        </Text>
        <Text style={tipografia.bodySecondary}>
          Tus recordatorios de medicación, siempre a tiempo.
        </Text>
      </View>

      <CampoTexto
        etiqueta="Correo electrónico"
        placeholder="nombre@correo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        value={email}
        onChangeText={texto => {
          setEmail(texto);
          setSinConfirmar(false);
        }}
        onSubmitEditing={() => refPassword.current?.focus()}
      />
      <CampoTexto
        ref={refPassword}
        etiqueta="Contraseña"
        placeholder="Tu contraseña"
        secureTextEntry={!verPassword}
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={entrar}
      />
      <Boton
        variante="texto"
        compacto
        titulo={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onPress={() => setVerPassword(v => !v)}
        style={styles.izquierda}
      />

      {error ? <MensajeError texto={error} /> : null}
      {sinConfirmar ? (
        <Boton
          variante="secundario"
          titulo="Reenviar correo de confirmación"
          icono="envelope-simple"
          onPress={reenviarConfirmacion}
          cargando={reenviando}
        />
      ) : null}

      <Boton titulo="Entrar" onPress={entrar} cargando={cargando} />
      <EntrarConGoogle onError={setError} />
      <Boton
        variante="texto"
        titulo="¿Has olvidado tu contraseña?"
        onPress={() =>
          navigation.navigate('Recuperar', { email: email.trim() || undefined })
        }
      />
      <Boton
        variante="secundario"
        titulo="Crear una cuenta nueva"
        onPress={() => navigation.navigate('Registro')}
      />
    </Pantalla>
  );
}

const useEstilos = crearEstilos(() => ({
  contenido: { justifyContent: 'center' },
  cabecera: { gap: spacing.sm, marginBottom: spacing.md },
  izquierda: { alignSelf: 'flex-start', paddingHorizontal: 0 },
}));
