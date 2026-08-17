import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Inbox,
  FileEdit,
  Sparkles,
  Database,
  RefreshCw,
  Home,
  Rss,
  Send,
  BarChart3,
  Sliders,
} from 'lucide-react';
import { ThemeToggle } from './ui/ThemeToggle';

export type MainAppTab =
  | 'dashboard'
  | 'crawler'
  | 'sources'
  | 'content'
  | 'content-desk'
  | 'destinations'
  | 'reports'
  | 'ai'
  | 'system'
  | 'settings';

interface NavbarProps {
  activeTab: MainAppTab;
  setActiveTab: (tab: MainAppTab, subTab?: string) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onGoHome?: () => void;
  pendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onRefreshAll,
  isRefreshing,
  onGoHome,
  pendingCount = 0,
}) => {
  // Normalize active tab for highlight
  const isDashboard = activeTab === 'dashboard';
  const isCrawler = activeTab === 'crawler';
  const isSources = activeTab === 'sources';
  const isContent = activeTab === 'content' || activeTab === 'content-desk';
  const isAI = activeTab === 'ai';
  const isSystem = activeTab === 'system' || activeTab === 'settings' || activeTab === 'destinations' || activeTab === 'reports';

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sticky top-0 z-50 shadow-xs transition-colors">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 justify-between h-16 sm:h-20">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onGoHome}
              className="bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 p-2.5 sm:p-3 rounded-2xl text-white shadow-md shadow-orange-500/20 shrink-0 hover:opacity-90 transition-opacity flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
              title="صفحه اصلی ۱۰۰۰ دستان"
            >
              <Rss className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onGoHome}
                  className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight font-sans hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-start cursor-pointer"
                >
                  هزاردستان
                </button>
                <span className="bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/60 text-[11px] px-2.5 py-0.5 rounded-full font-bold hidden lg:flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Crawler Core v2.0
                </span>
              </div>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto text-nowrap py-1">
            {/* 1. Dashboard (پیشخوان عملیات) */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] cursor-pointer ${
                isDashboard
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>پیشخوان عملیات</span>
            </button>

            {/* 2. Crawler Engine (موتور خزش و جاب‌ها) */}
            <button
              onClick={() => setActiveTab('crawler')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] cursor-pointer ${
                isCrawler
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span>موتور خزش (Crawler)</span>
            </button>

            {/* 3. Input Sources (منابع خبری) */}
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] cursor-pointer ${
                isSources
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4 shrink-0" />
              <span>منابع ورودی</span>
            </button>

            {/* 4. Content Desk (میز کار محتوا) */}
            <button
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] cursor-pointer relative ${
                isContent
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileEdit className="w-4 h-4 shrink-0" />
              <span>میز کار محتوا</span>
              {pendingCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isContent ? 'bg-white/25 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            {/* 5. AI Pipelines (آماده‌سازی هوش مصنوعی) */}
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] cursor-pointer ${
                isAI
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>هوش مصنوعی (AI)</span>
            </button>

            {/* 6. System & Storage (زیرساخت و دیتابیس D1) */}
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] cursor-pointer ${
                isSystem
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>سیستم و دیتابیس</span>
            </button>
          </nav>

          {/* Action Buttons: Dark Mode Toggle + Refresh + Home */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Theme Toggle (Dark / Light) */}
            <ThemeToggle />

            {onGoHome && (
              <button
                onClick={onGoHome}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all min-h-[44px] cursor-pointer"
                title="صفحه اصلی معرفی"
              >
                <Home className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>معرفی</span>
              </button>
            )}

            <button
              onClick={onRefreshAll}
              disabled={isRefreshing}
              title="بروزرسانی داده‌های سامانه"
              className="p-2.5 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-600 dark:text-orange-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
