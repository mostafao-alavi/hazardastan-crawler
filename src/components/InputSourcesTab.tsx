import React, { useState } from 'react';
import { SourceItem } from '../types/client';
import { SourcesTab } from './SourcesTab';
import { Rss, FolderTree, Plus, Sparkles, Layers, Tag, CheckCircle2, Edit2, Trash2, Code2, Shield, Activity, Globe, PlayCircle } from 'lucide-react';
import { ScrapingRulesTab, ContentFilteringTab, SourceProfilingTab, SourceHealthTab } from './InputSourcesSubTabs';
import { LiveExtractionSandbox } from './LiveExtractionSandbox';

interface InputSourcesTabProps {
  sources: SourceItem[];
  loading: boolean;
  error?: boolean;
  onAddSource: (name: string, url: string, category?: string) => Promise<boolean>;
  onDeleteSource: (id: number) => void;
  onUpdateSource: (id: number, data: Partial<SourceItem>) => Promise<boolean>;
  onBulkDeleteSources: (ids: number[]) => Promise<boolean>;
  onBulkToggleStatus: (ids: number[], active: boolean) => Promise<boolean>;
  onScrapeSource: (id: number) => void;
  onTestFeed: (url: string) => Promise<any>;
  onRefresh: () => void;
  initialSubTab?: 'connectors' | 'sandbox' | 'scraping' | 'filtering' | 'profiling' | 'health';
}

export const InputSourcesTab: React.FC<InputSourcesTabProps> = ({
  sources,
  loading,
  error = false,
  onAddSource,
  onDeleteSource,
  onUpdateSource,
  onBulkDeleteSources,
  onBulkToggleStatus,
  onScrapeSource,
  onTestFeed,
  onRefresh,
  initialSubTab = 'connectors',
}) => {
  const [subTab, setSubTab] = useState<'connectors' | 'sandbox' | 'scraping' | 'filtering' | 'profiling' | 'health'>(initialSubTab);
  const [sandboxSourceId, setSandboxSourceId] = useState<number | undefined>(undefined);

  const handleSaveSourceConfig = async (sourceId: number, config: any): Promise<boolean> => {
    return await onUpdateSource(sourceId, { config } as any);
  };

  return (
    <div className="space-y-6">
      {/* Top Sub-Menu Selector */}
      <div className="bg-white border border-gray-200 rounded-2xl p-2 flex items-center gap-2 shadow-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSubTab('connectors')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'connectors'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>اتصال‌ها و فیدهای اختصاصی</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              subTab === 'connectors' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {sources.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('sandbox')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'sandbox'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>تست زنده استخراج (Sandbox)</span>
          </button>

          <button
            onClick={() => setSubTab('scraping')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'scraping'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>قوانین استخراج محتوا</span>
          </button>

          <button
            onClick={() => setSubTab('filtering')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'filtering'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>فیلترینگ و ممیزی ورودی</span>
          </button>

          <button
            onClick={() => setSubTab('profiling')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'profiling'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>دسته‌بندی و پروفایل منابع</span>
          </button>

          <button
            onClick={() => setSubTab('health')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'health'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>سلامت‌سنجی منابع</span>
          </button>
      </div>

      {/* Content Rendering Based on SubTab */}
      {subTab === 'connectors' && (
        <div className="animate-in fade-in">
           <SourcesTab
             sources={sources}
             loading={loading}
             error={error}
             onAddSource={onAddSource}
             onDeleteSource={onDeleteSource}
             onUpdateSource={onUpdateSource}
             onBulkDeleteSources={onBulkDeleteSources}
             onBulkToggleStatus={onBulkToggleStatus}
             onScrapeSource={onScrapeSource}
             onTestFeed={onTestFeed}
             onRefresh={onRefresh}
           />
        </div>
      )}

      {subTab === 'sandbox' && (
        <div className="animate-in fade-in">
          <LiveExtractionSandbox
            sources={sources}
            selectedSourceId={sandboxSourceId}
            onSaveSourceConfig={handleSaveSourceConfig}
          />
        </div>
      )}

      {subTab === 'scraping' && (
        <ScrapingRulesTab sources={sources} />
      )}

      {subTab === 'filtering' && (
        <ContentFilteringTab />
      )}

      {subTab === 'profiling' && (
        <SourceProfilingTab />
      )}

      {subTab === 'health' && (
        <SourceHealthTab sources={sources} />
      )}
    </div>
  );
};
