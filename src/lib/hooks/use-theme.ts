'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore, type AppTheme } from '@/stores/app-store';

export interface ThemeMeta {
  name: AppTheme;
  label: string;
  description: string;
  accent: string;
  bgPrimary: string;
  isDark: boolean;
}

export const THEME_LIST: ThemeMeta[] = [
  {
    name: 'tokyo-night',
    label: 'Tokyo Night',
    description: 'Dark, purple-blue, high contrast',
    accent: '#7aa2f7',
    bgPrimary: '#1a1b26',
    isDark: true,
  },
  {
    name: 'linear',
    label: 'Linear',
    description: 'Clean, precise, blue-accented',
    accent: '#5e6ad2',
    bgPrimary: '#ffffff',
    isDark: false,
  },
  {
    name: 'cursor',
    label: 'Cursor',
    description: 'Dark, developer-focused, purple',
    accent: '#cba6f7',
    bgPrimary: '#1e1e2e',
    isDark: true,
  },
  {
    name: 'notion',
    label: 'Notion',
    description: 'Light, minimal, warm-gray',
    accent: '#1e8ab8',
    bgPrimary: '#ffffff',
    isDark: false,
  },
  {
    name: 'posthog',
    label: 'PostHog',
    description: 'Vibrant, data-driven, yellow',
    accent: '#f9bd2b',
    bgPrimary: '#1c1c2e',
    isDark: true,
  },
];

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const switchTheme = useCallback(
    (name: AppTheme) => {
      document.documentElement.dataset.theme = name;
      setTheme(name);
    },
    [setTheme],
  );

  const cycleTheme = useCallback(() => {
    const idx = THEME_LIST.findIndex((t) => t.name === theme);
    const next = THEME_LIST[(idx + 1) % THEME_LIST.length];
    switchTheme(next.name);
  }, [theme, switchTheme]);

  return {
    theme,
    switchTheme,
    cycleTheme,
    themeMeta: THEME_LIST.find((t) => t.name === theme) ?? THEME_LIST[0],
    availableThemes: THEME_LIST,
  };
}
