import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export type DebugAppOptions = {
  fresh: boolean;
  stock: boolean;
  trace: boolean;
  help?: boolean;
};

const SESSION_PATTERN = /\b(tw-[a-z0-9]+)\b/i;
const SESSION_WAIT_TIMEOUT = 120_000;
const SHUTDOWN_TIMEOUT = 5_000;
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

if (existsSync(path.join(repositoryRoot, '.env'))) process.loadEnvFile(path.join(repositoryRoot, '.env'));

export function configuredAuthStatePath(value = process.env.PLAYWRIGHT_AUTH_STATE): string {
  return path.resolve(repositoryRoot, value?.trim() || '.playwright/auth/echo360.json');
}

function pnpmCommand(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

export function parseDebugAppArgs(args: string[]): DebugAppOptions {
  const options: DebugAppOptions = { fresh: false, stock: false, trace: false };
  let normalizedArgs = args;
  while (normalizedArgs[0] === '--') normalizedArgs = normalizedArgs.slice(1);
  for (const arg of normalizedArgs) {
    if (arg === '--fresh') options.fresh = true;
    else if (arg === '--stock') options.stock = true;
    else if (arg === '--trace') options.trace = true;
    else if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

export function extractSessionName(output: string): string | undefined {
  return output.match(SESSION_PATTERN)?.[1];
}

function printHelp(): void {
  console.log('Usage: pnpm debug:app [--fresh] [--stock] [--trace]');
  console.log('  --fresh  remove the resolved cached authentication state before startup');
  console.log('  --stock  leave Echo360 in stock mode instead of installing Lightning rules');
  console.log('  --trace  enable Playwright tracing for this debug run');
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function writeOutput(data: Buffer | string, target: NodeJS.WriteStream): string {
  const text = data.toString();
  target.write(text);
  return text;
}

function spawnCommand(args: string[], options: { stdio?: 'inherit' | 'pipe'; detached?: boolean } = {}): ChildProcess {
  return spawn(pnpmCommand(), args, {
    cwd: repositoryRoot,
    env: { ...process.env, PLAYWRIGHT_HTML_OPEN: 'never' },
    detached: options.detached ?? false,
    stdio: options.stdio ?? 'inherit',
  });
}

async function runCommand(args: string[]): Promise<void> {
  const child = spawnCommand(args);
  const [code, signal] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null];
  if (code !== 0) throw new Error(`Command failed (${(signal || code) ?? 'unknown'}).`);
}

function terminateProcessGroup(pid: number, signal: NodeJS.Signals): void {
  if (pid <= 1 || pid === process.pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      return;
    }
  }
}

async function stopChild(child: ChildProcess): Promise<void> {
  const pid = child.pid;
  if (!pid) return;
  child.kill('SIGTERM');
  terminateProcessGroup(pid, 'SIGTERM');
  const deadline = Date.now() + SHUTDOWN_TIMEOUT;
  while (Date.now() < deadline && isAlive(pid)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (isAlive(pid)) {
    child.kill('SIGKILL');
    terminateProcessGroup(pid, 'SIGKILL');
  }
}

async function closeCliSession(session: string): Promise<void> {
  try {
    await runCommand(['exec', 'playwright', 'cli', `-s=${session}`, 'close']);
  } catch {
    return;
  }
}

async function waitForSession(child: ChildProcess): Promise<string> {
  const output: string[] = [];
  const stdout = child.stdout;
  const stderr = child.stderr;
  const onStdout = (data: Buffer | string) => {
    const text = writeOutput(data, process.stdout);
    output.push(text);
  };
  const onStderr = (data: Buffer | string) => writeOutput(data, process.stderr);
  stdout?.on('data', onStdout);
  stderr?.on('data', onStderr);
  const startedAt = Date.now();
  while (Date.now() - startedAt < SESSION_WAIT_TIMEOUT) {
    const session = extractSessionName(output.join(''));
    if (session) return session;
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error('Playwright exited before opening a debug session.');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for Playwright to open a debug session.');
}

async function attachAndResume(session: string, pauseCount: number): Promise<void> {
  await runCommand(['exec', 'playwright', 'cli', 'attach', session]);
  for (let index = 0; index < pauseCount; index += 1) {
    await runCommand(['exec', 'playwright', 'cli', `-s=${session}`, 'resume']);
  }
}

async function run(options: DebugAppOptions): Promise<number> {
  if (options.fresh) await rm(configuredAuthStatePath(), { force: true });
  await runCommand(['run', 'build']);

  const env = {
    ...process.env,
    ECHO360_DEBUG_MODE: options.stock ? 'stock' : 'lightning',
    ECHO360_DEBUG_TRACE: options.trace ? '1' : '0',
    HEADED: '1',
    PLAYWRIGHT_HTML_OPEN: 'never',
  };
  const child = spawn(
    pnpmCommand(),
    [
      'exec',
      'playwright',
      'test',
      '--config=playwright.debug.config.ts',
      '--project=debug',
      'tests/e2e/debug.seed.spec.ts',
      '--debug=cli',
      ...(options.trace ? ['--trace=on'] : []),
    ],
    {
      cwd: repositoryRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  if (!child.pid) throw new Error('Unable to start Playwright.');

  let session: string | undefined;
  let shuttingDown = false;
  const cleanup = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (session) await closeCliSession(session);
    await stopChild(child);
  };
  const onSignal = (): void => {
    void cleanup().finally(() => process.exit(130));
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    session = await waitForSession(child);
    await attachAndResume(session, options.stock ? 2 : 4);
    const [code, signal] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null];
    await closeCliSession(session);
    return code === 0 || signal === 'SIGTERM' || signal === 'SIGINT' ? 0 : signal ? 1 : (code ?? 1);
  } catch (error) {
    await cleanup();
    throw error;
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  try {
    const options = parseDebugAppArgs(args);
    if (options.help) {
      printHelp();
      return;
    }
    const exitCode = await run(options);
    process.exitCode = exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Unable to start the authenticated debug session.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) void main();
