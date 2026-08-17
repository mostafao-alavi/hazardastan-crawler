import React from 'react';
import {
  AlertTriangle,
  RotateCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface ErrorCenterCardProps {
  failedJobsCount: number;
  recentErrors: Array<{
    id: number;
    job_id?: number;
    source_name?: string;
    error_message: string;
    time: string;
  }>;
  onRetryError?: (errorId: number) => void;
  onViewAllErrors?: () => void;
}

export const ErrorCenterCard: React.FC<ErrorCenterCardProps> = ({
  failedJobsCount = 0,
  recentErrors = [],
  onRetryError,
  onViewAllErrors,
}) => {
  if (failedJobsCount === 0 && recentErrors.length === 0) {
    return null;
  }

  return (
    <div className="bg-rose-50/60 border border-rose-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rose-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
              مرکز رسیدگی به خطاهای خزش (Error Center)
              <span className="bg-rose-200/80 text-rose-900 text-[10px] px-2 py-0.2 rounded-full font-mono font-extrabold">
                {failedJobsCount} مورد
              </span>
            </h4>
            <p className="text-xs text-rose-700 mt-0.5">
              مواردی که در آخرین چرخه خزش با تایم‌اوت، عدم تطابق سلکتور یا خطای شبکه مواجه شدند.
            </p>
          </div>
        </div>

        {onViewAllErrors && (
          <button
            onClick={onViewAllErrors}
            className="text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>مشاهده گزارش خطاها</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Error Items List */}
      <div className="divide-y divide-rose-200/40 mt-2">
        {recentErrors.map((err) => (
          <div
            key={err.id}
            className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          >
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <div>
                <span className="text-xs font-bold text-rose-950 font-mono">
                  {err.source_name || 'Generic Source'} {err.job_id ? `(#${err.job_id})` : ''}:
                </span>
                <span className="text-xs text-rose-800 mr-1.5 font-mono">
                  {err.error_message}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              <span className="text-[11px] font-mono text-rose-600">
                {err.time}
              </span>
              {onRetryError && (
                <button
                  onClick={() => onRetryError(err.id)}
                  className="px-2 py-1 bg-white hover:bg-rose-100 border border-rose-300 text-rose-900 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>تلاش مجدد</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
