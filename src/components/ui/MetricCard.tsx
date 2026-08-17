import React from 'react';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { StatusBadge, StatusBadgeVariant } from './StatusBadge';

export interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  badgeVariant?: StatusBadgeVariant;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  footerText?: string;
  footerLinkIcon?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subValue,
  icon,
  badgeText,
  badgeVariant = 'info',
  trend,
  footerText,
  footerLinkIcon = false,
  isLoading = false,
  onClick,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div
        id={id}
        className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs animate-pulse ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded-full" />
        </div>
        <div className="mt-4 h-8 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="mt-3 h-3 w-36 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-sm ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      {/* Top row: Icon + Title + Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <div className="shrink-0 text-gray-500 dark:text-gray-400">
              {icon}
            </div>
          )}
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate">
            {title}
          </span>
        </div>

        {badgeText && (
          <StatusBadge
            label={badgeText}
            variant={badgeVariant}
            size="sm"
          />
        )}
      </div>

      {/* Main Value Display */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
          {typeof value === 'number' ? value.toLocaleString('fa-IR') : value}
        </p>

        {trend && (
          <span
            className={`text-xs font-semibold flex items-center gap-0.5 font-mono ${
              trend.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {trend.value}
          </span>
        )}

        {subValue && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {subValue}
          </span>
        )}
      </div>

      {/* Footer hint */}
      {(footerText || footerLinkIcon) && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
          <span className="truncate">{footerText}</span>
          {footerLinkIcon && (
            <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
          )}
        </div>
      )}
    </div>
  );
};
