const path = require("node:path");

// Expo SDK 57 fija react 19.2.3; la web y la landing usan 19.2.4, que npm deja en la raíz del
// monorepo. Paquetes como react-native o @testing-library/react-native viven en la raíz y
// resolverían esa otra copia: forzamos que todo el árbol de pruebas use la React de esta app.
const react = path.dirname(require.resolve("react/package.json"));

/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^react$": react,
    "^react/(.*)$": `${react}/$1`,
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist-check/"],
  // En frío (sin caché de Babel) el primer render de una pantalla tarda varios segundos.
  testTimeout: 15000,
};
