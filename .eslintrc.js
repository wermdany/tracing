module.exports = {
  parser: "@typescript-eslint/parser",
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  parserOptions: {
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "prettier"],
  env: {
    browser: true,
    node: true
  },
  rules: {
    "prettier/prettier": "warn",
    "no-redeclare": "off",
    "arrow-body-style": "off",
    "prefer-arrow-callback": "off",
    "@typescript-eslint/no-redeclare": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", varsIgnorePattern: "^_" }
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", disallowTypeAnnotations: false }
    ]
  },
  overrides: [
    {
      files: ["**/__tests__/*.{j,t}s?(x)", "**/tests/unit/**/*.spec.{j,t}s?(x)"],
      rules: {},
      env: {
        jest: true
      }
    }
  ]
};
