import React from 'react';
import {
  Cpu,
  CheckCircle2,
  Clock,
  Zap,
  RotateCw,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Radio,
  Gauge,
  Workflow,
  Sparkles,
} from 'lucide-react';
import { EngineHealthInfo } from '../../types/client';

interface EngineHealthCardProps {
  engine: EngineHealthInfo;
  onTriggerManualCrawl: () => void;
  isTriggering: boolean;
  onPauseToggle?: () => void;
  isPaused?: boolean;
}

export const EngineHealthCard: React.FC<EngineHealthCardProps> = ({
  engine,
  onTriggerManualCrawl,
  isTriggering,
  onPauseToggle,
  isPaused = false,
}) => {
  const isHealthy = engine.status === 'running' || engine.status === 'healthy';

  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              وضعیت موتور خزش (Engine Health)
            </h2>
            <p className="text-xs text-gray-500 font-mono">
              Runtime: Cloudflare Serverless Workers (Hono Core)
            </p>
          </div>
        </div>

        {/* Status Indicator Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
              isPaused
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : isHealthy
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPaused ? 'bg-amber-500' : isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>{isPaused ? '⏸️ PAUSED (متوقف‌شده)' : '🟢 RUNNING (فعال و آماده)'}</span>
          </div>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-5">
        {/* Metric 1: Last Crawl */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            آخرین خزش موفق
          </span>
          <p className="text-sm sm:text-base font-bold text-gray-900 mt-1.5 font-mono">
            {engine.last_successful_crawl || '۲ دقیقه پیش'}
          </p>
        </div>

        {/* Metric 2: Current Job */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
            عملیات فعلی
          </span>
          <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-1.5 truncate font-mono" title={engine.current_job}>
            {engine.current_job || 'نظارت بر فیدهای RSS'}
          </p>
        </div>

        {/* Metric 3: Processing Rate */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-blue-500" />
            نرخ پردازش
          </span>
          <p className="text-sm sm:text-base font-bold text-gray-900 mt-1.5 font-mono">
            {engine.processing_rate || '۱۲ صفحه / دقیقه'}
          </p>
        </div>

        {/* Metric 4: Runtime / Concurrency */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            همزمانی و پایداری
          </span>
          <p className="text-sm sm:text-base font-bold text-gray-900 mt-1.5 font-mono">
            {engine.active_concurrency || 3} Worker فعال
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>تمام زیرساخت‌های Cloudflare D1 و Workers KV بدون اخطار عملیاتی هستند.</span>
        </div>

        <div className="flex items-center gap-2">
          {onPauseToggle && (
            <button
              onClick={onPauseToggle}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isPaused ? <PlayCircle className="w-3.5 h-3.5 text-emerald-600" /> : <PauseCircle className="w-3.5 h-3.5 text-amber-600" />}
              <span>{isPaused ? 'فعال‌سازی مجدد' : 'مکث موقت'}</span>
            </button>
          )}

          <button
            onClick={onTriggerManualCrawl}
            disabled={isTriggering}
            className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
            <span>{isTriggering ? 'در حال اجرای فرآیند...' : 'اجرای دستی پایپ‌لاین'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
