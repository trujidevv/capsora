import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import notifee, { EventType } from 'react-native-notify-kit';
import { obtenerMedicamentos } from '../data/medicamentos';
import {
  guardarMiNombre,
  guardarMiZonaHoraria,
  obtenerMiNombre,
} from '../data/perfil';
import {
  deshacerToma,
  enviarColaPendiente,
  obtenerRegistros,
  registrarTomas,
  tomasEnCola,
  type ItemToma,
  type ResultadoRegistro,
} from '../data/tomas';
import { hoy, sumarDias, type Fecha } from '../logic/fechas';
import {
  claveRegistro,
  mapaDeRegistros,
  type EstadoRegistro,
  type MapaRegistros,
  type Medicamento,
  type RegistroToma,
} from '../logic/tipos';
import { manejarEventoAviso } from '../notificaciones/acciones';
import { guardarAgenda, reemplazarRegistradas } from '../notificaciones/cache';
import { activarAvisosCuidador } from '../notificaciones/push';
import { sincronizarAvisos } from '../notificaciones/sincronizar';
import { CLAVES, guardarJSON, leerJSON } from './almacen';
import { useUsuarioId } from './AuthContext';
import { esErrorDeRed, esErrorDeSesion, mensajeDeError } from './errores';
import { alCambiarDatos } from './eventos';
import { supabase } from './supabase';

/** Días de historial que se cargan (5 semanas para el calendario). */
export const DIAS_HISTORIAL = 35;

interface Instantanea {
  usuarioId: string;
  medicamentos: Medicamento[];
  registros: RegistroToma[];
  nombre: string;
}

interface ValorDatos {
  medicamentos: Medicamento[];
  registros: MapaRegistros;
  nombre: string;
  /** Primera carga en curso */
  cargando: boolean;
  /** Se muestran datos guardados porque no hay internet */
  sinConexion: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  marcar: (
    items: ItemToma[],
    estado: EstadoRegistro,
  ) => Promise<ResultadoRegistro>;
  deshacer: (horarioId: string, fecha: Fecha) => Promise<void>;
  cambiarNombre: (nombre: string) => Promise<void>;
}

const DatosContext = createContext<ValorDatos | null>(null);

/** Lo guardado en el servidor + lo marcado sin conexión (esto último manda). */
function combinar(
  servidor: RegistroToma[],
  cola: RegistroToma[],
): RegistroToma[] {
  const mapa = mapaDeRegistros(servidor);
  for (const r of cola) mapa.set(claveRegistro(r.horarioId, r.fecha), r);
  return [...mapa.values()];
}

/** Guarda en el móvil lo que necesitan los avisos y los reprograma. */
async function actualizarAvisos(
  usuarioId: string,
  medicamentos: Medicamento[],
  nombre: string,
  registros: RegistroToma[] | null,
  inicioCarga: number,
) {
  await guardarAgenda(usuarioId, medicamentos, nombre);
  if (registros) {
    const desde = sumarDias(hoy(), -1);
    await reemplazarRegistradas(
      usuarioId,
      registros.filter(r => r.fecha >= desde),
      inicioCarga,
    );
  }
  await sincronizarAvisos();
}

export function DatosProvider({ children }: { children: React.ReactNode }) {
  const usuarioId = useUsuarioId();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [registros, setRegistros] = useState<MapaRegistros>(new Map());
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Control de concurrencia entre cargas y marcas:
  const cargaEnCurso = useRef<Promise<void> | null>(null);
  const pedidas = useRef(0); // cargas solicitadas
  const completadas = useRef(0); // última solicitud atendida por una carga terminada
  const version = useRef(0); // sube al terminar cada marcar/deshacer
  const mutando = useRef(0); // marcar/deshacer en curso
  const recargaPendiente = useRef(false);
  const recargarRef = useRef<() => Promise<void>>(async () => undefined);

  const sinConexionRef = useRef(false);

  /** Sin internet (o sin sesión válida todavía): se enseña lo último guardado. */
  const usarInstantanea = useCallback(
    async (version0: number) => {
      const guardada = await leerJSON<Instantanea | null>(
        CLAVES.instantanea,
        null,
      );
      if (
        guardada &&
        guardada.usuarioId === usuarioId &&
        mutando.current === 0 &&
        version.current === version0
      ) {
        setMedicamentos(guardada.medicamentos);
        setRegistros(
          mapaDeRegistros(
            combinar(guardada.registros, await tomasEnCola(usuarioId)),
          ),
        );
        setNombre(guardada.nombre);
      }
      sinConexionRef.current = true;
      setSinConexion(true);
      setError(null);
      // Los avisos NO se tocan: siguen programados en el móvil con la agenda guardada.
    },
    [usuarioId],
  );

  const cargarAhora = useCallback(async () => {
    const inicioCarga = Date.now();
    const version0 = version.current;
    // Sin sesión válida (token caducado y aún sin renovar) las consultas irían como
    // anónimo y RLS devolvería listas VACÍAS sin error: eso borraría la agenda y
    // todos los avisos. Mejor tratarlo como "sin conexión" hasta que se renueve.
    const { data: sesion } = await supabase.auth
      .getSession()
      .catch(() => ({ data: { session: null } }));
    if (!sesion.session) {
      await usarInstantanea(version0);
      setCargando(false);
      return;
    }
    await enviarColaPendiente().catch(() => undefined);
    try {
      const [meds, miNombre] = await Promise.all([
        obtenerMedicamentos(usuarioId),
        obtenerMiNombre(usuarioId).catch(() => ''),
      ]);
      const horarioIds = meds.flatMap(m => m.horarios.map(h => h.id));
      const servidor = await obtenerRegistros(
        horarioIds,
        sumarDias(hoy(), -DIAS_HISTORIAL),
        sumarDias(hoy(), 1),
      );
      const todos = combinar(servidor, await tomasEnCola(usuarioId));

      // Si mientras se descargaba se marcó o deshizo algo, esta foto de las tomas ya es
      // vieja: se aplican los medicamentos pero las tomas se vuelven a pedir después.
      const obsoleta = mutando.current > 0 || version.current !== version0;

      setMedicamentos(meds);
      if (!obsoleta) setRegistros(mapaDeRegistros(todos));
      setNombre(miNombre);
      sinConexionRef.current = false;
      setSinConexion(false);
      setError(null);

      if (!obsoleta) {
        const instantanea: Instantanea = {
          usuarioId,
          medicamentos: meds,
          registros: todos,
          nombre: miNombre,
        };
        await guardarJSON(CLAVES.instantanea, instantanea);
      }
      await actualizarAvisos(
        usuarioId,
        meds,
        miNombre,
        obsoleta ? null : todos,
        inicioCarga,
      );
      if (obsoleta) recargaPendiente.current = true;
    } catch (e) {
      if (esErrorDeRed(e) || esErrorDeSesion(e)) {
        await usarInstantanea(version0);
      } else {
        setError(mensajeDeError(e));
      }
    } finally {
      setCargando(false);
    }
  }, [usuarioId, usarInstantanea]);

  /**
   * Pide datos frescos. Si ya hay una carga en marcha que empezó ANTES de esta
   * petición, se espera a que acabe y se lanza otra (la anterior puede traer datos
   * de antes de un cambio recién guardado). Varias peticiones seguidas se agrupan.
   */
  const recargar = useCallback(async () => {
    pedidas.current += 1;
    const objetivo = pedidas.current;
    while (completadas.current < objetivo) {
      if (!cargaEnCurso.current) {
        const atiende = pedidas.current;
        cargaEnCurso.current = cargarAhora().finally(() => {
          completadas.current = Math.max(completadas.current, atiende);
          cargaEnCurso.current = null;
        });
      }
      await cargaEnCurso.current;
    }
    if (recargaPendiente.current && mutando.current === 0) {
      recargaPendiente.current = false;
      await recargarRef.current();
    }
  }, [cargarAhora]);
  recargarRef.current = recargar;

  // Avisos del servidor (si esta persona es cuidadora de alguien) y zona horaria
  // (si es paciente, para que el servidor sepa cuándo le toca cada toma).
  useEffect(() => {
    guardarMiZonaHoraria(usuarioId).catch(() => undefined);
    return activarAvisosCuidador();
  }, [usuarioId]);

  useEffect(() => {
    recargar();
    const sub = AppState.addEventListener('change', estado => {
      if (estado === 'active') recargar();
    });
    return () => sub.remove();
  }, [recargar]);

  // Botones de la notificación con la app abierta
  useEffect(
    () =>
      notifee.onForegroundEvent(async evento => {
        if (evento.type === EventType.ACTION_PRESS)
          await manejarEventoAviso(evento);
      }),
    [],
  );
  useEffect(
    () =>
      alCambiarDatos(() => {
        recargar();
      }),
    [recargar],
  );

  // Al volver internet y renovarse la sesión, se sale del modo sin conexión
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(evento => {
      if (
        (evento === 'TOKEN_REFRESHED' || evento === 'SIGNED_IN') &&
        sinConexionRef.current
      ) {
        recargar();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [recargar]);

  /** Envuelve marcar/deshacer para que las cargas sepan que hay cambios en curso. */
  const conMutacion = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      mutando.current += 1;
      try {
        return await fn();
      } catch (e) {
        recargaPendiente.current = true; // para deshacer el cambio optimista con datos reales
        throw e;
      } finally {
        mutando.current -= 1;
        version.current += 1;
        if (recargaPendiente.current && mutando.current === 0) {
          recargaPendiente.current = false;
          recargarRef.current();
        }
      }
    },
    [],
  );

  const marcar = useCallback(
    (items: ItemToma[], estado: EstadoRegistro) =>
      conMutacion(async () => {
        const confirmadoEn = new Date().toISOString();
        setRegistros(prev => {
          const nuevo = new Map(prev);
          for (const i of items)
            nuevo.set(claveRegistro(i.horarioId, i.fecha), {
              ...i,
              estado,
              confirmadoEn,
            });
          return nuevo;
        });
        const resultado = await registrarTomas(items, estado);
        await sincronizarAvisos();
        return resultado;
      }),
    [conMutacion],
  );

  const deshacer = useCallback(
    (horarioId: string, fecha: Fecha) =>
      conMutacion(async () => {
        await deshacerToma(horarioId, fecha);
        setRegistros(prev => {
          const nuevo = new Map(prev);
          nuevo.delete(claveRegistro(horarioId, fecha));
          return nuevo;
        });
        await sincronizarAvisos();
      }),
    [conMutacion],
  );

  const cambiarNombre = useCallback(
    async (nuevo: string) => {
      await guardarMiNombre(usuarioId, nuevo);
      setNombre(nuevo.trim());
    },
    [usuarioId],
  );

  return (
    <DatosContext.Provider
      value={{
        medicamentos,
        registros,
        nombre,
        cargando,
        sinConexion,
        error,
        recargar,
        marcar,
        deshacer,
        cambiarNombre,
      }}
    >
      {children}
    </DatosContext.Provider>
  );
}

export function useDatos(): ValorDatos {
  const valor = useContext(DatosContext);
  if (!valor) throw new Error('useDatos debe usarse dentro de <DatosProvider>');
  return valor;
}
