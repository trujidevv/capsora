module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
      },
    ],
    // Reanimated 4 (animaciones). Tiene que ser el último plugin.
    'react-native-worklets/plugin',
  ],
};
