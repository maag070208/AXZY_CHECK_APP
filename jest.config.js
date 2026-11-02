module.exports = {
  preset: 'react-native',
  // Con pnpm cada paquete vive en node_modules/.pnpm/<id>/node_modules/<paquete> y muchos publican
  // ESM o TypeScript: se transforma todo en vez de mantener una lista de excepciones.
  transformIgnorePatterns: [],
};
