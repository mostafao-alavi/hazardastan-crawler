import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  ArrowRight,
  Database,
  Bot,
  Zap,
  Lock,
} from 'lucide-react';
import { MetricCard, StatusBadge, EmptyStateCard } from './ui';

export const AITab: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');

  return (
    <div className="space-y-6">
      {/* Information Header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                پردازش هوشمند و آماده‌سازی پایپ‌لاین (AI & Pipeline Readiness)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                آماده‌سازی ساختار داده‌های استخراج شده برای پردازشگرهای آینده (ترجمه هوشمند، تلگرام و انتشار)
              </p>
            </div>
          </div>

          <StatusBadge
            label="فاز ۲ • در حال آماده‌سازی معماری"
            variant="warning"
            dot
            size="md"
          />
        </div>

        {/* Architecture Note */}
        <div className="mt-4 p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-200/70 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          <span className="font-bold text-gray-900 dark:text-white">قانون فنی فاز جاری (MVP):</span>{' '}
          موتور خزش و استخراج داده‌های ساختاریافته (D1 & Sheets Backup) با ایزولاسیون کامل از ماژول‌های سنگین هوش مصنوعی در لایه Worker عمل می‌کند تا کارایی Edge به حداکثر برسد.
        </div>
      </div>

      {/* Readiness Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="مقالات آماده پردازش در D1"
          value="۵,۴۲۰"
          badgeText="NORMALIZED"
          badgeVariant="success"
          footerText="بلوک‌های متن و متادیتای تصاویر تمیز"
          icon={<Database className="w-4 h-4 text-emerald-500" />}
        />
        <MetricCard
          title="مدل پردازش پیش‌فرض"
          value="Gemini 2.0 Flash"
          badgeText="CONFIGURED"
          badgeVariant="info"
          footerText="تعریف‌شده در متغیرهای محیطی لبه"
          icon={<Bot className="w-4 h-4 text-blue-500" />}
        />
        <MetricCard
          title="وضعیت صف پردازشگر (AI Queue)"
          value="آماده‌به‌کار (Standby)"
          badgeText="SPRINT 2"
          badgeVariant="neutral"
          footerText="اتصال به Cloudflare Queues"
          icon={<Workflow className="w-4 h-4 text-purple-500" />}
        />
      </div>

      {/* Model & Prompt Configuration Preview */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
          پیکربندی پرامپت‌ها و نگاشت داده‌های ورودی
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              مدل هوش مصنوعی انتخابی
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full sm:w-80 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm rounded-xl px-3 py-2 outline-none focus:border-orange-500 font-sans"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (سریع و اقتصادی)</option>
              <option value="gemini-2.0-pro">Gemini 2.0 Pro (دقت نگارش بالا)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              سیستم پرامپت استاندارد ترجمه و بومی‌سازی اخبار
            </label>
            <textarea
              readOnly
              rows={4}
              value={`نقش شما: مترجم و سردبیر ارشد خبر فارسی.
دستورالعمل: متن ورودی را با حفظ صحت اصطلاحات تخصصی، لحن رسمی، روان و جذاب ترجمه کنید.
خروجی: صرفاً ساختار JSON شامل translated_title، translated_content و summary.`}
              className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-xl p-3 font-mono outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
