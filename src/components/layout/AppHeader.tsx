import React, { useState } from 'react';
import {
  Rss,
  Activity,
  Bell,
  Settings,
  RefreshCw,
  Play,
  Menu,
  Server,
  Globe,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export interface AppHeaderProps {
  onToggleMobileSidebar: () => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onTriggerScraper: () => void;
  isTriggeringScraper: boolean;
  onOpenSettings?: () => void;
  onOpenAlerts?: () => void;
  errorCount?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onToggleMobileSidebar,
  onRefreshAll,
  isRefreshing,
  onTriggerScraper,
  isTriggeringScraper,
  onOpenSettings,
  onOpenAlerts,
  errorCount = 1,
}) => {
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sticky top-0 z-40 shadow-xs transition-colors h-16 sm:h-20 flex items-center">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button + Brand & Environment */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-2 -mr-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden cursor-pointer"
            aria-label="منوی ناوبری"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo Badge */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Rss className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          {/* Brand Titles */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">
                Hazardastan Crawler
              </h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Production
              </span>
              <span className="hidden sm:inline-block bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                Cloudflare Edge
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate hidden xs:block">
              Production Edge Crawler • Generic Structured News Extractor
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Bar (🔔 ⚙ 🌙 🔄 ⚡) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Manual Crawl Trigger */}
          <button
            type="button"
            onClick={onTriggerScraper}
            disabled={isTriggeringScraper}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 min-h-[40px]"
            title="اجرای دستی خزش روی تمامی منابع فعال"
          >
            <Play className={`w-3.5 h-3.5 ${isTriggeringScraper ? 'animate-spin' : 'fill-current'}`} />
            <span>{isTriggeringScraper ? 'خزش فعال...' : 'خزش دستی زنده'}</span>
          </button>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="p-2.5 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center disabled:opacity-50 cursor-pointer"
            title="بروزرسانی داده‌ها و لاگ‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
          </button>

          {/* Notifications / Alerts Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAlertDropdown(!showAlertDropdown);
                if (onOpenAlerts) onOpenAlerts();
              }}
              className="p-2.5 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center relative cursor-pointer"
              title="هشدارها و اعلانات سیستم"
            >
              <Bell className="w-4 h-4" />
              {errorCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-900" />
              )}
            </button>

            {showAlertDropdown && (
              <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in-50">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-orange-500" />
                    اعلانات و هشدارهای عملیاتی
                  </h4>
                  <span className="text-[10px] font-mono text-gray-400">Live</span>
                </div>
                <div className="py-2 space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      خطای خزش کند فید
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
                      منبع CoinDesk با تأخیر بیش از ۵ ثانیه پاسخ داد (Non-fatal).
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      پشتیبان‌گیری Google Sheets
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                      دسته جدید مقالات با موفقیت در شیت سینک شد.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings Shortcut */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2.5 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              title="تنظیمات سیستم و دیتابیس D1"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
