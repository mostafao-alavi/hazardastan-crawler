import React, { useState } from 'react';
import {
  LayoutDashboard,
  Cpu,
  Inbox,
  FileEdit,
  Sparkles,
  Database,
  BarChart3,
  Sliders,
  Layers,
  History,
  Clock,
  Globe,
  Rss,
  Wrench,
  FolderTree,
  FileCheck2,
  Send,
  Bot,
  Terminal,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  Flame,
  Radio,
  Server,
  Zap,
} from 'lucide-react';
import { MainAppTab } from '../Navbar';

export interface AppSidebarProps {
  activeTab: MainAppTab | string;
  activeSubTab?: string;
  onNavigate: (tab: any, subTab?: string) => void;
  pendingCount?: number;
  errorCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavSectionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  tab: MainAppTab | string;
  items?: NavSectionItem[];
  defaultSubTab?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  activeSubTab,
  onNavigate,
  pendingCount = 0,
  errorCount = 1,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    crawler: true,
    sources: true,
    content: false,
    ai: false,
    system: false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const navSections: NavSection[] = [
    {
      id: 'dashboard',
      label: 'پیشخوان عملیات (Dashboard)',
      icon: <LayoutDashboard className="w-4 h-4" />,
      tab: 'dashboard',
    },
    {
      id: 'crawler',
      label: 'موتور خزش (Crawler Engine)',
      icon: <Cpu className="w-4 h-4" />,
      tab: 'crawler',
      defaultSubTab: 'overview',
      items: [
        { id: 'overview', label: 'نمای کلی (Overview)', icon: <Flame className="w-3.5 h-3.5" /> },
        { id: 'jobs', label: 'عملیات خزش (Jobs)', icon: <Terminal className="w-3.5 h-3.5" />, badge: '120' },
        { id: 'queue', label: 'مرکز صف (Queue)', icon: <Layers className="w-3.5 h-3.5" />, badge: '24' },
        { id: 'checkpoints', label: 'مکان‌نماها (Checkpoints)', icon: <History className="w-3.5 h-3.5" /> },
        { id: 'schedules', label: 'زمان‌بندی‌ها (Schedules)', icon: <Clock className="w-3.5 h-3.5" /> },
        { id: 'sandbox', label: 'سندباکس زنده (Sandbox)', icon: <Radio className="w-3.5 h-3.5" /> },
      ],
    },
    {
      id: 'sources',
      label: 'منابع ورودی (Sources)',
      icon: <Globe className="w-4 h-4" />,
      tab: 'sources',
      defaultSubTab: 'connectors',
      items: [
        { id: 'websites', label: 'سایت‌های خبری (Websites)', icon: <Globe className="w-3.5 h-3.5" /> },
        { id: 'rss', label: 'فیدها (RSS Feeds)', icon: <Rss className="w-3.5 h-3.5" /> },
        { id: 'rules', label: 'قوانین استخراج (Rules)', icon: <Wrench className="w-3.5 h-3.5" /> },
        { id: 'categories', label: 'دسته‌بندی‌ها (Categories)', icon: <FolderTree className="w-3.5 h-3.5" /> },
      ],
    },
    {
      id: 'content',
      label: 'میز کار محتوا (Content Desk)',
      icon: <FileEdit className="w-4 h-4" />,
      tab: 'content',
      defaultSubTab: 'queue',
      items: [
        { id: 'extracted', label: 'استخراج‌شده (Extracted)', icon: <FileCheck2 className="w-3.5 h-3.5" />, badge: '5420' },
        { id: 'review', label: 'بررسی سردبیر (Review)', icon: <FileEdit className="w-3.5 h-3.5" />, badge: pendingCount > 0 ? pendingCount : undefined, badgeColor: 'bg-amber-500 text-white' },
        { id: 'translation', label: 'ترجمه هوشمند (Translation)', icon: <Sparkles className="w-3.5 h-3.5" /> },
        { id: 'publishing', label: 'انتشار و ارسال (Publishing)', icon: <Send className="w-3.5 h-3.5" /> },
      ],
    },
    {
      id: 'ai',
      label: 'هوش مصنوعی (AI Models)',
      icon: <Bot className="w-4 h-4" />,
      tab: 'ai',
      defaultSubTab: 'models',
      items: [
        { id: 'models', label: 'مدل‌ها (Models)', icon: <Bot className="w-3.5 h-3.5" /> },
        { id: 'prompts', label: 'پرامپت‌ها (Prompts)', icon: <Sparkles className="w-3.5 h-3.5" /> },
        { id: 'usage', label: 'مصرف منابع (Usage)', icon: <BarChart3 className="w-3.5 h-3.5" /> },
      ],
    },
    {
      id: 'analytics',
      label: 'آمار و گزارش‌ها (Analytics)',
      icon: <BarChart3 className="w-4 h-4" />,
      tab: 'reports',
    },
    {
      id: 'system',
      label: 'سیستم و زیرساخت (System)',
      icon: <Database className="w-4 h-4" />,
      tab: 'system',
      defaultSubTab: 'engine',
      items: [
        { id: 'd1', label: 'دیتابیس D1 Explorer', icon: <Database className="w-3.5 h-3.5" /> },
        { id: 'kv', label: 'حافظه کش KV Cache', icon: <Zap className="w-3.5 h-3.5" /> },
        { id: 'queue', label: 'صف Cloudflare Queues', icon: <Layers className="w-3.5 h-3.5" /> },
        { id: 'logs', label: 'لاگ‌های سیستم (Logs)', icon: <Terminal className="w-3.5 h-3.5" /> },
        { id: 'errors', label: 'خطاها (Error Center)', icon: <AlertTriangle className="w-3.5 h-3.5" />, badge: errorCount > 0 ? errorCount : undefined, badgeColor: 'bg-rose-500 text-white' },
      ],
    },
  ];

  const handleItemClick = (section: NavSection, subTabId?: string) => {
    onNavigate(section.tab, subTabId || section.defaultSubTab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isSectionActive = (section: NavSection) => {
    return activeTab === section.tab || (section.tab === 'reports' && activeTab === 'analytics');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 right-0 z-50 w-72 lg:w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out shrink-0 h-screen lg:h-[calc(100vh-5rem)] sticky lg:top-20 select-none ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 lg:hidden flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold font-sans">
              هـ
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              ناوبری هزاردستان
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold"
          >
            بستن ✕
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 text-xs font-medium">
          {navSections.map((section) => {
            const active = isSectionActive(section);
            const hasItems = section.items && section.items.length > 0;
            const isExpanded = expandedSections[section.id] ?? false;

            return (
              <div key={section.id} className="space-y-0.5">
                {/* Main Level Button */}
                <div
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-all cursor-pointer ${
                    active && !hasItems
                      ? 'bg-orange-500 text-white shadow-xs font-bold'
                      : active
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold border border-orange-200/80 dark:border-orange-800/50'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80'
                  }`}
                  onClick={() => {
                    if (hasItems) {
                      toggleSection(section.id);
                      handleItemClick(section);
                    } else {
                      handleItemClick(section);
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={active && !hasItems ? 'text-white' : 'text-orange-500 dark:text-orange-400'}>
                      {section.icon}
                    </span>
                    <span className="truncate">{section.label}</span>
                  </div>

                  {hasItems && (
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(section.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronLeft className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Sub-items (Sub-navigation tree) */}
                {hasItems && isExpanded && (
                  <div className="pr-5 pl-1 py-1 space-y-0.5 border-r border-orange-200/60 dark:border-orange-900/40 mr-3 mt-1">
                    {section.items?.map((item) => {
                      const isSubActive = active && (activeSubTab === item.id || (!activeSubTab && item.id === section.defaultSubTab));

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(section, item.id)}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer text-[11px] ${
                            isSubActive
                              ? 'bg-orange-500 text-white font-bold shadow-xs'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={isSubActive ? 'text-white' : 'text-gray-400'}>
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                isSubActive
                                  ? 'bg-white/25 text-white'
                                  : item.badgeColor || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer - Edge Worker Status */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-[11px]">
          <div className="flex items-center justify-between font-mono">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-500" />
              hazardastan-crawler
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded">
              EDGE LIVE
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
