/**
 * Lint config for the Voka AI n8n community node.
 * Uses eslint-plugin-n8n-nodes-base which encodes n8n's verification rules
 * (param naming, type literals, action vs trigger conventions, etc.).
 *
 * `community` ruleset is the right baseline for community-published packages.
 * `nodes-package` enforces the package.json-level rules (n8n field shape,
 * keywords, etc.). The prepublish lint runs `.eslintrc.prepublish.js` which
 * tightens a few warnings into errors before npm publish.
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    project: './tsconfig.json',
    extraFileExtensions: ['.json'],
  },
  ignorePatterns: ['.eslintrc.js', '**/*.js', '**/node_modules/**', '**/dist/**'],
  overrides: [
    {
      files: ['package.json'],
      plugins: ['eslint-plugin-n8n-nodes-base'],
      extends: ['plugin:n8n-nodes-base/community'],
      rules: {
        'n8n-nodes-base/community-package-json-name-still-default': 'off',
      },
    },
    {
      files: ['./credentials/**/*.ts'],
      plugins: ['eslint-plugin-n8n-nodes-base'],
      extends: ['plugin:n8n-nodes-base/credentials'],
      rules: {
        // The rule's own docs say: "Only applicable to nodes in the main
        // repository." Its autofixer camelCases the URL VALUE, which
        // corrupts external URLs. We are a community package, so disable.
        'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
      },
    },
    {
      files: ['./nodes/**/*.ts'],
      plugins: ['eslint-plugin-n8n-nodes-base'],
      extends: ['plugin:n8n-nodes-base/nodes'],
    },
  ],
};
