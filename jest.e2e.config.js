/**
 * Pruebas de flujo (login) sin emulador: montan la app real en Jest y hablan
 * contra la API local configurada en la app (ENVIRONMENTS.LOCAL).
 *
 * Se separan del `jest.config.js` normal para no mezclar las unitarias con
 * estas pruebas de flujo.
 */
module.exports = {
  preset: 'react-native',
  rootDir: __dirname,
  testMatch: ['<rootDir>/e2e/**/*.e2e.tsx'],
  setupFilesAfterEnv: ['<rootDir>/e2e/setup.tsx'],
  // pnpm anida node_modules dentro de .pnpm: el patrón clásico ignora el
  // segundo "node_modules" y deja paquetes ESM (react-redux, etc.) sin
  // transformar. Todo lo que viva bajo /.pnpm/ se transforma; el resto usa la
  // lista blanca habitual de React Native.
  transformIgnorePatterns: [
    '^(?!.*/\\.pnpm/).*node_modules/(?!(jest-)?react-native|@react-native(-community)?)',
  ],
  testTimeout: 20000,
  watchman: false,
  maxWorkers: 1,
};
