import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { StatusBadge, StatusBadgeVariant } from './StatusBadge';

export interface TimelineItem {
  id: string | number;
  title: string;
  description?: string;
  time: string;
  type?: 'crawler' | 'extract' | 'ai' | 'backup' | 'publish' | 'system' | 'queue' | string;
  status?: 'success' | 'warning' | 'error' | 'info' | string;
  meta?: Record<string, any>;
}

export interface TimelineProps {
  id?: string;
  items: TimelineItem[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  id,
  items,
  title = 'رویدادهای زنده (Activity Timeline)',
  subtitle = 'تاریخچه زمانی وظایف و لاگ‌های اجرا',
  isLoading = false,
  emptyMessage = 'هیچ رویدادی اخیراً ثبت نشده است.',
  onViewAll,
  viewAllLabel = 'مشاهده همه لاگ‌ها',
  className = '',
}) => {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeBadgeVariant = (type?: string): StatusBadgeVariant => {
    switch (type) {
      case 'crawler':
        return 'info';
      case 'extract':
        return 'active';
      case 'backup':
        return 'success';
      case 'queue':
        return 'pending';
      case 'ai':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'crawler':
        return 'RSS Ingest';
      case 'extract':
        return 'Extraction';
      case 'backup':
        return 'Sheets Backup';
      case 'queue':
        return 'Queue Batch';
      case 'ai':
        return 'AI Processor';
      default:
        return type || 'System';
    }
  };

  return (
    <div
      id={id}
      className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{viewAllLabel}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Timeline Content */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="flex-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl p-3 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3.5 relative before:absolute before:inset-0 before:right-3.5 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800 before:pointer-events-none">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative flex items-start gap-3.5 pr-1"
            >
              {/* Status Dot icon */}
              <div className="w-7 h-7 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 z-10 shadow-2xs">
                {getStatusIcon(item.status)}
              </div>

              {/* Item Card */}
              <div className="flex-1 bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/70 dark:border-gray-800 rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      {item.title}
                    </span>
                    {item.type && (
                      <StatusBadge
                        label={getTypeLabel(item.type)}
                        variant={getTypeBadgeVariant(item.type)}
                        size="sm"
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                    {item.time}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
