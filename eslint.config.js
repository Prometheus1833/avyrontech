import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", {
        allowConstantExport: true,
        allowExportNames: [
          "mount",
          "PRERENDER_ROUTES",
          "STATUS_PAGES",
          "mockups",
          "badgeVariants",
          "buttonVariants",
          "useFormField",
          "navigationMenuTriggerStyle",
          "useSidebar",
          "toast",
          "toggleVariants",
          "useAuth",
          "useLang",
        ],
      }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["supabase/functions/**/*.{ts,tsx}"],
    rules: {
      // Edge-function templates are rendered server-side and never participate in Vite HMR.
      "react-refresh/only-export-components": "off",
    },
  },
);
