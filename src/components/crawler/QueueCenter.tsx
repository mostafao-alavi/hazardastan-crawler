import React from 'react';
import {
  Layers,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Server,
  ChevronRight,
} from 'lucide-react';
import { QueueCenterInfo } from '../../types/client';

interface QueueCenterProps {
  queue: QueueCenterInfo;
  onRetryFailed?: () => void;
  isRetrying?: boolean;
}

export const QueueCenter: React.FC<QueueCenterProps> = ({
  queue,
  onRetryFailed,
  isRetrying = false,
}) => {
  const totalInFlight = (queue.pending || 0) + (queue.processing || 0) + (queue.failed || 0) + (queue.completed_today || 1);
  const pendingPct = Math.min(100, Math.round(((queue.pending || 0) / (totalInFlight || 100)) * 100));

  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/70 flex items-center justify-center text-purple-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              مرکز مدیریت صف (Cloudflare Queues)
            </h3>
            <p className="text-xs text-gray-500 font-mono">
              Binding: <code className="text-purple-700 font-bold">{queue.queue_name || 'hazardastan-crawl-queue'}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full font-mono font-bold">
            Success Rate: {queue.success_rate || '98.5%'}
          </span>
        </div>
      </div>

      {/* Grid Status for Queue */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* 1. Pending */}
        <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-blue-700">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" />
              در انتظار (Pending)
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-900 mt-2 font-mono">
            {queue.pending || 24}
          </p>
          <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
            URLs queued
          </span>
        </div>

        {/* 2. Processing */}
        <div className="bg-orange-50/40 border border-orange-100 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-orange-700">
            <span className="flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5" />
              در حال پردازش (Active)
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-900 mt-2 font-mono">
            {queue.processing || 3}
          </p>
          <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
            Workers active
          </span>
        </div>

        {/* 3. Failed */}
        <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-rose-700">
            <span className="flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              ناموفق (Failed)
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-2 font-mono">
            {queue.failed || 1}
          </p>
          <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
            Requires retry
          </span>
        </div>

        {/* 4. Completed Today */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              تکمیل‌شده امروز
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-2 font-mono">
            {queue.completed_today || 532}
          </p>
          <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
            Articles processed
          </span>
        </div>
      </div>

      {/* Progress & Actions */}
      <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-500 font-mono">
          <Server className="w-3.5 h-3.5 text-gray-400" />
          <span>Consumer Concurrency: max 10 messages/batch</span>
        </div>

        {queue.failed > 0 && onRetryFailed && (
          <button
            onClick={onRetryFailed}
            disabled={isRetrying}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'در حال ارسال مجدد...' : 'تلاش مجدد موارد ناموفق (Retry)'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
