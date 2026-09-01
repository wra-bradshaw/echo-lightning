---
name: debug-authenticated-app
description: use when you want to use echo360 logged in to debug or inspect the echo360 application to find out how it works or trace its api calls.
---

## Start an authenticated debug session

Use the foreground debug runner. It builds the extension, authenticates through the existing fixture and cached storage state, and pauses on a stable page:

```bash
pnpm debug:app

Use `pnpm debug:app -- --stock` for the original Echo interface, `pnpm debug:app -- --trace` to enable tracing, or `pnpm debug:app -- --fresh` to remove only the resolved cached auth-state file before startup. Set `ECHO360_DEBUG_URL` to a path on the configured Echo360 origin when a particular course, section, or lesson should be ready at the pause.

Leave that command running in the first terminal. Copy the printed `tw-*` session name and use it directly in a second terminal:

```bash
pnpm exec playwright cli -s=tw-... snapshot
pnpm exec playwright cli -s=tw-... console
pnpm exec playwright cli -s=tw-... requests
```

