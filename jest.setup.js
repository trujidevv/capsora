/* eslint-env jest */
// Los tests de fechas se ejecutan con la zona horaria de España (incluye cambios de hora).
process.env.TZ = 'Europe/Madrid';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);
jest.mock('react-native-notify-kit', () =>
  require('react-native-notify-kit/jest-mock'),
);
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));

// Firebase (avisos al cuidador): en los tests no hay móvil ni servidor
jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(() => Promise.resolve('token-de-prueba')),
  deleteToken: jest.fn(() => Promise.resolve()),
  onMessage: jest.fn(() => () => undefined),
  onTokenRefresh: jest.fn(() => () => undefined),
  setBackgroundMessageHandler: jest.fn(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ type: 'cancelled', data: null })),
    signOut: jest.fn(() => Promise.resolve(null)),
  },
  isErrorWithCode: jest.fn(() => false),
  statusCodes: { SIGN_IN_CANCELLED: '12501', IN_PROGRESS: 'IN_PROGRESS' },
}));
jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: jest.fn(() => ({})),
  setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
  recordError: jest.fn(),
}));

// Animaciones (Reanimated 4): en los tests no hay hilo de interfaz nativo
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock'),
);
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
