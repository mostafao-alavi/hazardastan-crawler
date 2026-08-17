import React, { useState, useEffect } from 'react';
import {
  Activity,
  RotateCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Database,
  ArrowDownCircle,
  Timer,
  RefreshCw,
} from 'lucide-react';
import { SourceItem } from '../types/client';

interface CrawlJob {
  id: number;
  source_id: number;
  source_name?: string;
  source_url?: string;
  source_language?: string;
  trigger_type: string;
  mode: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  items_discovered: number;
  items_crawled: number;
  items_validated: number;
  items_rejected: number;
  items_saved: number;
  duration_ms: number;
  started_at: string;
  finished_at?: string;
}

interface CrawlCheckpoint {
  source_id: number;
  source_name?: string;
  source_url?: string;
  job_id?: number;
  mode: string;
  current_page_number: number;
  consecutive_errors: number;
  health_status: 'healthy' | 'degraded' | 'failing';
  is_completed: number;
  last_crawled_at?: string;
  updated_at: string;
}

interface CrawlError {
  id: number;
  source_id: number;
  source_name?: string;
  job_id?: number;
  url: string;
  error_stage: string;
  error_type: string;
  error_message: string;
  retry_count: number;
  occurred_at: string;
}

interface CrawlJobsTabProps {
  sources: SourceItem[];
  onTriggerCrawl?: (sourceId: number, mode?: string) => Promise<any>;
}

export const CrawlJobsTab: React.FC<CrawlJobsTabProps> = ({ sources, onTriggerCrawl }) => {
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [checkpoints, setCheckpoints] = useState<CrawlCheckpoint[]>([]);
  const [errors, setErrors] = useState<CrawlError[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'jobs' | 'checkpoints' | 'errors'>('jobs');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('continuous');
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState<string | null>(null);

  const fetchCrawlData = async () => {
    setIsLoading(true);
    try {
      const [jobsRes, cpRes, errRes] = await Promise.all([
        fetch('/api/crawl/jobs').then((r) => r.json()),
        fetch('/api/crawl/checkpoints').then((r) => r.json()),
        fetch('/api/crawl/errors').then((r) => r.json()),
      ]);

      if (jobsRes.success && jobsRes.data) setJobs(jobsRes.data);
      if (cpRes.success && cpRes.data) setCheckpoints(cpRes.data);
      if (errRes.success && errRes.data) setErrors(errRes.data);
    } catch (err) {
      console.error('Failed to load crawl jobs and checkpoints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCrawlData();
    const interval = setInterval(fetchCrawlData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStartManualCrawl = async () => {
    if (!selectedSourceId) return;
    setIsTriggering(true);
    setTriggerSuccess(null);

    try {
      const res = await fetch('/api/crawl/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: Number(selectedSourceId),
          mode: selectedMode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTriggerSuccess(
          `خزش منبع "${json.data?.sourceName}" شروع شد (کشف: ${json.data?.discoveredCount} مقاله)`
        );
        fetchCrawlData();
        setTimeout(() => setTriggerSuccess(null), 5000);
      }
    } catch (e: any) {
      console.error('Error triggering crawl:', e);
    } finally {
      setIsTriggering(false);
    }
  };

  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const runningJobs = jobs.filter((j) => j.status === 'running').length;
  const totalSaved = jobs.reduce((acc, j) => acc + (j.items_saved || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Quick Trigger */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  مدیریت و مانیتورینگ پردازش‌های خزش (Crawl Jobs & Resume Engine)
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  ردیابی صف‌های خزش، وضعیت Checkpointها، بازیابی پس از خطا و اعتبارسنجی مقالات در لایه D1 Core.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center">
            <button
              onClick={fetchCrawlData}
              disabled={isLoading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی داده‌ها</span>
            </button>
          </div>
        </div>

        {/* Quick Trigger Form */}
        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              منبع هدف برای اجرای خزش آنی
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="">-- انتخاب یک منبع خبری --</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.language?.toUpperCase() || 'EN'}) - {s.is_active ? 'فعال' : 'غیرفعال'}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              حالت خزش (Crawl Mode)
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="continuous">پایش مداوم (Continuous Monitoring)</option>
              <option value="backfill">بک‌فیل آرشیو از ابتدا تا کنون (Backfill)</option>
              <option value="single">تک‌چرخه اکتشاف (Single Discovery Run)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              onClick={handleStartManualCrawl}
              disabled={isTriggering || !selectedSourceId}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[40px]"
            >
              {isTriggering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال ارسال...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>اجرای خزش (Queue / Run)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {triggerSuccess && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{triggerSuccess}</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1 font-medium">
            <span>کل عملیات‌ها</span>
            <Database className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900">{jobs.length}</p>
          <span className="text-[11px] text-gray-400 mt-1 block">{completedJobs} تکمیل شده</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1 font-medium">
            <span>در حال اجرا</span>
            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600">{runningJobs}</p>
          <span className="text-[11px] text-gray-400 mt-1 block">صف و ورکر فعال</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1 font-medium">
            <span>مقالات ذخیره‌شده</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600">{totalSaved}</p>
          <span className="text-[11px] text-gray-400 mt-1 block">در جدول articles D1</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1 font-medium">
            <span>خطاهای لاگ‌شده</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-600">{errors.length}</p>
          <span className="text-[11px] text-gray-400 mt-1 block">در crawl_errors</span>
        </div>
      </div>

      {/* SubTabs Menu */}
      <div className="bg-white border border-gray-200 rounded-2xl p-1.5 flex items-center gap-1 shadow-xs">
        <button
          onClick={() => setActiveSubTab('jobs')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'jobs' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>تاریخچه اجراها (Crawl Jobs) ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('checkpoints')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'checkpoints' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>نشانگرها و وضعیت سلامت (Checkpoints) ({checkpoints.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('errors')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'errors' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>تشخیص خطا و بازیابی (Crawl Errors) ({errors.length})</span>
        </button>
      </div>

      {/* SubTab 1: Crawl Jobs List */}
      {activeSubTab === 'jobs' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                <tr>
                  <th className="p-3.5">شناسه / منبع</th>
                  <th className="p-3.5">نوع تریگر</th>
                  <th className="p-3.5">حالت</th>
                  <th className="p-3.5">وضعیت</th>
                  <th className="p-3.5 text-center">کشف</th>
                  <th className="p-3.5 text-center">خزش</th>
                  <th className="p-3.5 text-center">معتبر</th>
                  <th className="p-3.5 text-center">رد شده</th>
                  <th className="p-3.5 text-center">ذخیره</th>
                  <th className="p-3.5">مدت زمان</th>
                  <th className="p-3.5">زمان شروع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-400">
                      هنوز هیچ عملیات خزشی ثبت نشده است. از دکمه «اجرای خزش» استفاده کنید.
                    </td>
                  </tr>
                ) : (
                  jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3.5 font-medium">
                        <div className="font-bold text-gray-900">
                          #{j.id} - {j.source_name || `Source #${j.source_id}`}
                        </div>
                        {j.source_url && (
                          <div className="text-[11px] text-gray-400 font-mono truncate max-w-xs ltr">
                            {j.source_url}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          {j.trigger_type}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600">{j.mode}</td>
                      <td className="p-3.5">
                        {j.status === 'completed' && (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                            تکمیل
                          </span>
                        )}
                        {j.status === 'running' && (
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[11px] animate-pulse">
                            در حال اجرا
                          </span>
                        )}
                        {j.status === 'failed' && (
                          <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                            ناموفق
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold">{j.items_discovered}</td>
                      <td className="p-3.5 text-center">{j.items_crawled}</td>
                      <td className="p-3.5 text-center text-emerald-600 font-bold">{j.items_validated}</td>
                      <td className="p-3.5 text-center text-rose-600">{j.items_rejected}</td>
                      <td className="p-3.5 text-center font-bold text-orange-600">{j.items_saved}</td>
                      <td className="p-3.5 font-mono text-gray-500">
                        {j.duration_ms ? `${j.duration_ms}ms` : '-'}
                      </td>
                      <td className="p-3.5 text-gray-500 font-mono text-[11px]">{j.started_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 2: Checkpoints & Health */}
      {activeSubTab === 'checkpoints' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {checkpoints.length === 0 ? (
            <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400">
              چک‌پوینتی برای منابع ثبت نشده است.
            </div>
          ) : (
            checkpoints.map((cp) => (
              <div
                key={cp.source_id}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      {cp.source_name || `Source #${cp.source_id}`}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono truncate max-w-xs ltr mt-0.5">
                      {cp.source_url}
                    </p>
                  </div>
                  <div>
                    {cp.health_status === 'healthy' && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> سالم (Healthy)
                      </span>
                    )}
                    {cp.health_status === 'degraded' && (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-600" /> افت کیفیت (Degraded)
                      </span>
                    )}
                    {cp.health_status === 'failing' && (
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" /> دارای خطا (Failing)
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>حالت پردازش:</span>
                    <strong className="text-gray-900 font-mono">{cp.mode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>خطاهای متوالی:</span>
                    <strong
                      className={
                        cp.consecutive_errors > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'
                      }
                    >
                      {cp.consecutive_errors}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>آخرین خزش موفق:</span>
                    <span className="font-mono text-[11px] text-gray-700">
                      {cp.last_crawled_at || 'ثبت نشده'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>بروزرسانی وضعیت:</span>
                    <span className="font-mono text-[11px] text-gray-500">{cp.updated_at}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SubTab 3: Error Diagnostics */}
      {activeSubTab === 'errors' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                <tr>
                  <th className="p-3.5">منبع</th>
                  <th className="p-3.5">مرحله خطا (Stage)</th>
                  <th className="p-3.5">نوع خطا</th>
                  <th className="p-3.5">پیام و جزئیات</th>
                  <th className="p-3.5">URL هدف</th>
                  <th className="p-3.5">تلاش مجدد</th>
                  <th className="p-3.5">زمان رخداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {errors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-emerald-600 font-medium">
                      ✓ هیچ خطای ثبت‌شده‌ای در جدول crawl_errors وجود ندارد. تمامی خطوط لوله پایدار هستند.
                    </td>
                  </tr>
                ) : (
                  errors.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900">
                        {e.source_name || `Source #${e.source_id}`}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-rose-100 text-rose-800 font-mono px-2 py-0.5 rounded text-[11px]">
                          {e.error_stage}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-gray-700">{e.error_type}</td>
                      <td className="p-3.5 text-gray-700 max-w-sm">{e.error_message}</td>
                      <td className="p-3.5 font-mono text-[11px] text-gray-500 max-w-xs truncate ltr">
                        {e.url}
                      </td>
                      <td className="p-3.5 text-center font-bold">{e.retry_count}</td>
                      <td className="p-3.5 text-gray-500 font-mono text-[11px]">{e.occurred_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
