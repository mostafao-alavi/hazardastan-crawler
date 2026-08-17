import React from 'react';
import {
  Globe,
  Layers,
  FileText,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

interface MetricsRowProps {
  sourcesCount: number;
  activeSourcesCount: number;
  jobsCount: number;
  articlesCount: number;
  errorsCount: number;
  onNavigate?: (target: 'sources' | 'jobs' | 'articles' | 'errors') => void;
}

export const MetricsRow: React.FC<MetricsRowProps> = ({
  sourcesCount = 24,
  activeSourcesCount = 22,
  jobsCount = 120,
  articlesCount = 5420,
  errorsCount = 3,
  onNavigate,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Sources Metric */}
      <div
        onClick={() => onNavigate && onNavigate('sources')}
        className={`bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-orange-300 hover:shadow-sm ${
          onNavigate ? 'cursor-pointer' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-blue-500" />
            منابع ورودی (Sources)
          </span>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
            {activeSourcesCount} فعال
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
            {sourcesCount.toLocaleString('fa-IR')}
          </p>
          <span className="text-xs text-gray-400 font-mono">
            / {sourcesCount} کل
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
          <span>فیدهای RSS، Sitemap و HTML</span>
          {onNavigate && <ExternalLink className="w-3 h-3 text-gray-400" />}
        </p>
      </div>

      {/* 2. Crawl Jobs Metric */}
      <div
        onClick={() => onNavigate && onNavigate('jobs')}
        className={`bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-orange-300 hover:shadow-sm ${
          onNavigate ? 'cursor-pointer' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-500" />
            عملیات‌های خزش (Jobs)
          </span>
          <span className="text-[11px] font-bold text-purple-600 bg-purple-50 border border-purple-200/70 px-2 py-0.5 rounded-full font-mono">
            Today
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
            {jobsCount.toLocaleString('fa-IR')}
          </p>
          <span className="text-xs text-purple-600 font-semibold flex items-center gap-0.5">
            <TrendingUp className="w-3.5 h-3.5" />
            +۱۴٪
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
          <span>Cron و فرآیندهای دستی پیوسته</span>
          {onNavigate && <ExternalLink className="w-3 h-3 text-gray-400" />}
        </p>
      </div>

      {/* 3. Articles Metric */}
      <div
        onClick={() => onNavigate && onNavigate('articles')}
        className={`bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-orange-300 hover:shadow-sm ${
          onNavigate ? 'cursor-pointer' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-500" />
            مقاله‌های ساختاریافته (Articles)
          </span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full font-mono">
            D1 Edge
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
            {articlesCount.toLocaleString('fa-IR')}
          </p>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Valid
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
          <span>متن تمیز + متادیتای تصاویر</span>
          {onNavigate && <ExternalLink className="w-3 h-3 text-gray-400" />}
        </p>
      </div>

      {/* 4. Errors Metric */}
      <div
        onClick={() => onNavigate && onNavigate('errors')}
        className={`bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-rose-300 hover:shadow-sm ${
          errorsCount > 0 ? 'bg-rose-50/20' : ''
        } ${onNavigate ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            خطاها و هشدارهای خزش (Errors)
          </span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
              errorsCount > 0
                ? 'text-rose-700 bg-rose-50 border border-rose-200'
                : 'text-gray-500 bg-gray-100'
            }`}
          >
            {errorsCount > 0 ? 'نیاز به بررسی' : 'عالی'}
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <p
            className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              errorsCount > 0 ? 'text-rose-600' : 'text-gray-900'
            }`}
          >
            {errorsCount.toLocaleString('fa-IR')}
          </p>
          <span className="text-xs text-gray-400 font-mono">
            نرخ سلامت ۹۸.۵٪
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
          <span>خطاهای شبکه، سلکتور و تایم‌اوت</span>
          {onNavigate && <ExternalLink className="w-3 h-3 text-gray-400" />}
        </p>
      </div>
    </div>
  );
};
