const verifiedUiBundlePatterns = [
  '/static/js/main.',
  '/static/js/header.',
  '/static/js/courses.',
  '/static/js/section.',
  '/static/js/classroom.',
  '/static/js/echoplayer.',
] as const;

type SessionRule = {
  id: number;
  priority: number;
  action: { type: 'block' };
  condition: {
    regexFilter: string;
    resourceTypes: Array<'script'>;
    tabIds: number[];
  };
};

export type DnrApi = {
  updateSessionRules: (options: { addRules?: SessionRule[]; removeRuleIds?: number[] }) => Promise<void>;
};

export interface ReplacementPolicy {
  calculate(tabId: number, url: string): SessionRule[];
  sync(tabId: number, url: string): Promise<void>;
  remove(tabId: number): Promise<void>;
}

const MAX_RULE_ID = 2_147_483_647;
const bundleNames = verifiedUiBundlePatterns.map((pattern) => pattern.slice('/static/js/'.length).replace('.', '\\.'));
const verifiedUiBundleRegex = `^https://echo360\\.net\\.au/static/js/(?:${bundleNames.join('|')})`;

export function ruleIdsForTab(tabId: number): number[] {
  const safeTabId = Math.floor(tabId);
  if (!Number.isSafeInteger(safeTabId) || safeTabId < 1 || safeTabId > MAX_RULE_ID) {
    throw new RangeError(`Cannot create a DNR rule for invalid tab id ${tabId}.`);
  }
  return [safeTabId];
}

function rulesForTab(tabId: number): SessionRule[] {
  return [
    {
      id: ruleIdsForTab(tabId)[0]!,
      priority: 100,
      action: { type: 'block' },
      condition: { regexFilter: verifiedUiBundleRegex, resourceTypes: ['script'], tabIds: [tabId] },
    },
  ];
}

export function createReplacementPolicy(api: DnrApi, isReplacementRoute: (url: string) => boolean): ReplacementPolicy {
  return {
    calculate(tabId, url) {
      return isReplacementRoute(url) ? rulesForTab(tabId) : [];
    },
    async sync(tabId, url) {
      const removeRuleIds = ruleIdsForTab(tabId);
      const addRules = this.calculate(tabId, url);
      await api.updateSessionRules(addRules.length ? { removeRuleIds, addRules } : { removeRuleIds });
    },
    async remove(tabId) {
      await api.updateSessionRules({ removeRuleIds: ruleIdsForTab(tabId) });
    },
  };
}
