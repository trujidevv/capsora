module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // La interfaz saca colores y tipografía del tema activo (claro u oscuro)
      files: [
        'App.tsx',
        'src/screens/**',
        'src/components/**',
        'src/navigation/**',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '../theme/theme',
                importNames: ['colors', 'coloresClaros', 'coloresOscuros'],
                message:
                  'Usa useTema() o crearEstilos() de src/lib/TemaContext para que funcione el modo oscuro.',
              },
            ],
          },
        ],
      },
    },
  ],
};
