module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Reanimated 4: resuelve sus módulos de prueba (sin hilo de interfaz nativo)
  resolver: 'react-native-reanimated/jest/resolver',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-notify-kit|@react-native-async-storage|react-native-reanimated|react-native-worklets)/)',
  ],
};
