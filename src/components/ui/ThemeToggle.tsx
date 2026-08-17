import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export interface ThemeToggleProps {
  id?: string;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ id, className = '' }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hz_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('hz_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('hz_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <button
      id={id || 'theme-toggle-btn'}
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
      className={`p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shadow-2xs ${className}`}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-gray-600 animate-in spin-in-180 duration-300" />
      )}
    </button>
  );
};
