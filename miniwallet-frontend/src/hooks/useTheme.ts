import { useEffect, useState } from 'react';
import { applyTheme, getInitialTheme, saveTheme } from '../utils/theme';
import type { Theme } from '../types';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme, toggleTheme };
}
