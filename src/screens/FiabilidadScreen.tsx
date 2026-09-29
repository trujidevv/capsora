import React, { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import Icono from '../components/Icono';
import { useFocusEffect } from '@react-navigation/native';
import Aviso from '../components/Aviso';
import Boton from '../components/Boton';
import Pantalla from '../components/Pantalla';
import Tarjeta from '../components/Tarjeta';
import { Cargando } from '../components/Varios';
import { avisoBreve, confirmar, mostrarError } from '../lib/avisar';
import { marcarBienvenidaVista } from '../lib/bienvenida';
import { useFiabilidad } from '../lib/FiabilidadContext';
import {
  abrirAjustesAlarmas,
  abrirAjustesBateria,
  abrirAjustesFabricante,
  enviarAvisoPrueba,
  instruccionesMarca,
  marcaDe,
  NOMBRE_MARCA,
  pedirPermisoNotificaciones,
  todoCorrecto,
} from '../notificaciones/fiabilidad';
import { sincronizarAvisos } from '../notificaciones/sincronizar';
import type { PantallaApp } from '../navigation/tipos';
import { radii, spacing, FUENTE } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

function Paso({
  numero,
  titulo,
  ok,
  children,
}: {
  numero: number;
  titulo: string;
  /** true = hecho, false = falta, null = no se puede comprobar */
  ok: boolean | null;
  children: React.ReactNode;
}) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  return (
    <Tarjeta style={ok === false ? styles.pasoPendiente : undefined}>
      <View style={styles.cabeceraPaso}>
        <View style={[styles.numero, ok === true && styles.numeroOk]}>
          {ok === true ? (
            <Icono nombre="check" tamano={20} color={colores.textOnSuccess} />
          ) : (
            <Text style={styles.textoNumero}>{numero}</Text>
          )}
        </View>
        <Text style={[tipografia.subtitle, styles.tituloPaso]}>{titulo}</Text>
      </View>
      {children}
    </Tarjeta>
  );
}

export default function FiabilidadScreen({
  navigation,
  route,
}: PantallaApp<'Fiabilidad'>) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const desdeBienvenida = route.params?.desdeBienvenida ?? false;
  const { estado, comprobar } = useFiabilidad();
  const [pruebaA, setPruebaA] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      comprobar();
    }, [comprobar]),
  );

  async function accion(fn: () => Promise<unknown>) {
    try {
      await fn();
      await comprobar();
      await sincronizarAvisos();
    } catch (e) {
      mostrarError(e);
    }
  }

  async function prueba() {
    try {
      await enviarAvisoPrueba(60);
      const d = new Date(Date.now() + 60000);
      setPruebaA(
        `${String(d.getHours()).padStart(2, '0')}:${String(
          d.getMinutes(),
        ).padStart(2, '0')}`,
      );
      avisoBreve(
        'Aviso de prueba programado. Bloquea el móvil y espera un minuto.',
      );
    } catch (e) {
      mostrarError(e);
    }
  }

  async function terminar() {
    if (estado && !todoCorrecto(estado)) {
      const seguir = await confirmar(
        'Aún falta algún paso',
        'Si no lo completas, algunos avisos podrían no sonar a su hora. Puedes volver aquí desde Ajustes.',
        'Terminar igualmente',
      );
      if (!seguir) return;
    }
    if (desdeBienvenida) {
      await marcarBienvenidaVista();
      navigation.reset({ index: 0, routes: [{ name: 'Principal' }] });
    } else {
      navigation.goBack();
    }
  }

  if (!estado) return <Cargando texto="Revisando tu móvil…" />;

  const marca = marcaDe(estado.fabricante);
  const mostrarFabricante = marca !== 'otro' || estado.tieneAjustesFabricante;
  let n = 0;

  return (
    <Pantalla
      pie={
        <Boton
          titulo={desdeBienvenida ? 'Terminar' : 'Listo'}
          onPress={terminar}
        />
      }
    >
      <Text style={tipografia.body}>
        Para que los recordatorios suenen siempre a su hora, el móvil tiene que
        dejar trabajar a la app aunque esté cerrada. Revisa cada paso: cuando
        esté bien, se pondrá en verde.
      </Text>

      {todoCorrecto(estado) ? (
        <Aviso
          tipo="exito"
          titulo="¡Todo listo!"
          texto="Tu móvil está preparado. Te recomendamos hacer la prueba del final."
        />
      ) : null}

      <Paso
        numero={++n}
        titulo="Permitir notificaciones"
        ok={estado.permisoNotificaciones}
      >
        <Text style={tipografia.bodySecondary}>
          Sin este permiso no puede sonar ningún aviso.
        </Text>
        {!estado.permisoNotificaciones ? (
          <Boton
            titulo="Permitir notificaciones"
            onPress={() => accion(pedirPermisoNotificaciones)}
          />
        ) : null}
      </Paso>

      {estado.alarmasExactas !== null ? (
        <Paso
          numero={++n}
          titulo="Avisos a la hora exacta"
          ok={estado.alarmasExactas}
        >
          <Text style={tipografia.bodySecondary}>
            Activa «Permitir alarmas y recordatorios». Así el aviso llega en el
            minuto justo, como un despertador.
          </Text>
          {!estado.alarmasExactas ? (
            <Boton
              titulo="Activar"
              onPress={() => accion(abrirAjustesAlarmas)}
            />
          ) : null}
        </Paso>
      ) : null}

      <Paso
        numero={++n}
        titulo="Quitar el ahorro de batería"
        ok={
          estado.bateriaOptimizada === null ? null : !estado.bateriaOptimizada
        }
      >
        <Text style={tipografia.bodySecondary}>
          Si no, el móvil puede «dormir» la app y los avisos llegarían tarde. En
          la lista, busca esta app y elige «No optimizar» o «Sin restricciones».
        </Text>
        {estado.bateriaOptimizada !== false ? (
          <Boton
            titulo="Abrir ajustes de batería"
            onPress={() => accion(abrirAjustesBateria)}
          />
        ) : null}
      </Paso>

      {mostrarFabricante ? (
        <Paso
          numero={++n}
          titulo={`Ajustes especiales de ${NOMBRE_MARCA[marca]}`}
          ok={null}
        >
          <Text style={tipografia.bodySecondary}>
            {marca === 'otro'
              ? 'Tu móvil tiene su propio gestor de energía. Revisa que esta app no esté restringida.'
              : `Los móviles ${NOMBRE_MARCA[marca]} cierran las apps para ahorrar batería. Haz esto una vez:`}
          </Text>
          {instruccionesMarca(marca).map((texto, i) => (
            <Text key={i} style={tipografia.body}>
              {i + 1}. {texto}
            </Text>
          ))}
          <Boton
            variante="secundario"
            titulo="Abrir los ajustes"
            onPress={() =>
              accion(
                estado.tieneAjustesFabricante
                  ? abrirAjustesFabricante
                  : () => Linking.openSettings(),
              )
            }
          />
        </Paso>
      ) : null}

      <Paso numero={++n} titulo="Haz la prueba" ok={null}>
        <Text style={tipografia.bodySecondary}>
          Te enviaremos un aviso dentro de 1 minuto. Sal de la app y bloquea el
          móvil. Si suena, todo funciona.
        </Text>
        {pruebaA ? (
          <View style={styles.prueba}>
            <Text style={tipografia.bodyStrong}>
              Aviso de prueba a las {pruebaA}
            </Text>
            <Text style={tipografia.bodySecondary}>
              Si no llega, revisa los pasos anteriores y vuelve a probar.
            </Text>
          </View>
        ) : null}
        <Boton
          variante="acento"
          titulo="Enviar aviso de prueba"
          icono="bell-ringing"
          onPress={prueba}
        />
      </Paso>
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  pasoPendiente: { borderColor: colores.warning, borderWidth: 2 },
  cabeceraPaso: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tituloPaso: { flex: 1 },
  numero: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colores.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroOk: { backgroundColor: colores.success },
  textoNumero: {
    fontFamily: FUENTE,
    color: colores.textOnPrimary,
    fontWeight: '800',
    fontSize: 18,
  },
  prueba: {
    backgroundColor: colores.primaryLight,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
}));
