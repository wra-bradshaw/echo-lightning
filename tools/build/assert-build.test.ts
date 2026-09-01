import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertBuildArtifacts } from './assert-build';

async function fixture(runtime = 'runtime') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lightning-build-'));
  await writeFile(
    path.join(root, 'manifest.json'),
    JSON.stringify({
      permissions: ['scripting', 'storage'],
      content_scripts: [{ js: ['content-scripts/content-bootstrap.js'] }],
    }),
  );
  await import('node:fs/promises').then(({ mkdir }) => mkdir(path.join(root, 'content-scripts')));
  await writeFile(path.join(root, 'content-scripts/content-bootstrap.js'), 'bootstrap');
  await writeFile(path.join(root, 'content-scripts/lightning-runtime.js'), runtime);
  return root;
}

describe('build artifact assertions', () => {
  it('accepts separated bootstrap and runtime output', async () => {
    const root = await fixture();
    try {
      await expect(assertBuildArtifacts(root)).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects application dependencies in the bootstrap', async () => {
    const root = await fixture();
    await writeFile(path.join(root, 'content-scripts/content-bootstrap.js'), 'React');
    try {
      await expect(assertBuildArtifacts(root)).rejects.toThrow(/application-only/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
