import React from 'react';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { SourceHealthStatus } from '../../types/client';

interface SourceHealthListProps {
  sources: SourceHealthStatus[];
  onInspectSource?: (sourceId: number) => void;
  onViewAllSources?: () => void;
}

export const SourceHealthList: React.FC<SourceHealthListProps> = ({
  sources = [],
  onInspectSource,
  onViewAllSources,
}) => {
  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            سالم
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            کند
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            خطا
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              سلامت منابع (Sources Health)
            </h3>
            <p className="text-xs text-gray-500">
              پایش بلادرنگ وضعیت دسترسی و تأخیر پاسخ منابع خبری
            </p>
          </div>
        </div>

        {onViewAllSources && (
          <button
            onClick={onViewAllSources}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>مدیریت همه</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sources List */}
      <div className="divide-y divide-gray-100">
        {sources.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            هیچ منبعی یافت نشد.
          </div>
        ) : (
          sources.map((src) => (
            <div
              key={src.id}
              className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 px-2 rounded-xl transition-colors"
            >
              {/* Left: Name & Host */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 text-xs font-mono font-bold">
                  {src.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {src.name}
                    </h4>
                    {src.category && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-mono hidden sm:inline">
                        {src.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate font-mono mt-0.5">
                    {src.url.replace(/^https?:\/\//, '')}
                  </p>
                </div>
              </div>

              {/* Right: Metrics & Status */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Latency */}
                <div className="hidden sm:flex flex-col items-end text-xs font-mono">
                  <span className="text-gray-700 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {src.latency_ms}ms
                  </span>
                  <span className="text-[10px] text-gray-400">{src.last_crawl}</span>
                </div>

                {/* Status Badge */}
                <div>{getStatusIcon(src.status)}</div>

                {/* Inspect Action */}
                {onInspectSource && (
                  <button
                    onClick={() => onInspectSource(src.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                    title="مشاهده قوانین استخراج این منبع"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
