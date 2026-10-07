// next/jest no carga .env.local en modo test; estos tests lo necesitan.
// No se usa process.loadEnvFile: dentro del sandbox de Jest escribe en el
// process.env real y no en la copia que ven los tests.
const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");

const variables = parseEnv(fs.readFileSync(path.join(__dirname, "../../.env.local"), "utf8"));
for (const [clave, valor] of Object.entries(variables)) {
  if (process.env[clave] === undefined) process.env[clave] = valor;
}
