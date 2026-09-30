import { describe, it, expect } from 'vitest';
import en from '../src/i18n/locales/en.json';
import zhTW from '../src/i18n/locales/zh-TW.json';

// Keys that ImportResumeModal renders with a hardcoded zh-TW fallback: when they
// are missing from the locale files, English users see Chinese text.
const REQUIRED_IMPORT_MODAL_KEYS = [
  ['loading', 'step0'],
  ['loading', 'step1'],
  ['loading', 'step2'],
  ['loading', 'step3'],
  ['errors', 'rateLimit'],
  ['errors', 'aiFailed']
] as const;

const lookup = (locale: Record<string, any>, path: readonly string[]) =>
  path.reduce<any>((node, key) => node?.[key], locale.importModal);

describe('i18n locale coverage', () => {
  it.each(REQUIRED_IMPORT_MODAL_KEYS)('defines importModal.%s.%s in both locales', (...path) => {
    expect(typeof lookup(en, path)).toBe('string');
    expect(typeof lookup(zhTW, path)).toBe('string');
  });

  it('translates the English strings instead of reusing the zh-TW text', () => {
    for (const path of REQUIRED_IMPORT_MODAL_KEYS) {
      const enValue = lookup(en, path) as string;
      expect(enValue).not.toMatch(/[一-鿿]/);
      expect(enValue).not.toBe(lookup(zhTW, path));
    }
  });
});
