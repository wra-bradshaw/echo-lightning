# WXT + React

This template should help get you started developing with React in WXT.

## End-to-end tests

Install Playwright's Chromium browser once, then run the tests:

```sh
pnpm exec playwright install chromium
pnpm run test:e2e
```

The E2E command builds the extension and loads `.output/chrome-mv3` in a
persistent Chromium context. Use `pnpm run test:e2e:headed` to watch the tests
run in a headed browser.
