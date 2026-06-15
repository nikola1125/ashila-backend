const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/**', 'seeds/**', 'scripts/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        module: 'writable',
        require: 'readonly',
        setTimeout: 'readonly',
        setImmediate: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }]
    }
  }
];
