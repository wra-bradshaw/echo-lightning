import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const runtimePath = 'content-scripts/lightning-runtime.js';
const MAX_BOOTSTRAP_BYTES = 15 * 1024;
const FORBIDDEN_BOOTSTRAP_DEPENDENCIES = /(?:react(?:-dom)?|tanstack|hls(?:\.js)?|lucide|(?:app\/)?styles\.css)/i;

export async function assertBuildArtifacts(outputRoot: string): Promise<void> {
  const manifest = JSON.parse(await readFile(path.join(outputRoot, 'manifest.json'), 'utf8')) as {
    permissions?: string[];
    content_scripts?: Array<{ js?: string[] }>;
  };
  if (!manifest.permissions?.includes('scripting') || !manifest.permissions.includes('storage')) {
    throw new Error('The Chromium manifest must grant scripting and storage permissions.');
  }
  const contentScripts = manifest.content_scripts ?? [];
  const bootstrap = contentScripts
    .flatMap((entry) => entry.js ?? [])
    .find((file) => file.includes('content-bootstrap'));
  if (!bootstrap) throw new Error('The manifest must register content-bootstrap.js.');
  const bootstrapFile = path.join(outputRoot, bootstrap);
  const runtimeFile = path.join(outputRoot, runtimePath);
  const bootstrapStats = await stat(bootstrapFile);
  if (bootstrapStats.size >= MAX_BOOTSTRAP_BYTES)
    throw new Error(`The manifest bootstrap is ${bootstrapStats.size} bytes; it must stay below 15 KB.`);
  const bootstrapText = await readFile(bootstrapFile, 'utf8');
  if (FORBIDDEN_BOOTSTRAP_DEPENDENCIES.test(bootstrapText)) {
    throw new Error('The manifest bootstrap contains application-only dependencies.');
  }
  await stat(runtimeFile);
  const runtimeText = await readFile(runtimeFile, 'utf8');
  if (/hls(?:\.js)?/i.test(`${bootstrapText}\n${runtimeText}`)) {
    throw new Error('HLS.js must not enter the shell bundles before a player entry consumes it.');
  }
  await stat(path.join(outputRoot, 'player-runtime.js'));
  const files = await readdir(outputRoot, { recursive: true });
  if (!files.some((file) => file.endsWith('content-bootstrap.js'))) throw new Error('Bootstrap output is missing.');
  if (!files.some((file) => file.endsWith('lightning-runtime.js'))) throw new Error('Runtime output is missing.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  await assertBuildArtifacts(path.resolve('.output/chrome-mv3'));
}
