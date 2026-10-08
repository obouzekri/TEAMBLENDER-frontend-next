export const DISPLAY_PREFERENCES_KEY = 'tb_display_preferences';
export const DISPLAY_PREFERENCES_EVENT = 'tb:display-preferences';
export const DEFAULT_DISPLAY_PREFERENCES = Object.freeze({
  compactNavigation: false,
  highContrast: false,
});

export function readDisplayPreferences(storage) {
  const raw = storage.getItem(DISPLAY_PREFERENCES_KEY);
  if (raw === null) return { ...DEFAULT_DISPLAY_PREFERENCES };
  const value = JSON.parse(raw);
  if (!value || typeof value.compactNavigation !== 'boolean' || typeof value.highContrast !== 'boolean') {
    throw new Error('Invalid display preferences');
  }
  return { compactNavigation: value.compactNavigation, highContrast: value.highContrast };
}

export function applyDisplayPreferences(preferences, root) {
  root.dataset.compactNavigation = String(preferences.compactNavigation);
  root.dataset.highContrast = String(preferences.highContrast);
}

export function saveDisplayPreferences(preferences, storage) {
  if (typeof preferences.compactNavigation !== 'boolean' || typeof preferences.highContrast !== 'boolean') {
    throw new Error('Invalid display preferences');
  }
  const value = { compactNavigation: preferences.compactNavigation, highContrast: preferences.highContrast };
  storage.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify(value));
  return value;
}
