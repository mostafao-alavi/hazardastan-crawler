import React, { useState } from 'react';
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
  Info,
} from 'lucide-react';
import { PipelineStageItem, StageStatusType } from '../../types/client';

interface PipelineVisualizerProps {
  stages?: PipelineStageItem[];
  onSelectStage?: (stageId: string) => void;
}

const DEFAULT_STAGES: PipelineStageItem[] = [
  { id: 'source', label: 'SOURCE', status: 'completed', details: '۲۴ منبع فعال (RSS/Sitemap)' },
  { id: 'fetch', label: 'FETCH', status: 'completed', details: 'HTTP 200 OK (۲۴۰ms)' },
  { id: 'parse', label: 'PARSE', status: 'completed', details: 'پارس محتوای DOM و بلوک‌ها' },
  { id: 'clean', label: 'CLEAN', status: 'completed', details: 'حذف تبلیغات و نویز' },
  { id: 'extract', label: 'EXTRACT', status: 'active', details: 'استخراج متن و متادیتای تصویر' },
  { id: 'normalize', label: 'NORMALIZE', status: 'pending', details: 'یکپارچه‌سازی و اعتبارسنجی' },
  { id: 'store', label: 'STORE', status: 'pending', details: 'ذخیره در جدول‌های D1' },
  { id: 'backup', label: 'BACKUP', status: 'idle', details: 'بکاپ خودکار در Google Sheets' },
];

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({
  stages = DEFAULT_STAGES,
  onSelectStage,
}) => {
  const [activeStageId, setActiveStageId] = useState<string>('extract');

  const getStatusBadge = (status: StageStatusType) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          dot: 'bg-emerald-500',
          label: 'موفق',
        };
      case 'active':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-spin" />,
          bg: 'bg-orange-50 border-orange-200 text-orange-700 font-bold',
          dot: 'bg-orange-500 animate-ping',
          label: 'در حال پردازش',
        };
      case 'pending':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
          bg: 'bg-blue-50/60 border-blue-200 text-blue-700',
          dot: 'bg-blue-400',
          label: 'در صف',
        };
      default:
        return {
          icon: <div className="w-2 h-2 rounded-full bg-gray-300" />,
          bg: 'bg-gray-50 border-gray-200 text-gray-500',
          dot: 'bg-gray-300',
          label: 'آماده',
        };
    }
  };

  const getStageIcon = (id: string) => {
    switch (id) {
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

  const selectedStage = stages.find((s) => s.id === activeStageId) || stages[4];

  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs my-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-orange-500" />
            جریان پایپ‌لاین استخراج و پاکسازی (Crawler Pipeline)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            مسیر ۸ مرحله‌ای استاندارد بدون دخالت سرور خارجی بر بستر Cloudflare Edge
          </p>
        </div>
        <div className="text-xs font-mono text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/70 self-start sm:self-auto">
          Pipeline Flow: Strict 8-Stage Architecture
        </div>
      </div>

      {/* Horizontal Flow Diagram */}
      <div className="py-6 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[760px] justify-between">
          {stages.map((stage, idx) => {
            const badge = getStatusBadge(stage.status);
            const isCurrent = stage.id === activeStageId;
            const isLast = idx === stages.length - 1;

            return (
              <React.Fragment key={stage.id}>
                {/* Step Card */}
                <button
                  onClick={() => {
                    setActiveStageId(stage.id);
                    if (onSelectStage) onSelectStage(stage.id);
                  }}
                  className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-all cursor-pointer text-center relative ${
                    isCurrent
                      ? 'bg-orange-50/80 border-orange-400 shadow-sm ring-2 ring-orange-400/20'
                      : 'bg-white hover:bg-gray-50/90 border-gray-200/80'
                  }`}
                >
                  {/* Status Indicator Dot */}
                  <div className="flex items-center justify-between w-full mb-1.5 px-1">
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      0{idx + 1}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                      isCurrent ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {getStageIcon(stage.id)}
                  </div>

                  {/* Name */}
                  <span className="text-xs font-extrabold text-gray-900 font-mono tracking-tight">
                    {stage.label}
                  </span>

                  {/* Status Badge */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border mt-1.5 font-bold ${badge.bg}`}>
                    {badge.label}
                  </span>
                </button>

                {/* Arrow connector */}
                {!isLast && (
                  <div className="text-gray-300 px-0.5 shrink-0">
                    <ArrowLeft className="w-4 h-4 rtl:rotate-0" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detail panel for selected stage */}
      {selectedStage && (
        <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900">
                مرحله فعال: <span className="font-mono text-orange-600">{selectedStage.label}</span>
              </span>
              <p className="text-gray-600 mt-0.5">{selectedStage.details}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-[11px] text-gray-500">
            <span>Isolation: Pure Cloudflare Workers</span>
            <span>•</span>
            <span>Zero R2 dependencies</span>
          </div>
        </div>
      )}
    </div>
  );
};
