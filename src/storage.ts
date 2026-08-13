import type { Provider } from './types';

const ITEM_NAMES: Record<Provider, string> = {
  deepseek: 'apnt.key.deepseek',
  gemini: 'apnt.key.gemini',
};

export function loadKeys(): { deepseek: string; gemini: string } {
  return {
    deepseek: localStorage.getItem(ITEM_NAMES.deepseek) ?? '',
    gemini: localStorage.getItem(ITEM_NAMES.gemini) ?? '',
  };
}

export function saveKey(provider: Provider, key: string): void {
  localStorage.setItem(ITEM_NAMES[provider], key);
}

export function clearKey(provider: Provider): void {
  localStorage.removeItem(ITEM_NAMES[provider]);
}
