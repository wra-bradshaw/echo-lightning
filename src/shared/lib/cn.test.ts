import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('combines conditional classes and resolves Tailwind conflicts', () => {
    expect(cn('p-2', { 'text-sm': true, hidden: false }, ['p-4'])).toBe('text-sm p-4');
  });
});
