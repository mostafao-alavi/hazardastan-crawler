import React, { useState } from 'react';
import { SourceItem } from '../types/client';
import {
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  Tag,
  User,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  ExternalLink,
  Code2,
  Check,
  X,
  Sliders,
  Eye,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface LiveExtractionSandboxProps {
  sources: SourceItem[];
  selectedSourceId?: number;
  initialUrl?: string;
  onSaveSourceConfig?: (sourceId: number, config: any) => Promise<boolean>;
  onClose?: () => void;
}

export const LiveExtractionSandbox: React.FC<LiveExtractionSandboxProps> = ({
  sources,
  selectedSourceId,
  initialUrl = '',
  onSaveSourceConfig,
  onClose,
}) => {
  const [sourceId, setSourceId] = useState<number | ''>(selectedSourceId || (sources[0]?.id ?? ''));
  const [testUrl, setTestUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [activeView, setActiveView] = useState<'preview' | 'blocks' | 'images' | 'json'>('preview');
  const [isSaved, setIsSaved] = useState(false);

  // Custom Selector Overrides
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [titleSelector, setTitleSelector] = useState('');
  const [contentSelector, setContentSelector] = useState('article');
  const [authorSelector, setAuthorSelector] = useState('');
  const [publishedDateSelector, setPublishedDateSelector] = useState('');
  const [summarySelector, setSummarySelector] = useState('');
  const [tagsSelector, setTagsSelector] = useState('');
  const [removeSelectors, setRemoveSelectors] = useState('script, style, iframe, .ads, .social-share');

  // Update selectors when source selection changes
  const handleSourceChange = (newId: number | '') => {
    setSourceId(newId);
    if (newId) {
      const src = sources.find((s) => s.id === newId);
      if (src && src.selector) {
        setContentSelector(src.selector);
      }
    }
  };

  const handleExecuteTest = async () => {
    if (!testUrl.trim()) {
      setError('لطفاً آدرس URL یک مقاله را برای تست وارد کنید.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setIsSaved(false);

    try {
      const res = await fetch('/api/v1/extraction/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: testUrl.trim(),
          source_id: sourceId ? Number(sourceId) : undefined,
          config: {
            title_selector: titleSelector || undefined,
            content_selector: contentSelector || undefined,
            author_selector: authorSelector || undefined,
            published_date_selector: publishedDateSelector || undefined,
            summary_selector: summarySelector || undefined,
            tags_selector: tagsSelector || undefined,
            remove_selectors: removeSelectors.split(',').map((s) => s.trim()).filter(Boolean),
          },
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
      } else {
        setError(json.error || 'خطا در استخراج محتوا.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با موتور استخراج.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!sourceId || !onSaveSourceConfig) return;
    const configPayload = {
      title_selector: titleSelector || undefined,
      content_selector: contentSelector || undefined,
      author_selector: authorSelector || undefined,
      published_date_selector: publishedDateSelector || undefined,
      summary_selector: summarySelector || undefined,
      tags_selector: tagsSelector || undefined,
      remove_selectors: removeSelectors.split(',').map((s) => s.trim()).filter(Boolean),
    };
    const success = await onSaveSourceConfig(Number(sourceId), configPayload);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-600" />
              محیط زنده تست و اعتبارسنجی استخراج (Live Extraction Sandbox)
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              پیش از اجرای چرخه خزش، URL یک مقاله نمونه را وارد کنید تا صحت استخراج بلوک‌ها، تیتر، تاریخ و تصاویر را مشاهده و قوانین را ذخیره کنید.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="self-end sm:self-center text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              منبع خبری مرتبط (اختیاری)
            </label>
            <select
              value={sourceId}
              onChange={(e) => handleSourceChange(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="">-- بدون انتخاب منبع (تست آزاد) --</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.language?.toUpperCase() || 'EN'})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              آدرس URL مقاله نمونه برای تست استخراج <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://cointelegraph.com/news/bitcoin-etf-inflows-hit-record..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono ltr text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              onClick={handleExecuteTest}
              disabled={isLoading || !testUrl.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[42px]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال استخراج...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>تست استخراج</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selector Tuning Toggle */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="text-xs font-bold text-gray-600 hover:text-orange-600 flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-orange-500" />
            <span>تنظیم دستی سلکتورهای استخراج CSS</span>
            {showConfigDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {sourceId && onSaveSourceConfig && (
            <button
              onClick={handleSaveConfig}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSaved
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-600'
              }`}
            >
              {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'تنظیمات ذخیره شد' : 'ذخیره قوانین برای این منبع'}</span>
            </button>
          )}
        </div>

        {/* Selector Tuning Fields */}
        {showConfigDrawer && (
          <div className="mt-4 p-4 bg-gray-50/80 rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs animate-in fade-in">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Content Selector (بدنه مقاله)</label>
              <input
                type="text"
                value={contentSelector}
                onChange={(e) => setContentSelector(e.target.value)}
                placeholder="article, .post-content, .article__content"
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-800 ltr"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Title Selector (تیتر)</label>
              <input
                type="text"
                value={titleSelector}
                onChange={(e) => setTitleSelector(e.target.value)}
                placeholder="h1, .post-title, .article__title"
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-800 ltr"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Author Selector (نویسنده)</label>
              <input
                type="text"
                value={authorSelector}
                onChange={(e) => setAuthorSelector(e.target.value)}
                placeholder=".author-name, rel=author, [itemprop=author]"
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-800 ltr"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Date Selector (تاریخ انتشار)</label>
              <input
                type="text"
                value={publishedDateSelector}
                onChange={(e) => setPublishedDateSelector(e.target.value)}
                placeholder="time, [itemprop=datePublished], meta[name=pubdate]"
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-800 ltr"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Tags Selector (برچسب‌ها)</label>
              <input
                type="text"
                value={tagsSelector}
                onChange={(e) => setTagsSelector(e.target.value)}
                placeholder=".tags a, .article-tags span, [rel=tag]"
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-800 ltr"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Remove Selectors (حذف تبلیغات و زباله)</label>
              <input
                type="text"
                value={removeSelectors}
                onChange={(e) => setRemoveSelectors(e.target.value)}
                placeholder="script, style, iframe, .ads, .social-share"
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-800 ltr"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">خطا در پردازش و استخراج:</span>
            <p className="mt-1 font-mono text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Results Viewport */}
      {result && (
        <div className="space-y-4 animate-in fade-in">
          {/* Status & Validation Bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {result.validation?.isValid ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>✓ استخراج معتبر و استاندارد است (Quality Passed)</span>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>نیاز به بازبینی: {result.validation?.rejectionReason || 'عدم رعایت آستانه‌ها'}</span>
                </div>
              )}

              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>زمان پاسخ: {result.timing?.totalMs ?? result.totalExecutionTimeMs ?? 0} میلی‌ثانیه</span>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <span className="bg-gray-100 px-2.5 py-1 rounded-lg">
                کلمات: <strong className="text-gray-900">{result.metadata?.wordCount ?? 0}</strong>
              </span>
              <span className="bg-gray-100 px-2.5 py-1 rounded-lg">
                بلوک‌ها: <strong className="text-gray-900">{result.blocks?.length ?? 0}</strong>
              </span>
              <span className="bg-gray-100 px-2.5 py-1 rounded-lg">
                تصاویر: <strong className="text-gray-900">{result.images?.length ?? 0}</strong>
              </span>
            </div>
          </div>

          {/* Tab Selector for View Mode */}
          <div className="bg-white border border-gray-200 rounded-2xl p-2 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveView('preview')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'preview' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>پیش‌نمایش مقاله (Article Preview)</span>
              </button>
              <button
                onClick={() => setActiveView('blocks')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'blocks' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>بلوک‌های ساختاریافته ({result.blocks?.length ?? 0})</span>
              </button>
              <button
                onClick={() => setActiveView('images')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'images' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>تصاویر و متادیتا ({result.images?.length ?? 0})</span>
              </button>
              <button
                onClick={() => setActiveView('json')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'json' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Canonical JSON Schema</span>
              </button>
            </div>

            {sourceId && onSaveSourceConfig && (
              <button
                onClick={handleSaveConfig}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ استخراج صحیح است - ذخیره در تنظیمات منبع</span>
              </button>
            )}
          </div>

          {/* View 1: Article Preview */}
          {activeView === 'preview' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              {/* Featured Image */}
              {result.metadata?.featuredImage && (
                <div className="relative rounded-2xl overflow-hidden max-h-96 border border-gray-100 shadow-xs">
                  <img
                    src={result.metadata.featuredImage}
                    alt={result.metadata.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 right-3 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs">
                    تصویر شاخص (Featured Image)
                  </span>
                </div>
              )}

              {/* Title & Meta */}
              <div className="space-y-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight">
                  {result.metadata?.title || 'بدون تیتر'}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 border-b border-gray-100 pb-4">
                  {result.metadata?.author && (
                    <div className="flex items-center gap-1.5 font-medium text-gray-700">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>نویسنده: {result.metadata.author}</span>
                    </div>
                  )}

                  {result.metadata?.publishedAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>تاریخ انتشار: {result.metadata.publishedAt}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>{result.metadata?.wordCount ?? 0} کلمه (~{result.metadata?.readingTimeMin ?? 1} دقیقه خواندن)</span>
                  </div>

                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline flex items-center gap-1 ltr font-mono"
                  >
                    <span>لینک اصلی منبع</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Summary */}
              {result.metadata?.summary && (
                <div className="bg-orange-50/70 border-r-4 border-orange-500 p-4 rounded-xl text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
                  <span className="font-bold text-orange-900 block mb-1">خلاصه استخراج‌شده (Summary / Excerpt):</span>
                  {result.metadata.summary}
                </div>
              )}

              {/* Tags */}
              {result.metadata?.tags && result.metadata.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gray-400" /> برچسب‌ها:
                  </span>
                  {result.metadata.tags.map((t: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Cleaned Content Render */}
              <div className="prose max-w-none text-gray-800 text-sm sm:text-base leading-relaxed space-y-4 pt-4 border-t border-gray-100">
                {result.cleanedContent ? (
                  <div dangerouslySetInnerHTML={{ __html: result.cleanedContent }} />
                ) : (
                  <p className="text-gray-400 italic">محتوایی یافت نشد.</p>
                )}
              </div>
            </div>
          )}

          {/* View 2: Structured Blocks */}
          {activeView === 'blocks' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-600" />
                  لیست بلوک‌های ساختاریافته (Article Blocks Schema)
                </h3>
                <span className="text-xs text-gray-500">{result.blocks?.length ?? 0} بلوک تولید شد</span>
              </div>

              <div className="space-y-2.5">
                {result.blocks?.map((block: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex items-start gap-3 text-xs"
                  >
                    <span className="bg-gray-200 text-gray-700 font-mono font-bold px-2 py-0.5 rounded text-[11px] shrink-0">
                      #{block.order_index} [{block.block_type.toUpperCase()}]
                    </span>

                    <div className="flex-1 space-y-1 overflow-hidden">
                      {block.block_type === 'image' ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={block.media_url}
                            alt={block.media_alt || ''}
                            className="w-16 h-12 object-cover rounded-lg border border-gray-200"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-mono text-gray-600 truncate">{block.media_url}</p>
                            {block.media_caption && (
                              <p className="text-gray-500 italic mt-0.5">کپشن: {block.media_caption}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-800 leading-relaxed font-sans">{block.content_text}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View 3: Images Metadata */}
          {activeView === 'images' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-600" />
                متادیتای کامل تصاویر استخراج‌شده (Article Images Schema)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.images?.map((img: any, idx: number) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={img.url}
                        alt={img.alt_text || 'Extracted'}
                        className="w-24 h-20 object-cover rounded-lg border border-gray-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1 overflow-hidden">
                        <span className="bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          موقعیت #{img.position} ({img.role})
                        </span>
                        <p className="font-mono text-gray-500 truncate text-[11px] mt-1">{img.url}</p>
                        <p className="text-gray-700">
                          <strong>Alt:</strong> {img.alt_text || <span className="text-gray-400 font-italic">خالی</span>}
                        </p>
                        {img.caption && (
                          <p className="text-gray-600">
                            <strong>Caption:</strong> {img.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View 4: JSON Output */}
          {activeView === 'json' && (
            <div className="bg-gray-900 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-[600px] border border-gray-800">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
