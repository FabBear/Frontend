import { computed, ref } from 'vue';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'fabbear-theme';

// Module-level state — shared across all callers
const _theme = ref<Theme>((localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'light');

function _apply(t: Theme) {
  if (t === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem(STORAGE_KEY, t);
}

// Apply saved preference immediately on first import
_apply(_theme.value);

export function useTheme() {
  const isDark = computed(() => _theme.value === 'dark');

  function toggle() {
    _theme.value = _theme.value === 'light' ? 'dark' : 'light';
    _apply(_theme.value);
  }

  return { isDark, toggle };
}
