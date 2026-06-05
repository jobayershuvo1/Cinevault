import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('cinevault_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark'; // Dark mode is default
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '';
      root.style.color = '';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '';
      root.style.color = '';
    }
    localStorage.setItem('cinevault_theme', theme);
  }, [theme]);

  return (
    <button
      id="theme_toggle_btn"
      variant="ghost"
      onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      className="p-2.5 rounded-full transition-all duration-300 active:scale-90 hover:bg-black/10 dark:hover:bg-white/10 text-rose-500 dark:text-violet-400 cursor-pointer shadow-sm relative overflow-hidden group"
      title={theme === 'dark' ? 'Switch to Rose Light Mode' : 'Switch to Cinematic Dark Mode'}
    >
      <div className="absolute inset-0 bg-radial from-violet-500/10 dark:from-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="relative block">
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 animate-spin-slow" />
        ) : (
          <Moon className="h-5 w-5 animate-pulse" />
        )}
      </span>
    </button>
  );
}
