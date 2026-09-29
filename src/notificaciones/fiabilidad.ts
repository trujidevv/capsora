import notifee, {
  AndroidNotificationSetting,
  AuthorizationStatus,
  TriggerType,
  AlarmType,
} from 'react-native-notify-kit';
import { Platform } from 'react-native';
import { CANAL_TOMAS, asegurarCanal } from './canal';

/**
 * Comprobaciones para que los avisos suenen siempre. Es el punto más delicado
 * del producto: Xiaomi y Samsung (la mayoría de móviles en España) cierran las
 * apps en segundo plano de forma agresiva.
 */

export interface EstadoFiabilidad {
  permisoNotificaciones: boolean;
  /** null si no aplica (Android < 12) */
  alarmasExactas: boolean | null;
  /** null si no se pudo saber */
  bateriaOptimizada: boolean | null;
  fabricante: string;
  /** Si el fabricante tiene una pantalla propia de ahorro de energía */
  tieneAjustesFabricante: boolean;
}

export const ESTADO_DESCONOCIDO: EstadoFiabilidad = {
  permisoNotificaciones: true,
  alarmasExactas: null,
  bateriaOptimizada: null,
  fabricante: '',
  tieneAjustesFabricante: false,
};

export async function comprobarFiabilidad(): Promise<EstadoFiabilidad> {
  if (Platform.OS !== 'android') return ESTADO_DESCONOCIDO;
  const [ajustes, bateria, energia] = await Promise.all([
    notifee.getNotificationSettings(),
    notifee.isBatteryOptimizationEnabled().catch(() => null),
    notifee.getPowerManagerInfo().catch(() => null),
  ]);
  const alarma = ajustes.android.alarm;
  return {
    permisoNotificaciones:
      ajustes.authorizationStatus === AuthorizationStatus.AUTHORIZED,
    alarmasExactas:
      alarma === AndroidNotificationSetting.NOT_SUPPORTED
        ? null
        : alarma === AndroidNotificationSetting.ENABLED,
    bateriaOptimizada: bateria,
    fabricante: (energia?.manufacturer ?? '').toLowerCase(),
    tieneAjustesFabricante: Boolean(energia?.activity),
  };
}

/** Lo imprescindible para que los avisos lleguen (la batería depende del fabricante). */
export function avisosFuncionan(e: EstadoFiabilidad): boolean {
  return e.permisoNotificaciones && e.alarmasExactas !== false;
}

export function todoCorrecto(e: EstadoFiabilidad): boolean {
  return avisosFuncionan(e) && e.bateriaOptimizada !== true;
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  const ajustes = await notifee.requestPermission();
  if (ajustes.authorizationStatus === AuthorizationStatus.AUTHORIZED)
    return true;
  // Si ya se denegó antes, Android no vuelve a preguntar: hay que ir a Ajustes.
  await notifee.openNotificationSettings();
  return false;
}

export const abrirAjustesAlarmas = () => notifee.openAlarmPermissionSettings();
export const abrirAjustesBateria = () =>
  notifee.openBatteryOptimizationSettings();
export const abrirAjustesFabricante = () => notifee.openPowerManagerSettings();
export const abrirAjustesNotificaciones = () =>
  notifee.openNotificationSettings(CANAL_TOMAS);

export type Marca = 'xiaomi' | 'samsung' | 'huawei' | 'oppo' | 'vivo' | 'otro';

export function marcaDe(fabricante: string): Marca {
  const f = fabricante.toLowerCase();
  if (/xiaomi|redmi|poco/.test(f)) return 'xiaomi';
  if (/samsung/.test(f)) return 'samsung';
  if (/huawei|honor/.test(f)) return 'huawei';
  if (/oppo|realme|oneplus/.test(f)) return 'oppo';
  if (/vivo|iqoo/.test(f)) return 'vivo';
  return 'otro';
}

export const NOMBRE_MARCA: Record<Marca, string> = {
  xiaomi: 'Xiaomi / Redmi / POCO',
  samsung: 'Samsung',
  huawei: 'Huawei / Honor',
  oppo: 'OPPO / realme / OnePlus',
  vivo: 'vivo',
  otro: 'tu móvil',
};

/** Pasos concretos por marca (los nombres de menú son los de los móviles en español). */
export function instruccionesMarca(marca: Marca): string[] {
  switch (marca) {
    case 'xiaomi':
      return [
        'En «Ahorro de batería» elige «Sin restricciones».',
        'Activa «Inicio automático».',
        'En la pantalla de apps recientes, mantén pulsada esta app y toca el candado para que no se cierre.',
      ];
    case 'samsung':
      return [
        'En «Batería» elige «Sin restricciones».',
        'Ve a Ajustes › Batería › Límites de uso en segundo plano y comprueba que esta app NO está en «Aplicaciones en suspensión» ni en «Suspensión profunda».',
      ];
    case 'huawei':
      return [
        'Ve a Ajustes › Batería › Inicio de aplicaciones.',
        'Desactiva «Gestionar automáticamente» para esta app y activa las tres opciones.',
      ];
    case 'oppo':
      return [
        'En «Uso de la batería» permite la actividad en segundo plano.',
        'Activa «Inicio automático» si aparece.',
      ];
    case 'vivo':
      return [
        'En «Batería» permite el consumo alto en segundo plano.',
        'Activa «Inicio automático».',
      ];
    default:
      return [
        'En los ajustes de batería de la app, elige «Sin restricciones» o «No optimizar».',
      ];
  }
}

/** Manda un aviso de prueba dentro de X segundos (con la app cerrada y el móvil bloqueado). */
export async function enviarAvisoPrueba(segundos = 60): Promise<void> {
  await asegurarCanal();
  const ajustes = await notifee.getNotificationSettings();
  const exacta = ajustes.android.alarm !== AndroidNotificationSetting.DISABLED;
  await notifee.createTriggerNotification(
    {
      id: `prueba|${Date.now()}`,
      title: '¡Aviso de prueba recibido!',
      body: 'Si ves esto con el móvil bloqueado, tus recordatorios funcionan bien.',
      android: {
        channelId: CANAL_TOMAS,
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: Date.now() + segundos * 1000,
      alarmManager: {
        type: exacta
          ? AlarmType.SET_ALARM_CLOCK
          : AlarmType.SET_AND_ALLOW_WHILE_IDLE,
      },
    },
  );
}
