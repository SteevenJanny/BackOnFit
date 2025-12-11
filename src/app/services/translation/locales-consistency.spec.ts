// This test ensures all translation files have the same keys

import {translationService} from "./translation.service";

interface JsonMap {
  [key: string]: any;
}

// Recursively list all keys: a.b.c
function extractKeys(obj: JsonMap, prefix = ''): string[] {
  const keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;

    if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      keys.push(...extractKeys(obj[k], full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

describe('Locales consistency', () => {
  const languages = translationService.prototype.getSupportedLanguages.call({});

  const dictionaries: Record<string, any> = {};

  beforeAll(() => {
    // Load assets/locales/*.json
    for (const lng of languages) {
      dictionaries[lng] = require(`../../../assets/locales/${lng}.json`);
    }
  });

  it('all languages must have the same translation keys', () => {
    const reference = extractKeys(dictionaries['en']).sort();

    for (const lng of languages) {
      const current = extractKeys(dictionaries[lng]).sort();
      expect(current).toEqual(reference);
    }
  });
});
