import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
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
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'] },
      },
      'boundaries/elements': [
        { type: 'entrypoints', pattern: 'src/entrypoints/**' },
        { type: 'app', pattern: 'src/app/**' },
        { type: 'features', pattern: 'src/features/**' },
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'platform-extension', pattern: 'src/platform/extension/**' },
        { type: 'platform-browser', pattern: 'src/platform/browser/**' },
        { type: 'integration-echo', pattern: 'src/integrations/echo/**' },
        { type: 'player-core', pattern: 'src/player/core/**' },
        { type: 'player-react', pattern: 'src/player/react/**' },
        { type: 'shared', pattern: 'src/shared/**' },
      ],
      'boundaries/files': [
        { category: 'source', pattern: 'src/player/index.ts' },
        { category: 'source', pattern: 'src/vite-env.d.ts' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'entrypoints',
                        'app',
                        'features',
                        'platform-extension',
                        'platform-browser',
                        'integration-echo',
                        'player-core',
                        'player-react',
                        'shared',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'features' } },
              disallow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'entrypoints',
                        'app',
                        'platform-extension',
                        'platform-browser',
                        'integration-echo',
                        'player-core',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'player-core' } },
              disallow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'entrypoints',
                        'app',
                        'features',
                        'platform-extension',
                        'platform-browser',
                        'integration-echo',
                        'player-react',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'player-core' } },
              disallow: {
                to: {
                  module: { origin: 'external', source: ['react', 'react-dom', '@tanstack/react-query'] },
                },
              },
            },
            {
              from: { element: { type: 'player-react' } },
              disallow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'entrypoints',
                        'app',
                        'features',
                        'platform-extension',
                        'platform-browser',
                        'integration-echo',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'shared' } },
              disallow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'entrypoints',
                        'app',
                        'features',
                        'domain',
                        'platform-extension',
                        'platform-browser',
                        'integration-echo',
                        'player-core',
                        'player-react',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'platform-extension' } },
              disallow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['entrypoints', 'app', 'features', 'integration-echo', 'player-core', 'player-react'],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'platform-browser' } },
              disallow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['entrypoints', 'app', 'features', 'integration-echo', 'player-core', 'player-react'],
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/entrypoints/lightning-runtime.content.ts'],
    rules: {
      'boundaries/no-unknown-dependencies': ['error', { require: 'element' }],
      'boundaries/no-unknown-files': 'error',
    },
  },
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
