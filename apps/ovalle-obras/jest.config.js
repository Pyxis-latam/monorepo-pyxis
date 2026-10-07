const nextJest = require("next/jest.js");

const createJestConfig = (nextJest.default || nextJest)({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // BD y e2e tienen su propio runner.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/supabase/", "<rootDir>/e2e/"],
};

module.exports = createJestConfig(config);
