const nextJest = require("next/jest.js");

const createJestConfig = (nextJest.default || nextJest)({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/supabase/tests/env.js"],
  testMatch: ["<rootDir>/supabase/tests/**/*.test.ts"],
  testTimeout: 30000,
};

module.exports = createJestConfig(config);
