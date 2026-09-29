import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Boton from '../components/Boton';
import CampoTexto from '../components/CampoTexto';
import Casilla from '../components/Casilla';
import Logo from '../components/Logo';
import Pantalla from '../components/Pantalla';
import { MensajeError } from '../components/Varios';
import { aceptarPrivacidad } from '../data/perfil';
import {
  abrirEnlace,
  URL_PRIVACIDAD,
  VERSION_PRIVACIDAD,
} from '../lib/enlaces';
import { mensajeDeError } from '../lib/errores';
import { cerrarSesion } from '../lib/sesion';
import { spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

interface Props {
  usuarioId: string;
  nombreSugerido: string;
}

/**
 * Primera vez que se entra con Google: nombre y consentimiento de datos de salud
 * (en el registro con correo van en la misma pantalla de registro). Hasta
 * aceptarlo no se ve nada más de la app.
 */
export default function ConsentimientoScreen({
  usuarioId,
  nombreSugerido,
}: Props) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const [nombre, setNombre] = useState(nombreSugerido);
  const [acepto, setAcepto] = useState(false);
  const [faltaAceptar, setFaltaAceptar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continuar() {
    if (!nombre.trim()) return setError('Escribe tu nombre.');
    if (!acepto) {
      setFaltaAceptar(true);
      return setError(
        'Para usar Capsora tienes que aceptar la política de privacidad.',
      );
    }
    setCargando(true);
    setError(null);
    try {
      // Al guardarse, la app pasa sola a la parte privada
      await aceptarPrivacidad(usuarioId, nombre, VERSION_PRIVACIDAD);
    } catch (e) {
      setError(mensajeDeError(e));
      setCargando(false);
    }
  }

  return (
    <Pantalla edges={['top', 'bottom']} contentStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Logo tamano={72} />
        <Text style={tipografia.title} accessibilityRole="header">
          Un último paso
        </Text>
        <Text style={tipografia.bodySecondary}>
          Antes de empezar, dinos cómo te llamas y acepta cómo guardamos tus
          datos.
        </Text>
      </View>

      <CampoTexto
        etiqueta="Tu nombre"
        ayuda="Es el nombre que verá tu familiar."
        placeholder="Ej. Carmen"
        autoCapitalize="words"
        autoComplete="name"
        value={nombre}
        onChangeText={setNombre}
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

      <Boton titulo="Empezar" onPress={continuar} cargando={cargando} />
      <Boton
        variante="texto"
        titulo="Salir sin aceptar"
        onPress={() => cerrarSesion().catch(e => setError(mensajeDeError(e)))}
        accessibilityHint="Cierra la sesión. Sin aceptar no se guarda ningún dato de salud."
      />
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  contenido: { justifyContent: 'center' },
  cabecera: { gap: spacing.sm, marginBottom: spacing.md },
  enlace: { color: colores.primary, textDecorationLine: 'underline' },
}));
