import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

async function lint(source: string, filePath: string) {
  return eslint.lintText(source, { filePath });
}

describe('lint restrictions', () => {
  it('rejects useEffect in components', async () => {
    const [result] = await lint(
      "import { useEffect } from 'react'; export function Component() { useEffect(() => undefined, []); return null; }",
      'src/example.tsx',
    );

    expect(result?.messages.some((message) => message.ruleId === 'no-restricted-syntax')).toBe(true);
  });

  it('rejects unnecessary effects in components', async () => {
    const [result] = await lint(
      "import { useEffect, useState } from 'react'; export function Component({ value }: { value: string }) { const [derived, setDerived] = useState(''); useEffect(() => { setDerived(value); }, [value]); return derived; }",
      'src/example.tsx',
    );

    expect(
      result?.messages.some((message) => message.ruleId === 'react-you-might-not-need-an-effect/no-derived-state'),
    ).toBe(true);
  });

  it('allows effects in custom hooks', async () => {
    const [result] = await lint(
      "import { useEffect, useState } from 'react'; export function useExample(value: string) { const [derived, setDerived] = useState(''); useEffect(() => { setDerived(value); }, [value]); return derived; }",
      'src/use-example.ts',
    );

    expect(result?.messages.some((message) => message.ruleId?.startsWith('react-you-might-not-need-an-effect/'))).toBe(
      false,
    );
  });
});
