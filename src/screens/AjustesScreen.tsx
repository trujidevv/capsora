import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import Aviso from '../components/Aviso';
import Boton from '../components/Boton';
import CampoTexto from '../components/CampoTexto';
import EtiquetaEstado from '../components/EtiquetaEstado';
import Pantalla from '../components/Pantalla';
import Tarjeta from '../components/Tarjeta';
import {
  FilaAjuste,
  SelectorOpciones,
  TituloSeccion,
} from '../components/Varios';
import { obtenerRegistros, tomasEnCola } from '../data/tomas';
import { useAuth } from '../lib/AuthContext';
import { avisoBreve, confirmar, elegir, mostrarError } from '../lib/avisar';
import { useDatos } from '../lib/DatosContext';
import { useFiabilidad } from '../lib/FiabilidadContext';
import {
  abrirCorreo,
  abrirEnlace,
  CORREO_CONTACTO,
  URL_PRIVACIDAD,
  VERSION_APP,
} from '../lib/enlaces';
import { enlaceContacto } from '../logic/contacto';
import { cambiarInformes, informesActivados } from '../lib/informesFallos';
import { borrarMiCuenta, cerrarSesion } from '../lib/sesion';
import { generarCSV } from '../logic/csv';
import { aFecha, hoy, sumarDias } from '../logic/fechas';
import { mapaDeRegistros } from '../logic/tipos';
import {
  guardarAjustes,
  leerAjustes,
  type AjustesAvisos,
} from '../notificaciones/cache';
import { enviarAvisoPrueba, todoCorrecto } from '../notificaciones/fiabilidad';
import { sincronizarAvisos } from '../notificaciones/sincronizar';
import type { PantallaTab } from '../navigation/tipos';
import { spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';
import type { PreferenciaTema } from '../logic/tema';

const OPCIONES_TEMA: { valor: PreferenciaTema; etiqueta: string }[] = [
  { valor: 'automatico', etiqueta: 'Automático' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
];

const OPCIONES_RECORDATORIO: { valor: number | null; etiqueta: string }[] = [
  { valor: null, etiqueta: 'No' },
  { valor: 10, etiqueta: '10 min' },
  { valor: 15, etiqueta: '15 min' },
  { valor: 30, etiqueta: '30 min' },
];

const OPCIONES_INFORMES: { valor: boolean; etiqueta: string }[] = [
  { valor: true, etiqueta: 'Sí' },
  { valor: false, etiqueta: 'No' },
];

export default function AjustesScreen({ navigation }: PantallaTab<'Ajustes'>) {
  const { tipografia, preferencia, cambiarPreferencia } = useTema();
  const styles = useEstilos();
  const { usuario } = useAuth();
  const { nombre, cambiarNombre, medicamentos } = useDatos();
  const { estado: fiabilidad } = useFiabilidad();
  const [ajustes, setAjustes] = useState<AjustesAvisos | null>(null);
  const [nombreEditado, setNombreEditado] = useState(nombre);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [informes, setInformes] = useState<boolean | null>(null);

  useEffect(() => {
    leerAjustes().then(setAjustes);
    informesActivados().then(setInformes);
  }, []);
  useEffect(() => setNombreEditado(nombre), [nombre]);

  async function cambiarRecordatorio(valor: number | null) {
    const nuevos = {
      ...(ajustes ?? { recordatorioMin: null }),
      recordatorioMin: valor,
    };
    setAjustes(nuevos);
    await guardarAjustes(nuevos);
    await sincronizarAvisos();
  }

  async function elegirInformes(valor: boolean) {
    setInformes(valor);
    await cambiarInformes(valor);
  }

  function escribirnos() {
    const c = Platform.constants as {
      Brand?: string;
      Model?: string;
      Release?: string;
    };
    abrirCorreo(
      enlaceContacto(CORREO_CONTACTO, {
        marca: c.Brand,
        modelo: c.Model,
        android: c.Release ?? Platform.Version,
        versionApp: VERSION_APP,
      }),
    );
  }

  async function guardarNombre() {
    if (!nombreEditado.trim()) return;
    setGuardandoNombre(true);
    try {
      await cambiarNombre(nombreEditado);
      avisoBreve('Nombre guardado');
    } catch (e) {
      mostrarError(e);
    } finally {
      setGuardandoNombre(false);
    }
  }

  const exportar = useCallback(async () => {
    if (medicamentos.length === 0) {
      avisoBreve('Aún no hay datos que exportar');
      return;
    }
    setExportando(true);
    try {
      const ahora = new Date();
      const primera = medicamentos
        .map(m => aFecha(new Date(m.creadoEn)))
        .sort()[0];
      const limite = sumarDias(hoy(ahora), -365);
      const desde = primera > limite ? primera : limite;
      const ids = medicamentos.flatMap(m => m.horarios.map(h => h.id));
      const registros = mapaDeRegistros(
        await obtenerRegistros(ids, desde, hoy(ahora)),
      );
      const csv = generarCSV(medicamentos, registros, desde, hoy(ahora), ahora);
      await Share.share({ title: 'Historial de medicación', message: csv });
    } catch (e) {
      mostrarError(e, 'No se ha podido exportar');
    } finally {
      setExportando(false);
    }
  }, [medicamentos]);

  async function salir() {
    const sinEnviar = usuario ? (await tomasEnCola(usuario.id)).length : 0;
    const ok = await confirmar(
      '¿Cerrar sesión?',
      (sinEnviar > 0
        ? `Tienes ${sinEnviar} toma${sinEnviar > 1 ? 's' : ''} marcada${
            sinEnviar > 1 ? 's' : ''
          } sin internet que aún no se ha${
            sinEnviar > 1 ? 'n' : ''
          } enviado. Si cierras sesión ahora se perderá${
            sinEnviar > 1 ? 'n' : ''
          }.\n\n`
        : '') +
        'Dejarás de recibir los avisos en este móvil hasta que vuelvas a entrar.',
      'Cerrar sesión',
      true,
    );
    if (ok) await cerrarSesion().catch(e => mostrarError(e));
  }

  async function borrarCuenta() {
    const paso = await elegir(
      '¿Borrar tu cuenta?',
      'Se borrarán para siempre tus medicamentos, tu historial de tomas y el ' +
        'vínculo con tu familiar o con las personas que cuidas.\n\n' +
        'Si quieres guardar tu historial, expórtalo antes.',
      [
        { texto: 'Cancelar', valor: 'cancelar' as const, estilo: 'cancel' },
        { texto: 'Exportar antes', valor: 'exportar' as const },
        { texto: 'Continuar', valor: 'seguir' as const, estilo: 'destructive' },
      ],
      'cancelar' as const,
    );
    if (paso === 'exportar') return exportar();
    if (paso !== 'seguir') return;

    const seguro = await confirmar(
      '¿Seguro que quieres borrarla?',
      'No se puede deshacer. Tu cuenta y todos tus datos se borrarán ahora mismo.',
      'Borrar para siempre',
      true,
    );
    if (!seguro) return;

    setBorrando(true);
    try {
      await borrarMiCuenta();
      avisoBreve('Tu cuenta se ha borrado');
    } catch (e) {
      mostrarError(e, 'No se ha podido borrar la cuenta');
    } finally {
      setBorrando(false);
    }
  }

  return (
    <Pantalla>
      <TituloSeccion texto="Avisos" />
      <Tarjeta>
        <FilaAjuste
          titulo="Que los avisos suenen siempre"
          descripcion="Permisos, batería y prueba de aviso"
          onPress={() => navigation.navigate('Fiabilidad')}
          derecha={
            fiabilidad ? (
              <EtiquetaEstado
                estado={todoCorrecto(fiabilidad) ? 'tomada' : 'atrasada'}
                texto={todoCorrecto(fiabilidad) ? 'Bien' : 'Revisar'}
              />
            ) : undefined
          }
        />
        <View style={styles.bloque}>
          <Text style={tipografia.bodyStrong}>
            Volver a avisar si no confirmo
          </Text>
          <Text style={tipografia.bodySecondary}>
            Un segundo aviso si no pulsas «Tomada».
          </Text>
          {ajustes ? (
            <SelectorOpciones
              opciones={OPCIONES_RECORDATORIO}
              valor={ajustes.recordatorioMin}
              onCambiar={cambiarRecordatorio}
            />
          ) : null}
        </View>
        <Boton
          variante="secundario"
          titulo="Probar un aviso (en 30 segundos)"
          onPress={() =>
            enviarAvisoPrueba(30)
              .then(() => avisoBreve('Sal de la app y espera 30 segundos'))
              .catch(e => mostrarError(e))
          }
        />
      </Tarjeta>

      <TituloSeccion texto="Aspecto" />
      <Tarjeta>
        <View style={styles.bloque}>
          <Text style={tipografia.bodyStrong}>Colores de la app</Text>
          <Text style={tipografia.bodySecondary}>
            «Automático» usa el mismo modo que tu móvil.
          </Text>
          <SelectorOpciones
            opciones={OPCIONES_TEMA}
            valor={preferencia}
            onCambiar={cambiarPreferencia}
          />
        </View>
      </Tarjeta>

      <TituloSeccion texto="Tu perfil" />
      <Tarjeta>
        <CampoTexto
          etiqueta="Tu nombre"
          ayuda="Es el nombre que verá tu familiar."
          value={nombreEditado}
          onChangeText={setNombreEditado}
          autoCapitalize="words"
        />
        {nombreEditado.trim() !== nombre ? (
          <Boton
            titulo="Guardar nombre"
            onPress={guardarNombre}
            cargando={guardandoNombre}
          />
        ) : null}
        <Text style={tipografia.bodySecondary}>Cuenta: {usuario?.email}</Text>
      </Tarjeta>

      <TituloSeccion texto="Tus datos" />
      <Tarjeta>
        <Text style={tipografia.body}>
          Tus datos son tuyos: puedes exportar todo tu historial cuando quieras,
          gratis. Nunca vendemos tus datos de salud.
        </Text>
        <Boton
          variante="secundario"
          titulo="Exportar historial (CSV)"
          icono="download-simple"
          onPress={exportar}
          cargando={exportando}
        />
        <View style={styles.bloque}>
          <Text style={tipografia.bodyStrong}>Enviar informes de fallos</Text>
          <Text style={tipografia.bodySecondary}>
            Si la app se cierra por un error, nos llega un informe técnico para
            arreglarlo. No incluye tus medicamentos, tu nombre ni tu correo.
          </Text>
          {informes !== null ? (
            <SelectorOpciones
              opciones={OPCIONES_INFORMES}
              valor={informes}
              onCambiar={elegirInformes}
            />
          ) : null}
        </View>
        <Boton
          variante="texto"
          compacto
          titulo="Política de privacidad"
          onPress={() => abrirEnlace(URL_PRIVACIDAD)}
        />
      </Tarjeta>

      <TituloSeccion texto="Ayuda" />
      <Tarjeta>
        <Text style={tipografia.body}>
          ¿Tienes una duda, algo no funciona o se te ocurre una mejora?
          Escríbenos: leemos todos los correos.
        </Text>
        <Boton
          variante="secundario"
          titulo="Escríbenos"
          icono="envelope-simple"
          onPress={escribirnos}
          accessibilityHint="Abre tu app de correo con el mensaje empezado"
        />
        <Text style={tipografia.bodySecondary}>
          Se abre tu correo con el modelo de tu móvil ya puesto, para ayudarte
          mejor. Nuestra dirección es {CORREO_CONTACTO}.
        </Text>
      </Tarjeta>

      <Aviso
        tipo="info"
        titulo="Aviso importante"
        texto="Esta app es solo un recordatorio. No es un producto sanitario, no da consejos médicos ni sustituye a tu médico o farmacéutico. Ante cualquier duda sobre tu medicación, consúltales."
      />

      <Boton
        variante="peligro"
        titulo="Cerrar sesión"
        onPress={salir}
        style={styles.salir}
      />
      <Boton
        variante="textoPeligro"
        compacto
        titulo="Borrar mi cuenta"
        onPress={borrarCuenta}
        cargando={borrando}
        accessibilityHint="Borra para siempre tu cuenta y todos tus datos"
      />
      <Text style={[tipografia.caption, styles.version]}>
        Versión {VERSION_APP} (MVP)
      </Text>
    </Pantalla>
  );
}

const useEstilos = crearEstilos(() => ({
  bloque: { gap: spacing.sm, paddingVertical: spacing.sm },
  salir: { marginTop: spacing.md },
  version: { textAlign: 'center' },
}));
