import React from 'react';
import {
  Workflow,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Database,
  FileCode,
  Filter,
  Sparkles,
  FileSpreadsheet,
  Globe,
  Radio,
  Layers,
  AlertCircle,
  Info,
} from 'lucide-react';
import { StatusBadge, StatusBadgeVariant } from './StatusBadge';

export type PipelineStageType =
  | 'source'
  | 'fetch'
  | 'parse'
  | 'clean'
  | 'extract'
  | 'normalize'
  | 'store'
  | 'backup'
  | string;

export type PipelineStepStatus =
  | 'completed'
  | 'active'
  | 'pending'
  | 'idle'
  | 'failed';

export interface PipelineStepItem {
  id: PipelineStageType;
  label: string;
  status: PipelineStepStatus;
  details: string;
  duration_ms?: number;
  items_count?: number;
}

export interface PipelineStepProps {
  id?: string;
  stages: PipelineStepItem[];
  activeStageId?: string;
  onSelectStage?: (stageId: string) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const PipelineStep: React.FC<PipelineStepProps> = ({
  id,
  stages,
  activeStageId,
  onSelectStage,
  title = 'جریان پایپ‌لاین استخراج و پاکسازی (Crawler Pipeline)',
  subtitle = 'مسیر ۸ مرحله‌ای استاندارد بدون سرور خارجی بر بستر Cloudflare Edge',
  className = '',
}) => {
  const [selectedId, setSelectedId] = React.useState<string>(
    activeStageId || (stages[4] ? stages[4].id : stages[0]?.id || 'extract')
  );

  React.useEffect(() => {
    if (activeStageId) {
      setSelectedId(activeStageId);
    }
  }, [activeStageId]);

  const getStatusBadge = (status: PipelineStepStatus) => {
    switch (status) {
      case 'completed':
        return {
          variant: 'success' as StatusBadgeVariant,
          label: 'موفق',
          dotClass: 'bg-emerald-500',
        };
      case 'active':
        return {
          variant: 'active' as StatusBadgeVariant,
          label: 'در حال پردازش',
          dotClass: 'bg-orange-500 animate-ping',
        };
      case 'pending':
        return {
          variant: 'pending' as StatusBadgeVariant,
          label: 'در صف',
          dotClass: 'bg-purple-400',
        };
      case 'failed':
        return {
          variant: 'error' as StatusBadgeVariant,
          label: 'خطا',
          dotClass: 'bg-rose-500',
        };
      default:
        return {
          variant: 'neutral' as StatusBadgeVariant,
          label: 'آماده',
          dotClass: 'bg-gray-300 dark:bg-gray-600',
        };
    }
  };

  const getStageIcon = (stageId: string) => {
    switch (stageId) {
      case 'source':
        return <Globe className="w-4 h-4" />;
      case 'fetch':
        return <Radio className="w-4 h-4" />;
      case 'parse':
        return <FileCode className="w-4 h-4" />;
      case 'clean':
        return <Filter className="w-4 h-4" />;
      case 'extract':
        return <Layers className="w-4 h-4" />;
      case 'normalize':
        return <Workflow className="w-4 h-4" />;
      case 'store':
        return <Database className="w-4 h-4" />;
      case 'backup':
        return <FileSpreadsheet className="w-4 h-4" />;
      default:
        return <Workflow className="w-4 h-4" />;
    }
  };

  const currentStage = stages.find((s) => s.id === selectedId) || stages[0];

  return (
    <div
      id={id}
      className={`bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xs ${className}`}
    >
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-5 h-5 text-orange-500" />
            {title}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </p>
        </div>
        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200/70 dark:border-gray-700 self-start sm:self-auto">
          Pipeline Flow: Strict 8-Stage Architecture
        </div>
      </div>

      {/* Horizontal Steps Diagram */}
      <div className="py-6 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[760px] justify-between">
          {stages.map((stage, idx) => {
            const badge = getStatusBadge(stage.status);
            const isCurrent = stage.id === selectedId;
            const isLast = idx === stages.length - 1;

            return (
              <React.Fragment key={stage.id}>
                {/* Step Card */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(stage.id);
                    if (onSelectStage) onSelectStage(stage.id);
                  }}
                  className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-all cursor-pointer text-center relative ${
                    isCurrent
                      ? 'bg-orange-50/90 dark:bg-orange-950/40 border-orange-400 dark:border-orange-500 shadow-sm ring-2 ring-orange-400/20'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-50/90 dark:hover:bg-gray-800 border-gray-200/80 dark:border-gray-800'
                  }`}
                >
                  {/* Status Indicator Dot */}
                  <div className="flex items-center justify-between w-full mb-1.5 px-1">
                    <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500">
                      0{idx + 1}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${badge.dotClass}`} />
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                      isCurrent
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {getStageIcon(stage.id)}
                  </div>

                  {/* Name */}
                  <span className="text-xs font-extrabold text-gray-900 dark:text-gray-100 font-mono tracking-tight">
                    {stage.label}
                  </span>

                  {/* Status Badge */}
                  <div className="mt-1.5">
                    <StatusBadge
                      label={badge.label}
                      variant={badge.variant}
                      size="sm"
                    />
                  </div>
                </button>

                {/* Arrow connector */}
                {!isLast && (
                  <div className="text-gray-300 dark:text-gray-700 px-0.5 shrink-0">
                    <ArrowLeft className="w-4 h-4 rtl:rotate-0" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detail panel for selected stage */}
      {currentStage && (
        <div className="bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900 dark:text-white">
                مرحله انتخابی: <span className="font-mono text-orange-600 dark:text-orange-400">{currentStage.label}</span>
              </span>
              <p className="text-gray-600 dark:text-gray-300 mt-0.5">{currentStage.details}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-[11px] text-gray-500 dark:text-gray-400">
            <span>Isolation: Pure Cloudflare Workers</span>
            <span>•</span>
            <span>Zero R2 Dependencies</span>
          </div>
        </div>
      )}
    </div>
  );
};
