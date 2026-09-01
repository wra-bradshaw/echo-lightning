import { describe, expect, it } from 'vitest';
import { createReplacementPolicy, ruleIdsForTab } from './replacement-policy';

function dnr() {
  const calls: unknown[] = [];
  return {
    calls,
    api: {
      async updateSessionRules(options: unknown) {
        calls.push(options);
      },
    },
  };
}

describe('replacement policy', () => {
  it('calculates no blocking rules for unsupported routes', () => {
    const { api } = dnr();
    const policy = createReplacementPolicy(api, (url) => url.endsWith('/courses'));

    expect(policy.calculate(7, 'https://echo360.net.au/unknown')).toEqual([]);
    expect(policy.calculate(7, 'https://echo360.net.au/courses')).toHaveLength(1);
  });

  it('removes old rules before installing the route-scoped rule', async () => {
    const { api, calls } = dnr();
    const policy = createReplacementPolicy(api, () => true);

    await policy.sync(9, 'https://echo360.net.au/courses');

    expect(calls).toEqual([
      {
        removeRuleIds: ruleIdsForTab(9),
        addRules: expect.arrayContaining([
          expect.objectContaining({ id: 9, condition: expect.objectContaining({ tabIds: [9] }) }),
        ]),
      },
    ]);
  });

  it('fails open by removing rules when a route becomes unsupported', async () => {
    const { api, calls } = dnr();
    const policy = createReplacementPolicy(api, () => false);

    await policy.sync(11, 'https://echo360.net.au/login');

    expect(calls).toEqual([{ removeRuleIds: ruleIdsForTab(11) }]);
  });
});
