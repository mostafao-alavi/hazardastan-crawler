import React from 'react';
import { AlertTriangle, RotateCw, ExternalLink } from 'lucide-react';

export interface ErrorStateCardProps {
  id?: string;
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  onViewDetails?: () => void;
  className?: string;
}

export const ErrorStateCard: React.FC<ErrorStateCardProps> = ({
  id,
  title = 'خطایی رخ داده است',
  message,
  onRetry,
  isRetrying = false,
  onViewDetails,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-4 sm:p-5 shadow-xs ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
              {title}
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-0.5 font-mono">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="px-3 py-1.5 text-rose-800 dark:text-rose-300 hover:text-rose-950 dark:hover:text-rose-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده جزئیات</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[38px]"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'در حال بازخوانی...' : 'تلاش مجدد'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
