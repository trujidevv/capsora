import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View, type TextInputInstance } from 'react-native';
import Icono from '../components/Icono';
import Boton from '../components/Boton';
import CampoTexto from '../components/CampoTexto';
import Pantalla from '../components/Pantalla';
import { MensajeError } from '../components/Varios';
import { mensajeDeError } from '../lib/errores';
import { supabase } from '../lib/supabase';
import {
  codigoCompleto,
  correoValido,
  limpiarCodigo,
  LONGITUD_MAX_CODIGO,
  problemaContrasena,
} from '../logic/validacion';
import type { PantallaAuth } from '../navigation/tipos';
import { spacing, FUENTE } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

/** Supabase no deja pedir otro código hasta pasado un minuto. */
const ESPERA_REENVIO_S = 60;

/**
 * Recuperar la contraseña con un CÓDIGO por correo (no un enlace): para una
 * persona mayor es más fácil copiar unas cifras que abrir un enlace en la app.
 * Paso 1: correo → se envía el código. Paso 2: código + contraseña nueva.
 */
export default function RecuperarScreen({
  navigation,
  route,
}: PantallaAuth<'Recuperar'>) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);
  const refPassword = useRef<TextInputInstance>(null);

  // Cuenta atrás para poder pedir otro código
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function enviarCodigo() {
    if (!correoValido(email)) {
      setError('Escribe bien tu correo electrónico.');
      return;
    }
    setCargando(true);
    setError(null);
    const { error: e } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
    );
    setCargando(false);
    if (e) {
      setError(mensajeDeError(e));
      return;
    }
    setPaso('codigo');
    setEspera(ESPERA_REENVIO_S);
  }

  async function cambiarContrasena() {
    if (!codigoCompleto(codigo)) {
      setError('Escribe el código que te hemos enviado por correo.');
      return;
    }
    const problema = problemaContrasena(password);
    if (problema) {
      setError(problema);
      return;
    }
    setCargando(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: limpiarCodigo(codigo),
      type: 'recovery',
    });
    if (e) {
      setCargando(false);
      setError(mensajeDeError(e));
      return;
    }
    // Con el código correcto ya hay sesión (la app pasa sola a la parte privada):
    // se guarda la contraseña nueva.
    const { error: e2 } = await supabase.auth.updateUser({ password });
    setCargando(false);
    if (e2) {
      Alert.alert(
        'Has entrado, pero falta la contraseña nueva',
        `${mensajeDeError(
          e2,
        )}\n\nPara cambiarla, cierra sesión y vuelve a pedir un código.`,
      );
    } else {
      Alert.alert('Contraseña cambiada', 'Ya puedes usar tu contraseña nueva.');
    }
  }

  return (
    <Pantalla edges={['top', 'bottom']} contentStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <View style={styles.logo}>
          <Icono nombre="key" tamano={40} color={colores.primary} />
        </View>
        <Text style={tipografia.title} accessibilityRole="header">
          Recuperar contraseña
        </Text>
        <Text style={tipografia.bodySecondary}>
          {paso === 'correo'
            ? 'Te enviaremos un código a tu correo para poner una contraseña nueva.'
            : `Si hay una cuenta con ${email.trim()}, te habrá llegado un correo con un código. Mira también en «Spam» o «Correo no deseado».`}
        </Text>
      </View>

      {paso === 'correo' ? (
        <CampoTexto
          etiqueta="Correo electrónico"
          placeholder="nombre@correo.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={enviarCodigo}
        />
      ) : (
        <>
          <CampoTexto
            etiqueta="Código del correo"
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={LONGITUD_MAX_CODIGO + 4}
            returnKeyType="next"
            value={codigo}
            onChangeText={t => setCodigo(limpiarCodigo(t))}
            onSubmitEditing={() => refPassword.current?.focus()}
            style={styles.codigo}
          />
          <CampoTexto
            ref={refPassword}
            etiqueta="Contraseña nueva"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry={!verPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={cambiarContrasena}
          />
          <Boton
            variante="texto"
            compacto
            titulo={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setVerPassword(v => !v)}
            style={styles.izquierda}
          />
        </>
      )}

      {error ? <MensajeError texto={error} /> : null}

      {paso === 'correo' ? (
        <Boton
          titulo="Enviarme un código"
          onPress={enviarCodigo}
          cargando={cargando}
        />
      ) : (
        <>
          <Boton
            titulo="Cambiar contraseña"
            onPress={cambiarContrasena}
            cargando={cargando}
          />
          <Boton
            variante="secundario"
            titulo={
              espera > 0
                ? `Pedir otro código (en ${espera} s)`
                : 'No me ha llegado: pedir otro'
            }
            deshabilitado={espera > 0 || cargando}
            onPress={enviarCodigo}
          />
          <Boton
            variante="texto"
            titulo="Usar otro correo"
            onPress={() => {
              setPaso('correo');
              setCodigo('');
              setError(null);
            }}
          />
        </>
      )}

      <Boton
        variante="texto"
        titulo="Volver a iniciar sesión"
        onPress={() => navigation.navigate('Login')}
      />
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  contenido: { justifyContent: 'center' },
  cabecera: { gap: spacing.sm, marginBottom: spacing.md },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colores.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  izquierda: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  codigo: { fontFamily: FUENTE, fontSize: 24, letterSpacing: 6 },
}));
