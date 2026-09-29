import React, { useCallback, useState } from 'react';
import { Share, Text, View } from 'react-native';
import Icono from '../components/Icono';
import { useFocusEffect } from '@react-navigation/native';
import Aviso from '../components/Aviso';
import Boton from '../components/Boton';
import CampoTexto from '../components/CampoTexto';
import Pantalla from '../components/Pantalla';
import ResumenPaciente from '../components/ResumenPaciente';
import Tarjeta from '../components/Tarjeta';
import { Cargando, TituloSeccion } from '../components/Varios';
import {
  aceptarInvitacion,
  crearInvitacion,
  eliminarVinculo,
  formatearCodigo,
  LONGITUD_CODIGO,
  obtenerFamilia,
  type Familia,
  type PersonaCuidada,
} from '../data/familia';
import { obtenerDatosPaciente, type DatosPaciente } from '../data/paciente';
import { useUsuarioId } from '../lib/AuthContext';
import { avisoBreve, confirmar, mostrarError } from '../lib/avisar';
import { mensajeDeError } from '../lib/errores';
import { useAhora } from '../lib/useAhora';
import { pedirPermisoAvisosCuidador } from '../notificaciones/push';
import type { PantallaTab } from '../navigation/tipos';
import { radii, spacing, FUENTE } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

function formatearCaducidad(iso: string): string {
  const d = new Date(iso);
  const dia =
    d.toDateString() === new Date().toDateString()
      ? 'hoy'
      : `el ${d.getDate()}/${d.getMonth() + 1}`;
  return `${dia} a las ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

function TarjetaPersona({
  persona,
  datos,
  ahora,
  onPress,
}: {
  persona: PersonaCuidada;
  datos: DatosPaciente | null | undefined;
  ahora: Date;
  onPress: () => void;
}) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  return (
    <Tarjeta
      onPress={onPress}
      accessibilityLabel={`Ver cómo va ${persona.nombre}`}
    >
      <View style={styles.filaPersona}>
        <View style={styles.nombre}>
          <Icono nombre="user" color={colores.primary} />
          <Text style={tipografia.subtitle}>{persona.nombre}</Text>
        </View>
        <Icono nombre="caret-right" color={colores.textSecondary} />
      </View>
      {datos === undefined ? (
        <Text style={tipografia.bodySecondary}>Cargando…</Text>
      ) : datos === null ? (
        <Text style={tipografia.bodySecondary}>
          No se ha podido cargar. Pulsa para reintentar.
        </Text>
      ) : (
        <ResumenPaciente datos={datos} ahora={ahora} />
      )}
    </Tarjeta>
  );
}

export default function FamiliaScreen({ navigation }: PantallaTab<'Familia'>) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const usuarioId = useUsuarioId();
  const ahora = useAhora();
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [datosPersonas, setDatosPersonas] = useState<
    Record<string, DatosPaciente | null>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [verCampoCodigo, setVerCampoCodigo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const f = await obtenerFamilia(usuarioId);
      setFamilia(f);
      setError(null);
      const entradas = await Promise.all(
        f.personas.map(
          async p =>
            [
              p.pacienteId,
              await obtenerDatosPaciente(p.pacienteId, 1).catch(() => null),
            ] as const,
        ),
      );
      setDatosPersonas(Object.fromEntries(entradas));
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, [usuarioId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  async function invitar() {
    setOcupado(true);
    try {
      await crearInvitacion();
      await cargar();
    } catch (e) {
      mostrarError(e);
    } finally {
      setOcupado(false);
    }
  }

  async function compartirCodigo(c: string) {
    await Share.share({
      message:
        `Te invito a ver mis recordatorios de medicación, para que estés tranquilo/a.\n\n` +
        `1. Instala la app y crea tu cuenta.\n2. Ve a «Familia» y pulsa «Tengo un código».\n3. Escribe: ${formatearCodigo(
          c,
        )}\n\n` +
        `El código caduca en 48 horas.`,
    });
  }

  async function quitarVinculo(
    vinculoId: string,
    titulo: string,
    texto: string,
  ) {
    if (!(await confirmar(titulo, texto, 'Sí, quitar', true))) return;
    setOcupado(true);
    try {
      await eliminarVinculo(vinculoId);
      await cargar();
    } catch (e) {
      mostrarError(e);
    } finally {
      setOcupado(false);
    }
  }

  async function vincular() {
    if (codigo.replace(/[^A-Za-z0-9]/g, '').length !== LONGITUD_CODIGO) {
      mostrarError(
        `El código tiene ${LONGITUD_CODIGO} letras y números. Revísalo.`,
        'Código incompleto',
      );
      return;
    }
    setOcupado(true);
    try {
      await aceptarInvitacion(codigo);
      setCodigo('');
      setVerCampoCodigo(false);
      await cargar();
      const permitido = await pedirPermisoAvisosCuidador().catch(() => false);
      avisoBreve(
        permitido
          ? '¡Listo! Te avisaremos si falta confirmar alguna toma.'
          : '¡Listo! Activa las notificaciones de Capsora para recibir avisos si falta alguna toma.',
      );
    } catch (e) {
      mostrarError(e, 'No se ha podido vincular');
    } finally {
      setOcupado(false);
    }
  }

  if (!familia && !error) return <Cargando />;

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      {error ? (
        <Aviso
          tipo="peligro"
          titulo="No se ha podido cargar"
          texto={error}
          accion={{ titulo: 'Reintentar', onPress: refrescar }}
        />
      ) : null}

      {/* ── Personas que cuido ── */}
      <TituloSeccion texto="Personas que cuidas" />
      {familia?.personas.length ? (
        familia.personas.map(p => (
          <TarjetaPersona
            key={p.vinculoId}
            persona={p}
            datos={datosPersonas[p.pacienteId]}
            ahora={ahora}
            onPress={() =>
              navigation.navigate('Paciente', {
                pacienteId: p.pacienteId,
                nombre: p.nombre,
              })
            }
          />
        ))
      ) : (
        <Text style={tipografia.bodySecondary}>
          Si un familiar te ha dado un código, introdúcelo aquí para ver si se
          toma su medicación.
        </Text>
      )}
      {verCampoCodigo ? (
        <Tarjeta>
          <CampoTexto
            etiqueta={`Código de ${LONGITUD_CODIGO} caracteres`}
            placeholder="Ej. K7M2 QXAB"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={LONGITUD_CODIGO + 2}
            value={codigo}
            onChangeText={setCodigo}
            onSubmitEditing={vincular}
            style={styles.campoCodigo}
          />
          <Boton titulo="Vincular" onPress={vincular} cargando={ocupado} />
          <Boton
            variante="texto"
            titulo="Cancelar"
            onPress={() => setVerCampoCodigo(false)}
          />
        </Tarjeta>
      ) : (
        <Boton
          variante="secundario"
          titulo="Tengo un código"
          icono="key"
          onPress={() => setVerCampoCodigo(true)}
        />
      )}

      {/* ── Mi cuidador ── */}
      <TituloSeccion texto="Tu cuidador" />
      {familia?.miCuidador ? (
        <Tarjeta>
          <View style={styles.nombre}>
            <Icono nombre="user" color={colores.primary} />
            <Text style={tipografia.subtitle}>{familia.miCuidador.nombre}</Text>
          </View>
          <Text style={tipografia.body}>
            Puede ver tus medicamentos y si los has tomado. No puede cambiar
            nada.
          </Text>
          <Boton
            variante="peligro"
            titulo="Dejar de compartir"
            deshabilitado={ocupado}
            onPress={() =>
              quitarVinculo(
                familia.miCuidador!.vinculoId,
                '¿Dejar de compartir?',
                `${familia.miCuidador!.nombre} ya no podrá ver tus tomas.`,
              )
            }
          />
        </Tarjeta>
      ) : null}

      {familia?.invitacion ? (
        <Tarjeta>
          <Text style={tipografia.bodyStrong}>Código para tu familiar</Text>
          <Text
            style={styles.codigo}
            selectable
            accessibilityLabel={`Código: ${familia.invitacion.codigo
              .split('')
              .join(' ')}`}
          >
            {formatearCodigo(familia.invitacion.codigo)}
          </Text>
          <Text style={tipografia.bodySecondary}>
            Caduca {formatearCaducidad(familia.invitacion.expiraEn)}. Cuando lo
            use, verá tus tomas
            {familia.miCuidador
              ? ` y sustituirá a ${familia.miCuidador.nombre}`
              : ''}
            .
          </Text>
          <Boton
            titulo="Enviar código"
            icono="share-network"
            onPress={() => compartirCodigo(familia.invitacion!.codigo)}
          />
          <Boton
            variante="texto"
            titulo="Anular el código"
            deshabilitado={ocupado}
            onPress={() =>
              quitarVinculo(
                familia.invitacion!.vinculoId,
                '¿Anular el código?',
                'Ya no servirá para vincularse contigo.',
              )
            }
          />
        </Tarjeta>
      ) : (
        <Tarjeta>
          {!familia?.miCuidador ? (
            <Text style={tipografia.body}>
              Invita a un hijo, hija o familiar. Desde su móvil verá si te has
              tomado la medicación, sin tener que llamarte cada día para
              preguntar.
            </Text>
          ) : (
            <Text style={tipografia.bodySecondary}>
              En esta versión cada persona tiene un solo cuidador. Si invitas a
              otra persona, sustituirá a {familia.miCuidador.nombre}.
            </Text>
          )}
          <Boton
            variante={familia?.miCuidador ? 'secundario' : 'primario'}
            titulo={
              familia?.miCuidador
                ? 'Invitar a otra persona'
                : 'Invitar a un familiar'
            }
            icono="users-three"
            cargando={ocupado}
            onPress={invitar}
          />
        </Tarjeta>
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  filaPersona: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombre: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  campoCodigo: {
    fontFamily: FUENTE,
    fontSize: 26,
    letterSpacing: 6,
    fontWeight: '700',
    textAlign: 'center',
  },
  codigo: {
    fontFamily: FUENTE,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
    color: colores.primaryDark,
    backgroundColor: colores.primaryLight,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
}));
