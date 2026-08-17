import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Layers,
  FileSpreadsheet,
  Globe,
  Radio,
  Workflow,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { ActivityTimelineItem } from '../../types/client';

interface ActivityStreamProps {
  activities: ActivityTimelineItem[];
  onViewAllLogs?: () => void;
}

export const ActivityStream: React.FC<ActivityStreamProps> = ({
  activities = [],
  onViewAllLogs,
}) => {
  const getTypeBadge = (type: ActivityTimelineItem['type']) => {
    switch (type) {
      case 'crawler':
        return { label: 'RSS Ingest', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'extract':
        return { label: 'Extraction', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'backup':
        return { label: 'Sheets Backup', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'queue':
        return { label: 'Queue Batch', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'System', bg: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const getStatusIcon = (status: ActivityTimelineItem['status']) => {
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

  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              رویدادهای زنده (Activity Timeline)
            </h3>
            <p className="text-xs text-gray-500">
              تاریخچه زمانی وظایف و لاگ‌های اجرا به سبک GitHub Actions
            </p>
          </div>
        </div>

        {onViewAllLogs && (
          <button
            onClick={onViewAllLogs}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>مشاهده همه لاگ‌ها</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Timeline Stream */}
      <div className="space-y-4 relative before:absolute before:inset-0 before:right-3.5 before:w-0.5 before:bg-gray-100 before:pointer-events-none">
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            هیچ رویدادی اخیراً ثبت نشده است.
          </div>
        ) : (
          activities.map((item) => {
            const badge = getTypeBadge(item.type);

            return (
              <div key={item.id} className="relative flex items-start gap-3.5 pr-1">
                {/* Status Dot */}
                <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 z-10 shadow-2xs">
                  {getStatusIcon(item.status)}
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-50/70 border border-gray-200/70 rounded-xl p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900">
                        {item.title}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-semibold ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400">
                      {item.time}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-gray-600 font-mono">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
