const path = require("path");
const nextJest = require("next/jest.js");

const createJestConfig = (nextJest.default || nextJest)({ dir: "./" });

// @react-pdf/* publica solo ESM (y @react-pdf/hyphenate solo expone la condición "import"),
// pero jest corre en CJS. Los subpaths de hyphenate se mapean al archivo directo.
const hyphenate = path
  .join(path.dirname(require.resolve("@react-pdf/renderer/package.json")), "..", "hyphenate", "lib")
  .split(path.sep)
  .join("/");

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // jest.mock("@/...") no pasa por la reescritura de alias de SWC; se mapea aquí.
    "^@/(.*)$": "<rootDir>/$1",
    "^@react-pdf/hyphenate/(.*)$": `${hyphenate}/$1.js`,
  },
  // BD y e2e tienen su propio runner.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/supabase/", "<rootDir>/e2e/"],
};

// next/jest ignora node_modules salvo `transpilePackages` (que acá no debe cambiar: afectaría al build).
// Se sustituye ese patrón por uno que también transforma los paquetes que solo publican ESM
// y que @react-pdf/renderer arrastra.
const TRANSFORMAR = "@pyxis/ovalle-core|@react-pdf/[^/]+|color-string|color-name|yoga-layout";

module.exports = async () => {
  const resuelta = await createJestConfig(config)();
  return {
    ...resuelta,
    transformIgnorePatterns: resuelta.transformIgnorePatterns.map((p) =>
      p.startsWith("/node_modules/") ? `/node_modules/(?!.pnpm)(?!(${TRANSFORMAR})/)` : p,
    ),
  };
};
