import type { StateStorage } from 'zustand/middleware';

export const GLOBAL_ENABLED_KEY = 'lightning.globalEnabled';
export const GLOBAL_MODE_STORAGE_KEY = GLOBAL_ENABLED_KEY;
export const LEGACY_TAB_MODES_KEY = 'lightning.tabModes';

export type BrowserStorageArea = {
  get: (keys?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
};

export type SettingsStorage = StateStorage;

export function createBrowserStorageAdapter(area: BrowserStorageArea): SettingsStorage {
  return {
    async getItem(name) {
      const values = await area.get(name);
      const value = values[name];
      return typeof value === 'string' ? value : value === undefined ? null : JSON.stringify(value);
    },
    async setItem(name, value) {
      await area.set({ [name]: value });
    },
    async removeItem(name) {
      await area.remove([name]);
    },
  };
}

export type GlobalModeStore = {
  get(): Promise<boolean>;
  set(enabled: boolean): Promise<void>;
  canAutoEnable(tabId: number, url: string): Promise<boolean>;
};

export type CanAutoEnableContext = {
  url: string;
  globalEnabled: boolean;
  isEchoUrl?: (url: string) => boolean;
  isAuthUrl?: (url: string) => boolean;
  isReplacementRoute?: (url: string) => boolean;
  isLoggedOutFromDOM?: boolean | null;
};

const ECHO_HOST = 'echo360.net.au';

function isEchoHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === ECHO_HOST || host.endsWith(`.${ECHO_HOST}`);
}

function isEchoUrlDefault(value: string | URL): boolean {
  try {
    const url = typeof value === 'string' ? new URL(value) : value;
    return (url.protocol === 'https:' || url.protocol === 'http:') && isEchoHost(url.hostname);
  } catch {
    return false;
  }
}

type EchoRouteKind = 'auth' | 'courses' | 'section' | 'classroom' | 'unsupported';

function parseEchoRouteKind(input: string | URL): EchoRouteKind {
  let url: URL;
  try {
    url = typeof input === 'string' ? new URL(input) : new URL(input.href);
  } catch {
    return 'unsupported';
  }
  if (!isEchoHost(url.hostname)) return 'unsupported';
  const path = url.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  if (
    url.hostname.toLowerCase().startsWith('login.') ||
    /^\/(?:auth\/)?(?:login|logout|callback|authorize|sso)(?:\/|$)/i.test(path)
  ) {
    return 'auth';
  }
  const nestedCourseLesson = path.match(
    /^\/(?:content|courses?)\/([^/]+)\/(?:sections?)\/([^/]+)\/(?:lessons?|classrooms?)\/([^/]+)/i,
  );
  if (nestedCourseLesson) return 'classroom';
  const nestedSectionLesson = path.match(/^\/(?:sections?|section-home)\/([^/]+)\/(?:lessons?|classrooms?)\/([^/]+)/i);
  if (nestedSectionLesson) return 'classroom';
  const nestedCourseSection = path.match(/^\/(?:content|courses?)\/([^/]+)\/(?:sections?)\/([^/]+)/i);
  if (nestedCourseSection) return 'section';
  const course = path.match(/^(?:\/(?:content|courses?))\/([^/]+)/i);
  if (course) return 'courses';
  if (/^\/(?:content|courses?|user\/enrollments|home)?$/i.test(path)) return 'courses';
  const classroom = path.match(/^\/(?:classrooms?|lesson|lessons)\/([^/]+)/i);
  if (classroom) return 'classroom';
  const section = path.match(/^\/(?:sections?|section-home)\/([^/]+)/i);
  if (section) return 'section';
  return 'unsupported';
}

function isEchoAuthUrlDefault(input: string | URL): boolean {
  return parseEchoRouteKind(input) === 'auth';
}

function isReplacementRouteDefault(input: string | URL): boolean {
  const kind = parseEchoRouteKind(input);
  return kind === 'courses' || kind === 'section' || kind === 'classroom';
}

function parseStoredBoolean(raw: unknown): boolean | undefined {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === 'boolean') return parsed;
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.globalEnabled === 'boolean') return obj.globalEnabled;
        if (obj.state && typeof obj.state === 'object') {
          const state = obj.state as Record<string, unknown>;
          if (typeof state.globalEnabled === 'boolean') return state.globalEnabled;
          if (typeof state === 'boolean') return state as unknown as boolean;
        }
        if (typeof obj.state === 'boolean') return obj.state as boolean;
      }
    } catch (_error) {
      void _error;
    }
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.globalEnabled === 'boolean') return obj.globalEnabled;
    if (obj.state && typeof obj.state === 'object') {
      const state = obj.state as Record<string, unknown>;
      if (typeof state.globalEnabled === 'boolean') return state.globalEnabled;
    }
  }
  return undefined;
}

export function canAutoEnable(ctx: CanAutoEnableContext): boolean {
  const isEcho = ctx.isEchoUrl ?? isEchoUrlDefault;
  const isAuth = ctx.isAuthUrl ?? isEchoAuthUrlDefault;
  const isReplace = ctx.isReplacementRoute ?? isReplacementRouteDefault;
  if (!ctx.globalEnabled) return false;
  if (!ctx.url || typeof ctx.url !== 'string') return false;
  if (!isEcho(ctx.url)) return false;
  if (isAuth(ctx.url)) return false;
  if (!isReplace(ctx.url)) return false;
  if (ctx.isLoggedOutFromDOM === true) return false;
  return true;
}

function isValidTabId(tabId: number): boolean {
  return Number.isSafeInteger(tabId) && tabId > 0;
}

async function migrateFromLegacyTabModes(
  area: BrowserStorageArea,
  adapter: SettingsStorage,
): Promise<boolean | undefined> {
  try {
    const legacyValues = await area.get(LEGACY_TAB_MODES_KEY);
    const legacy = legacyValues[LEGACY_TAB_MODES_KEY];
    if (legacy === undefined || legacy === null) return undefined;
    let shouldEnable: boolean | undefined;
    if (typeof legacy === 'object' && !Array.isArray(legacy)) {
      const entries = Object.entries(legacy as Record<string, unknown>);
      const hasReplacement = entries.some(([, v]) => v === 'replacement');
      if (entries.length > 0) shouldEnable = hasReplacement ? true : true;
      else shouldEnable = undefined;
    } else if (typeof legacy === 'boolean') {
      shouldEnable = legacy;
    } else if (typeof legacy === 'string') {
      const parsed = parseStoredBoolean(legacy);
      if (parsed !== undefined) shouldEnable = parsed;
      else {
        try {
          const p = JSON.parse(legacy) as unknown;
          if (p && typeof p === 'object') shouldEnable = true;
        } catch (_error) {
          void _error;
          shouldEnable = true;
        }
      }
    }
    if (shouldEnable !== undefined) {
      await area.remove([LEGACY_TAB_MODES_KEY]);
      await adapter.setItem(GLOBAL_ENABLED_KEY, JSON.stringify(shouldEnable));
      return shouldEnable;
    }
    await area.remove([LEGACY_TAB_MODES_KEY]);
    return undefined;
  } catch (_error) {
    void _error;
    return undefined;
  }
}

export function createGlobalModeStore(area: BrowserStorageArea): GlobalModeStore {
  const adapter = createBrowserStorageAdapter(area);
  return {
    async get(): Promise<boolean> {
      try {
        const stored = await adapter.getItem(GLOBAL_ENABLED_KEY);
        if (stored !== null) {
          const parsed = parseStoredBoolean(stored);
          if (parsed !== undefined) return parsed;
        }
        const direct = await area.get(GLOBAL_ENABLED_KEY);
        const directRaw = direct[GLOBAL_ENABLED_KEY];
        const directParsed = parseStoredBoolean(directRaw);
        if (directParsed !== undefined) {
          await adapter.setItem(GLOBAL_ENABLED_KEY, JSON.stringify(directParsed));
          return directParsed;
        }
        if (directRaw !== undefined && typeof directRaw === 'string') {
          try {
            const maybe = JSON.parse(directRaw) as unknown;
            const maybeParsed = parseStoredBoolean(maybe);
            if (maybeParsed !== undefined) {
              await adapter.setItem(GLOBAL_ENABLED_KEY, JSON.stringify(maybeParsed));
              return maybeParsed;
            }
          } catch (_error) {
            void _error;
          }
        }
        const migrated = await migrateFromLegacyTabModes(area, adapter);
        if (migrated !== undefined) return migrated;
        return true;
      } catch (_error) {
        void _error;
        return true;
      }
    },
    async set(enabled: boolean): Promise<void> {
      if (typeof enabled !== 'boolean') throw new TypeError('globalEnabled must be boolean');
      await adapter.setItem(GLOBAL_ENABLED_KEY, JSON.stringify(enabled));
    },
    async canAutoEnable(tabId: number, url: string): Promise<boolean> {
      if (!isValidTabId(tabId)) return false;
      if (typeof url !== 'string' || !url) return false;
      const enabled = await this.get();
      return canAutoEnable({ url, globalEnabled: enabled });
    },
  };
}

export function createGlobalEnabledStore(area: BrowserStorageArea): GlobalModeStore {
  return createGlobalModeStore(area);
}
