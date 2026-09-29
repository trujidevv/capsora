/**
 * Pruebas del módulo de avisos con la librería nativa simulada:
 * programación, idempotencia, actualización al marcar y botón «Tomada» en segundo plano.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import notifee, { AlarmType, EventType } from 'react-native-notify-kit';
import type { Medicamento } from '../src/logic/tipos';

const mockUpsert = jest.fn(async () => ({ error: null }));
const mockGetSession = jest.fn(async () => ({
  data: { session: { user: { id: 'u1' } } as any },
}));
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
    from: jest.fn(() => ({ upsert: mockUpsert })),
  },
}));
jest.mock('../src/data/latidos', () => ({
  enviarLatido: jest.fn(async () => undefined),
}));

import {
  guardarAgenda,
  leerRegistradas,
  marcarRegistradasLocal,
  reemplazarRegistradas,
} from '../src/notificaciones/cache';
import { sincronizarAvisos } from '../src/notificaciones/sincronizar';
import { manejarEventoAviso } from '../src/notificaciones/acciones';
import { claveSesionSupabase } from '../src/lib/usuarioLocal';

const n = notifee as unknown as Record<string, jest.Mock>;
const desde = new Date(2026, 8, 1).toISOString();
const meds: Medicamento[] = [
  {
    id: 'm1',
    nombre: 'Enalapril',
    dosis: '10 mg',
    color: null,
    creadoEn: desde,
    horarios: [
      {
        id: 'h1',
        hora: '08:00',
        activo: true,
        creadoEn: desde,
        desactivadoEn: null,
      },
      {
        id: 'h3',
        hora: '20:00',
        activo: true,
        creadoEn: desde,
        desactivadoEn: null,
      },
    ],
  },
  {
    id: 'm2',
    nombre: 'Metformina',
    dosis: null,
    color: null,
    creadoEn: desde,
    horarios: [
      {
        id: 'h2',
        hora: '08:00',
        activo: true,
        creadoEn: desde,
        desactivadoEn: null,
      },
    ],
  },
];

/** Simula que Android guarda lo que se programa */
let programados: { notification: any; trigger: any }[] = [];

beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { get: () => 'android' });
});

beforeEach(async () => {
  jest.useFakeTimers({
    doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
  });
  jest.setSystemTime(new Date(2026, 8, 25, 7, 0));
  await AsyncStorage.clear();
  programados = [];
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({ error: null });
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: 'u1' } } },
  });
  n.getNotificationSettings.mockResolvedValue({
    authorizationStatus: 1,
    android: { alarm: 1 },
  });
  n.getTriggerNotifications.mockImplementation(async () => programados);
  n.getTriggerNotificationIds.mockImplementation(async () =>
    programados.map(p => p.notification.id),
  );
  n.getDisplayedNotifications.mockResolvedValue([]);
  n.createTriggerNotification.mockImplementation(
    async (notification: any, trigger: any) => {
      programados = programados
        .filter(p => p.notification.id !== notification.id)
        .concat({ notification, trigger });
      return notification.id;
    },
  );
  n.cancelTriggerNotifications.mockImplementation(async (ids: string[]) => {
    programados = programados.filter(p => !ids.includes(p.notification.id));
  });
  n.cancelNotification.mockImplementation(async (id: string) => {
    programados = programados.filter(p => p.notification.id !== id);
  });
  // Lo que hace la app al iniciar sesión: recordar quién usa el móvil
  await AsyncStorage.setItem('medi.usuario.v1', JSON.stringify('u1'));
  await guardarAgenda('u1', meds, 'Carmen López');
});

afterEach(() => {
  jest.useRealTimers();
});

const ids = () => programados.map(p => p.notification.id).sort();
const deTomas = () => programados.filter(p => p.notification.id !== 'renovar');

test('programa 7 días de avisos agrupados por franja, con segundo aviso', async () => {
  await sincronizarAvisos();
  // 7 días × 2 franjas × (aviso + recordatorio) + el aviso de seguridad "renovar"
  expect(deTomas()).toHaveLength(28);
  const renovar = programados.find(p => p.notification.id === 'renovar')!;
  expect(renovar.trigger.timestamp).toBe(new Date(2026, 9, 1, 12, 0).getTime());
  const primero = programados.find(
    p => p.notification.id === 'dosis|2026-09-25|08:00',
  )!;
  expect(primero.notification.title).toBe('Carmen, te tocan 2 medicamentos');
  expect(primero.notification.data.horarioIds).toBe('h1,h2');
  // Desplegado, una pastilla por línea; y la cápsula a la derecha
  expect(primero.notification.android.style).toMatchObject({
    lines: ['Enalapril · 10 mg', 'Metformina'],
    summary: 'A las 08:00',
  });
  expect(primero.notification.android.largeIcon).toBeDefined();
  expect(primero.trigger.alarmManager.type).toBe(AlarmType.SET_ALARM_CLOCK);
  expect(primero.trigger.timestamp).toBe(new Date(2026, 8, 25, 8, 0).getTime());
  expect(
    primero.notification.android.actions.map((a: any) => a.pressAction.id),
  ).toEqual(['tomada', 'posponer']);
});

test('es idempotente: la segunda sincronización no reprograma nada', async () => {
  await sincronizarAvisos();
  n.createTriggerNotification.mockClear();
  await sincronizarAvisos();
  expect(n.createTriggerNotification).not.toHaveBeenCalled();
  expect(n.cancelTriggerNotifications).not.toHaveBeenCalled();
});

test('sin permiso de alarmas exactas usa una alarma inexacta y reprograma al cambiar', async () => {
  await sincronizarAvisos();
  n.getNotificationSettings.mockResolvedValue({
    authorizationStatus: 1,
    android: { alarm: 0 },
  });
  await sincronizarAvisos();
  expect(
    programados.every(
      p => p.trigger.alarmManager.type === AlarmType.SET_AND_ALLOW_WHILE_IDLE,
    ),
  ).toBe(true);
});

test('al marcar una toma se actualiza el aviso de su franja', async () => {
  await sincronizarAvisos();
  await marcarRegistradasLocal('u1', [
    {
      horarioId: 'h1',
      fecha: '2026-09-25',
      estado: 'tomado',
      confirmadoEn: null,
    },
  ]);
  n.createTriggerNotification.mockClear();
  await sincronizarAvisos();
  const recreados = n.createTriggerNotification.mock.calls
    .map(c => c[0].id)
    .sort();
  expect(recreados).toEqual([
    'dosis|2026-09-25|08:00',
    'recordatorio|2026-09-25|08:00',
  ]);
  const aviso = programados.find(
    p => p.notification.id === 'dosis|2026-09-25|08:00',
  )!;
  expect(aviso.notification.data.horarioIds).toBe('h2');
  expect(aviso.notification.title).toBe('Carmen, te toca Metformina');
});

test('botón «Tomada» con la app cerrada: guarda en el servidor y quita los avisos de la franja', async () => {
  await sincronizarAvisos();
  await manejarEventoAviso({
    type: EventType.ACTION_PRESS,
    detail: {
      notification: {
        id: 'dosis|2026-09-25|08:00',
        data: { horarioIds: 'h1,h2', fecha: '2026-09-25', hora: '08:00' },
      },
      pressAction: { id: 'tomada' },
    },
  } as any);

  expect(mockUpsert).toHaveBeenCalledTimes(1);
  const filas = (mockUpsert.mock.calls[0] as any[])[0];
  expect(filas.map((f: any) => [f.horario_id, f.fecha, f.estado])).toEqual([
    ['h1', '2026-09-25', 'tomado'],
    ['h2', '2026-09-25', 'tomado'],
  ]);
  expect(ids()).not.toContain('dosis|2026-09-25|08:00');
  expect(ids()).not.toContain('recordatorio|2026-09-25|08:00');
  expect(ids()).toContain('dosis|2026-09-25|20:00');
  expect(ids()).toContain('dosis|2026-09-26|08:00');
});

test('sin internet la toma queda en cola y los avisos se cancelan igual', async () => {
  await sincronizarAvisos();
  // Sin red durante todo el proceso (también al reintentar la cola)
  mockUpsert.mockResolvedValue({
    error: { message: 'TypeError: Network request failed' },
  } as any);
  await manejarEventoAviso({
    type: EventType.ACTION_PRESS,
    detail: {
      notification: {
        id: 'dosis|2026-09-25|20:00',
        data: { horarioIds: 'h3', fecha: '2026-09-25', hora: '20:00' },
      },
      pressAction: { id: 'tomada' },
    },
  } as any);
  const cola = JSON.parse(
    (await AsyncStorage.getItem('medi.cola-tomas.v1')) ?? '{}',
  );
  expect(cola.items.map((i: any) => i.horarioId)).toEqual(['h3']);
  expect(ids()).not.toContain('recordatorio|2026-09-25|20:00');
});

test('«Posponer» programa un aviso 10 minutos después', async () => {
  await manejarEventoAviso({
    type: EventType.ACTION_PRESS,
    detail: {
      notification: {
        id: 'dosis|2026-09-25|08:00',
        data: { horarioIds: 'h2', fecha: '2026-09-25', hora: '08:00' },
      },
      pressAction: { id: 'posponer' },
    },
  } as any);
  const pospuesto = programados.find(
    p => p.notification.id === 'pospuesto|2026-09-25|08:00',
  )!;
  expect(pospuesto.trigger.timestamp).toBe(
    new Date(2026, 8, 25, 7, 10).getTime(),
  );
  expect(pospuesto.notification.title).toBe('Carmen, recuerda: Metformina');
});

test('sin internet y con la sesión caducada: la toma va a la cola y NO se borran los avisos', async () => {
  await sincronizarAvisos();
  // Supabase no puede renovar el token sin red: "no hay sesión"
  mockGetSession.mockResolvedValue({ data: { session: null } });
  await manejarEventoAviso({
    type: EventType.ACTION_PRESS,
    detail: {
      notification: {
        id: 'dosis|2026-09-25|08:00',
        data: { horarioIds: 'h1,h2', fecha: '2026-09-25', hora: '08:00' },
      },
      pressAction: { id: 'tomada' },
    },
  } as any);
  expect(mockUpsert).not.toHaveBeenCalled();
  const cola = JSON.parse(
    (await AsyncStorage.getItem('medi.cola-tomas.v1')) ?? '{}',
  );
  expect(cola.items.map((i: any) => i.horarioId).sort()).toEqual(['h1', 'h2']);
  // El resto de avisos sigue programado
  expect(ids()).toContain('dosis|2026-09-25|20:00');
  expect(ids()).toContain('dosis|2026-09-30|08:00');
  expect(ids()).not.toContain('recordatorio|2026-09-25|08:00');
});

test('«Tomada» en un aviso antiguo no pisa lo que ya se marcó desde la app', async () => {
  await marcarRegistradasLocal('u1', [
    {
      horarioId: 'h1',
      fecha: '2026-09-25',
      estado: 'omitido',
      confirmadoEn: null,
    },
  ]);
  await manejarEventoAviso({
    type: EventType.ACTION_PRESS,
    detail: {
      notification: {
        id: 'dosis|2026-09-25|08:00',
        data: { horarioIds: 'h1,h2', fecha: '2026-09-25', hora: '08:00' },
      },
      pressAction: { id: 'tomada' },
    },
  } as any);
  const filas = (mockUpsert.mock.calls[0] as any[])[0];
  expect(filas.map((f: any) => f.horario_id)).toEqual(['h2']);
});

test('al llegar un aviso con la app cerrada se renuevan los avisos (como mucho 1 vez por hora)', async () => {
  const evento = {
    type: EventType.DELIVERED,
    detail: { notification: { id: 'dosis|2026-09-25|08:00' } },
  } as any;
  await manejarEventoAviso(evento);
  expect(deTomas().length).toBe(28);
  n.getTriggerNotifications.mockClear();
  await manejarEventoAviso(evento);
  expect(n.getTriggerNotifications).not.toHaveBeenCalled();
  jest.setSystemTime(new Date(2026, 8, 25, 8, 30));
  await manejarEventoAviso(evento);
  expect(n.getTriggerNotifications).toHaveBeenCalled();
});

test('al recargar datos del servidor no se pierden las marcas hechas mientras tanto', async () => {
  const inicioCarga = Date.now();
  jest.setSystemTime(new Date(2026, 8, 25, 7, 1));
  await marcarRegistradasLocal('u1', [
    {
      horarioId: 'h2',
      fecha: '2026-09-25',
      estado: 'tomado',
      confirmadoEn: null,
    },
  ]);
  // La respuesta del servidor (pedida antes de marcar) no trae esa toma
  await reemplazarRegistradas(
    'u1',
    [
      {
        horarioId: 'h1',
        fecha: '2026-09-25',
        estado: 'tomado',
        confirmadoEn: null,
      },
    ],
    inicioCarga,
  );
  const registradas = await leerRegistradas('u1');
  expect([...registradas].sort()).toEqual(['h1|2026-09-25', 'h2|2026-09-25']);
});

test('primera vez tras actualizar: el usuario se lee de la sesión guardada, sin red', async () => {
  await AsyncStorage.removeItem('medi.usuario.v1');
  mockGetSession.mockResolvedValue({ data: { session: null } });
  await AsyncStorage.setItem(
    claveSesionSupabase(),
    JSON.stringify({ user: { id: 'u1', email: 'a@x.com' } }),
  );
  await sincronizarAvisos();
  expect(deTomas()).toHaveLength(28);
});

test('tras cerrar sesión (sin usuario local) se cancelan todos los avisos', async () => {
  await sincronizarAvisos();
  await AsyncStorage.removeItem('medi.usuario.v1');
  mockGetSession.mockResolvedValue({ data: { session: null } });
  await sincronizarAvisos();
  expect(programados).toHaveLength(0);
});

test('una agenda guardada por una versión anterior (sin nombre ni colores) sigue avisando', async () => {
  await AsyncStorage.setItem(
    'medi.agenda.v1',
    JSON.stringify({
      usuarioId: 'u1',
      entradas: [
        {
          horarioId: 'h1',
          medicamentoId: 'm1',
          nombre: 'Enalapril',
          dosis: '10 mg',
          hora: '08:00',
          desde,
        },
      ],
    }),
  );
  await sincronizarAvisos();
  const aviso = programados.find(
    p => p.notification.id === 'dosis|2026-09-25|08:00',
  )!;
  expect(aviso.notification.title).toBe('Te toca Enalapril');
  expect(aviso.notification.android.largeIcon).toBeDefined();
});
