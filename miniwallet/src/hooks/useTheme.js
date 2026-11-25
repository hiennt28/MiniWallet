import { useEffect, useState } from 'react';
import { applyTheme, getInitialTheme, saveTheme } from '../utils/theme';

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme, toggleTheme };
}
