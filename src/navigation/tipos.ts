import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Medicamento } from '../logic/tipos';

export type AuthStackParamList = {
  /** email: el de la cuenta recién creada, para no volver a escribirlo */
  Login: { email?: string } | undefined;
  Registro: undefined;
  Recuperar: { email?: string } | undefined;
};

export type TabsParamList = {
  Hoy: undefined;
  Medicamentos: undefined;
  Historial: undefined;
  Familia: undefined;
  Ajustes: undefined;
};

export type AppStackParamList = {
  Bienvenida: undefined;
  Principal: NavigatorScreenParams<TabsParamList> | undefined;
  FormularioMedicamento: { medicamento?: Medicamento } | undefined;
  Fiabilidad: { desdeBienvenida?: boolean } | undefined;
  Paciente: { pacienteId: string; nombre: string };
};

export type PantallaAuth<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;
export type PantallaApp<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;
export type PantallaTab<T extends keyof TabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;
