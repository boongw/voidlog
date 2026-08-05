// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Shared base ESLint config for non-Next.js workspace packages
 * (apps/worker, packages/db, packages/shared). apps/web has its
 * own config layered on top of this via next/core-web-vitals.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/generated/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
