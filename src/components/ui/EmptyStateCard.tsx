import React from 'react';
import { FileQuestion, Plus } from 'lucide-react';

export interface EmptyStateCardProps {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  id,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 shadow-xs">
        {icon || <FileQuestion className="w-7 h-7" />}
      </div>

      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white max-w-sm">
        {title}
      </h3>

      {description && (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-md">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer min-h-[42px]"
        >
          {actionIcon || <Plus className="w-4 h-4" />}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
