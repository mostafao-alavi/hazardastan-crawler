import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  FileQuestion,
  RotateCw,
} from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  id?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  keyField?: keyof T | ((row: T) => string | number);
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  headerActions?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  id,
  columns,
  data = [],
  keyField = 'id' as keyof T,
  isLoading = false,
  isError = false,
  errorMessage = 'خطایی در دریافت داده‌ها رخ داد.',
  onRetry,
  emptyTitle = 'داده‌ای برای نمایش وجود ندارد',
  emptyDescription = 'هیچ رکوردی در این جدول یافت نشد.',
  searchable = true,
  searchPlaceholder = 'جستجو در جدول...',
  searchKeys,
  pageSize = 10,
  onRowClick,
  headerActions,
  className = '',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter Data
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();

    return data.filter((row) => {
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some((k) => {
          const val = row[k as keyof T];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
        });
      }
      // Search across all string/number fields
      return Object.values(row).some((val) => {
        if (val === undefined || val === null) return false;
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(term);
        }
        return false;
      });
    });
  }, [data, searchTerm, searchKeys]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc'
        ? strA.localeCompare(strB, 'fa')
        : strB.localeCompare(strA, 'fa');
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination Data
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getRowKey = (row: T, index: number): string | number => {
    if (typeof keyField === 'function') return keyField(row);
    if (row[keyField] !== undefined) return row[keyField];
    return index;
  };

  return (
    <div
      id={id}
      className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Bar: Search & Actions */}
      {(searchable || headerActions) && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-gray-800/30">
          {searchable ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm rounded-xl pr-9 pl-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-sans"
              />
            </div>
          ) : <div />}

          {headerActions && (
            <div className="flex items-center gap-2 flex-wrap">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div className="overflow-x-auto min-h-[220px]">
        <table className="w-full text-right text-xs sm:text-sm border-collapse">
          {/* Table Header */}
          <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200/80 dark:border-gray-800">
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`py-3.5 px-4 select-none ${
                      col.sortable ? 'cursor-pointer hover:text-orange-600 dark:hover:text-orange-400' : ''
                    } ${col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'} ${col.className || ''}`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'center' ? 'justify-center' : col.align === 'left' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <ArrowUpDown
                          className={`w-3 h-3 transition-colors ${
                            isSorted
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-400 dark:text-gray-600'
                          }`}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {isLoading ? (
              // Loading State Skeletons
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/5" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isError ? (
              // Error State
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2">
                      <RotateCw className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {errorMessage}
                    </p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-3 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        تلاش مجدد
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mb-2">
                      <FileQuestion className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {emptyTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {emptyDescription}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              paginatedData.map((row, index) => (
                <tr
                  key={getRowKey(row, index)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 text-gray-800 dark:text-gray-200 ${
                        col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(row, index) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && !isError && sortedData.length > pageSize && (
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400 font-sans">
          <span>
            نمایش {(currentPage - 1) * pageSize + 1} تا{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} از{' '}
            {sortedData.length.toLocaleString('fa-IR')} رکورد
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              title="صفحه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="px-2 font-mono font-bold text-gray-700 dark:text-gray-300">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              title="صفحه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
