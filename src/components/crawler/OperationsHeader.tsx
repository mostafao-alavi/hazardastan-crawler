import React from 'react';
import {
  Activity,
  Server,
  Cloud,
  Globe,
  Bell,
  Settings,
  Moon,
  Sun,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface OperationsHeaderProps {
  status: 'running' | 'healthy' | 'idle' | 'warning' | 'paused';
  workerName: string;
  region: string;
  version: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onTriggerCrawl: () => void;
  isCrawling: boolean;
  onOpenSettings?: () => void;
}

export const OperationsHeader: React.FC<OperationsHeaderProps> = ({
  status,
  workerName = 'hazardastan-crawler',
  region = 'Cloudflare Edge (Global)',
  version = 'v2.0.0-core-freeze',
  isRefreshing,
  onRefresh,
  onTriggerCrawl,
  isCrawling,
  onOpenSettings,
}) => {
  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Brand + Status Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                  Hazardastan Crawler
                </h1>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Production
                </span>
                <span className="bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 rounded-full font-mono font-medium">
                  {version}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-gray-400" />
                  Worker: <code className="font-mono text-gray-700 font-semibold">{workerName}</code>
                </span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  {region}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: Operational Controls & Live Actions */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Quick Manual Crawl Trigger */}
          <button
            id="btn-quick-trigger-crawl"
            onClick={onTriggerCrawl}
            disabled={isCrawling}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 min-h-[42px]"
          >
            <Play className={`w-4 h-4 ${isCrawling ? 'animate-spin' : 'fill-current'}`} />
            <span>{isCrawling ? 'در حال اجرای خزش...' : 'اجرای خزش زنده'}</span>
          </button>

          {/* Sync / Refresh Data */}
          <button
            id="btn-header-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 min-h-[42px]"
            title="بروزرسانی وضعیت لاگ‌ها و صف"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span className="hidden sm:inline">بروزرسانی</span>
          </button>

          {onOpenSettings && (
            <button
              id="btn-header-settings"
              onClick={onOpenSettings}
              className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer"
              title="تنظیمات سیستم"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
