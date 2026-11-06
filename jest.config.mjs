import nextJest from "next/jest.js";

// Plan de Pruebas (Informe Final, cap. V): pruebas unitarias con Jest sobre la
// lógica de negocio de src/lib (motor de SLA, máquina de estados, hashing).
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  collectCoverageFrom: ["src/lib/**/*.ts", "!src/lib/demoData.ts"],
};

export default createJestConfig(config);
