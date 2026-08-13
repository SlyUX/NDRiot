import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The pdf.js worker copied into public/ by scripts/copy-pdf-worker.mjs —
    // a 1MB minified vendor file, not ours to lint.
    "public/pdf.worker.min.mjs",
  ]),
]);

export default eslintConfig;
