import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactYouMightNotNeedAnEffect from 'eslint-plugin-react-you-might-not-need-an-effect';
import tseslint from 'typescript-eslint';

const reactFiles = ['src/**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'];
const customHookFiles = ['src/**/use*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'];

export default defineConfig([
  globalIgnores([
    '.output/**',
    '.wxt/**',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
    '.discovery/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: reactFiles,
    ...react.configs.flat.recommended,
    settings: { react: { version: '19.2' } },
  },
  { files: reactFiles, ...react.configs.flat['jsx-runtime'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Only integrations/echo/transport may call fetch.' },
      ],
    },
  },
  {
    files: ['src/integrations/echo/transport/**/*.{ts,tsx}'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/integrations/echo/**'], message: 'Features consume domain-facing ports.' }] },
      ],
    },
  },
  {
    files: ['src/player/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Player core is framework-independent.' },
            { name: 'react-dom', message: 'Player core is framework-independent.' },
            { name: '@tanstack/react-query', message: 'Player core is framework-independent.' },
          ],
        },
      ],
    },
  },
  {
    files: reactFiles,
    ...reactHooks.configs.flat.recommended,
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // ThemeProvider intentionally mutates a caller-provided DOM root.
      'react-hooks/immutability': 'off',
    },
  },
  { ...reactYouMightNotNeedAnEffect.configs.strict, files: reactFiles, ignores: customHookFiles },
  {
    files: reactFiles,
    ignores: customHookFiles,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportSpecifier[imported.name='useEffect']",
          message: 'useEffect is only allowed in custom hooks.',
        },
        {
          selector: "CallExpression[callee.name='useEffect']",
          message: 'useEffect is only allowed in custom hooks.',
        },
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='useEffect']",
          message: 'useEffect is only allowed in custom hooks.',
        },
      ],
    },
  },
  prettier,
]);
