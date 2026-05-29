/**
 * Vitest global setup file.
 *
 * 1. Imports @testing-library/jest-dom to extend Vitest's expect with DOM matchers
 *    at runtime: toBeInTheDocument, toBeDisabled, toHaveTextContent, etc.
 *
 * 2. The `@testing-library/jest-dom/vitest` import augments the vitest module
 *    declaration so TypeScript knows about the extra matchers at compile time
 *    (picked up because tests/setup.ts is in tsconfig.test.json's `include`).
 *
 * This file is loaded via vitest.config.ts → test.setupFiles.
 * It runs before every test file in whatever environment that file uses.
 * In node-environment files the jest-dom matchers are present but unused — harmless.
 */
import "@testing-library/jest-dom";
import "@testing-library/jest-dom/vitest";
