module.exports = {
  preset: 'react-native',
  // pnpm guarda los paquetes bajo node_modules/.pnpm: hay que transformar también esa ruta
  // para que Jest pueda leer el código TypeScript de React Native.
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/|(jest-)?react-native/|@react-native(-community)?/)',
  ],
};
