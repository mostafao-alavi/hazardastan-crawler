import React from 'react';

export interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  variant?: 'text' | 'card' | 'table' | 'metrics';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  className = '',
  variant = 'text',
}) => {
  if (variant === 'metrics') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-12" />
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-28 mb-3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-36" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-5 shadow-xs animate-pulse space-y-4 ${className}`}
      >
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, idx) => (
            <div
              key={idx}
              className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded"
              style={{ width: `${100 - idx * 15}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-4 shadow-xs animate-pulse space-y-3 ${className}`}
      >
        <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl w-full" />
        {Array.from({ length: lines }).map((_, idx) => (
          <div key={idx} className="h-10 bg-gray-50 dark:bg-gray-850 rounded-xl w-full flex items-center justify-between px-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/6" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded"
          style={{ width: `${100 - idx * 12}%` }}
        />
      ))}
    </div>
  );
};
