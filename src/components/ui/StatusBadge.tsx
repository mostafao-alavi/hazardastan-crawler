import React from 'react';

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'active'
  | 'pending';

export type StatusBadgeSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant | string;
  size?: StatusBadgeSize | string;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  icon,
  className = '',
}) => {
  const getVariantStyles = (v: string) => {
    switch (v) {
      case 'success':
        return {
          container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
          dot: 'bg-emerald-500',
        };
      case 'warning':
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
          dot: 'bg-amber-500',
        };
      case 'error':
        return {
          container: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
          dot: 'bg-rose-500',
        };
      case 'active':
        return {
          container: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 font-bold',
          dot: 'bg-orange-500',
        };
      case 'info':
        return {
          container: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
          dot: 'bg-blue-500',
        };
      case 'pending':
        return {
          container: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
          dot: 'bg-purple-500',
        };
      default:
        return {
          container: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
          dot: 'bg-gray-400',
        };
    }
  };

  const getSizeStyles = (s: string) => {
    switch (s) {
      case 'sm':
        return 'text-[10px] px-1.5 py-0.5 gap-1';
      case 'lg':
        return 'text-xs px-3 py-1 gap-2';
      default:
        return 'text-[11px] px-2 py-0.5 gap-1.5';
    }
  };

  const style = getVariantStyles(variant);
  const sizeStyle = getSizeStyles(size);

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border font-sans select-none tracking-tight ${style.container} ${sizeStyle} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </span>
  );
};
