import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar, MainAppTab } from './Navbar';
import { AppHeader } from './layout/AppHeader';
import { AppSidebar } from './layout/AppSidebar';
import { DashboardTab } from './DashboardTab';
import { CrawlerTab } from './CrawlerTab';
import { InputSourcesTab } from './InputSourcesTab';
import { ContentDeskTab } from './ContentDeskTab';
import { AITab } from './AITab';
import { DestinationsTab } from './DestinationsTab';
import { ReportsLogsTab } from './ReportsLogsTab';
import { SystemAISettingsTab } from './SystemAISettingsTab';
import { JoinedArticleNews, SourceItem, StatsData, WorkerFileInfo } from '../types/client';

export const AppDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = (): MainAppTab => {
    const path = location.pathname.toLowerCase();
    if (path.includes('crawler') || path.includes('jobs') || path.includes('checkpoints')) return 'crawler';
    if (path.includes('sources') || path.includes('rss') || path.includes('categories')) return 'sources';
    if (path.includes('content') || path.includes('news') || path.includes('desk') || path.includes('pending') || path.includes('review') || path.includes('archive')) return 'content';
    if (path.includes('ai') || path.includes('gemini') || path.includes('prompts')) return 'ai';
    if (path.includes('system') || path.includes('settings') || path.includes('d1') || path.includes('database') || path.includes('users')) return 'system';
    if (path.includes('destinations') || path.includes('wordpress') || path.includes('wp') || path.includes('social') || path.includes('api') || path.includes('sheets') || path.includes('backup')) return 'destinations';
    if (path.includes('reports') || path.includes('analytics') || path.includes('logs') || path.includes('distributions')) return 'reports';
    return 'dashboard';
  };

  const getSubTabFromPath = (): string | undefined => {
    const path = location.pathname.toLowerCase();
    if (path.includes('crawler/jobs') || path.includes('/jobs')) return 'jobs';
    if (path.includes('crawler/queue') || path.includes('/queue')) return 'queue';
    if (path.includes('crawler/checkpoints') || path.includes('/checkpoints')) return 'checkpoints';
    if (path.includes('crawler/schedules') || path.includes('/schedules')) return 'schedules';
    if (path.includes('crawler/sandbox') || path.includes('/sandbox')) return 'sandbox';
    if (path.includes('sheets') || path.includes('backup')) return 'sheets';
    return undefined;
  };

  const [activeTab, setActiveTabState] = useState<MainAppTab>(getTabFromPath);
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(getSubTabFromPath);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setActiveTabState(getTabFromPath());
    const sub = getSubTabFromPath();
    if (sub) setActiveSubTab(sub);
  }, [location.pathname]);

  const handleNavigateTab = (tab: MainAppTab, subTab?: string) => {
    setActiveTabState(tab);
    if (subTab) {
      setActiveSubTab(subTab);
      navigate(`/app/${tab}/${subTab}`);
    } else {
      navigate(`/app/${tab}`);
    }
  };

  const [news, setNews] = useState<JoinedArticleNews[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);

  const [loadingNews, setLoadingNews] = useState<boolean>(true);
  const [loadingSources, setLoadingSources] = useState<boolean>(true);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  const [newsError, setNewsError] = useState<boolean>(false);
  const [sourcesError, setSourcesError] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<boolean>(false);

  const [isTriggeringScraper, setIsTriggeringScraper] = useState<boolean>(false);
  const [isTriggeringTranslator, setIsTriggeringTranslator] = useState<boolean>(false);

  const [workerFiles] = useState<WorkerFileInfo[]>([
    { filename: 'wrangler.toml', language: 'toml', path: '/wrangler.toml' },
    { filename: 'src/types.ts', language: 'typescript', path: '/src/types.ts' },
    { filename: 'src/api/routes.ts', language: 'typescript', path: '/src/api/routes.ts' },
    { filename: 'src/cron/scraper.ts', language: 'typescript', path: '/src/cron/scraper.ts' },
    { filename: 'src/cron/translator.ts', language: 'typescript', path: '/src/cron/translator.ts' },
    { filename: 'src/index.ts', language: 'typescript', path: '/src/index.ts' },
  ]);

  // Fetch News from GET /api/v1/news
  const fetchNews = async () => {
    setLoadingNews(true);
    setNewsError(false);
    try {
      const res = await fetch('/api/v1/news');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setNews(json.data);
          setNewsError(false);
        } else {
          setNewsError(true);
        }
      } else {
        setNewsError(true);
      }
    } catch (e) {
      console.error('Error fetching news:', e);
      setNewsError(true);
    } finally {
      setLoadingNews(false);
    }
  };

  // Fetch Sources from GET /api/v1/sources
  const fetchSources = async () => {
    setLoadingSources(true);
    setSourcesError(false);
    try {
      const res = await fetch('/api/v1/sources');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSources(json.data);
          setSourcesError(false);
        } else {
          setSourcesError(true);
        }
      } else {
        setSourcesError(true);
      }
    } catch (e) {
      console.error('Error fetching sources:', e);
      setSourcesError(true);
    } finally {
      setLoadingSources(false);
    }
  };

  // Fetch Stats from GET /api/v1/stats
  const fetchStats = async (isPoll: boolean = false) => {
    if (!isPoll) setLoadingStats(true);
    try {
      const res = await fetch('/api/v1/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
          setStatsError(false);
        } else {
          if (!isPoll) setStatsError(true);
        }
      } else {
        if (!isPoll) setStatsError(true);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
      if (!isPoll) setStatsError(true);
    } finally {
      if (!isPoll) setLoadingStats(false);
    }
  };

  const refreshAllData = () => {
    fetchNews();
    fetchSources();
    fetchStats();
  };

  useEffect(() => {
    refreshAllData();
    
    // Live polling for stats
    const statsInterval = setInterval(() => {
      fetchStats(true);
    }, 10000);

    return () => clearInterval(statsInterval);
  }, []);

  // Handlers
  const handleTriggerScraper = async () => {
    setIsTriggeringScraper(true);
    try {
      const res = await fetch('/api/v1/trigger-scraper', { method: 'POST' });
      if (res.ok) {
        refreshAllData();
      }
    } catch (e) {
      console.error('Error triggering scraper:', e);
    } finally {
      setIsTriggeringScraper(false);
    }
  };

  const handleTriggerTranslator = async () => {
    setIsTriggeringTranslator(true);
    try {
      const res = await fetch('/api/v1/trigger-translator', { method: 'POST' });
      if (res.ok) {
        refreshAllData();
      }
    } catch (e) {
      console.error('Error triggering translator:', e);
    } finally {
      setIsTriggeringTranslator(false);
    }
  };

  const handleTranslateArticle = async (id: number, model?: string) => {
    try {
      const res = await fetch(`/api/v1/news/${id}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      const data = await res.json();
      if (data.success) {
        fetchNews();
        fetchStats();
        return data.data;
      }
    } catch (e) {
      console.error(`Error translating article ${id}:`, e);
    }
    return null;
  };

  const handleDeleteArticle = async (id: number) => {
    if (!window.confirm('آیا از حذف این خبر اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/v1/news/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNews((prev) => prev.filter((n) => n.id !== id));
        fetchStats();
      }
    } catch (e) {
      console.error(`Error deleting article ${id}:`, e);
    }
  };

  const handleCreateCustomArticle = async (title: string, content: string, model?: string) => {
    try {
      const res = await fetch('/api/v1/news/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, model }),
      });
      const data = await res.json();
      if (data.success) {
        refreshAllData();
        return true;
      }
    } catch (e) {
      console.error('Error creating custom article:', e);
    }
    return false;
  };

  const handleAddSource = async (name: string, url: string, category?: string) => {
    try {
      const res = await fetch('/api/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, category }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSources();
        fetchStats();
        return true;
      }
    } catch (e) {
      console.error('Error adding source:', e);
    }
    return false;
  };

  const handleDeleteSource = async (id: number) => {
    if (!window.confirm('آیا از حذف این منبع خبری اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/v1/sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
        fetchStats();
      }
    } catch (e) {
      console.error(`Error deleting source ${id}:`, e);
    }
  };

  const handleUpdateSource = async (id: number, data: Partial<SourceItem>) => {
    try {
      const res = await fetch(`/api/v1/sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        fetchSources();
        return true;
      }
    } catch (e) {
      console.error(`Error updating source ${id}:`, e);
    }
    return false;
  };

  const handleBulkDeleteSources = async (ids: number[]) => {
    if (!window.confirm(`آیا از حذف گروهی ${ids.length} منبع خبر اطمینان دارید؟`)) return false;
    try {
      const res = await fetch('/api/v1/sources/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSources();
        fetchStats();
        return true;
      }
    } catch (e) {
      console.error('Error bulk deleting sources:', e);
    }
    return false;
  };

  const handleBulkToggleStatus = async (ids: number[], active: boolean) => {
    try {
      const res = await fetch('/api/v1/sources/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, is_active: active }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSources();
        return true;
      }
    } catch (e) {
      console.error('Error bulk toggling status:', e);
    }
    return false;
  };

  const handleScrapeSource = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/sources/${id}/scrape`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        refreshAllData();
      }
    } catch (e) {
      console.error(`Error scraping source ${id}:`, e);
    }
  };

  const handleTestFeed = async (url: string) => {
    try {
      const res = await fetch('/api/v1/sources/test-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
      return { isValid: false, errorDetails: json.error || 'خطا در بررسی فید' };
    } catch (e) {
      console.error('Error testing feed:', e);
      return { isValid: false, errorDetails: 'خطا در ارتباط با سرور' };
    }
  };

  const handleResetDatabase = async (options: {
    clearSources?: boolean;
    clearArticles?: boolean;
    clearTranslations?: boolean;
    clearApprovedTranslations?: boolean;
    clearPendingTranslations?: boolean;
    clearLogs?: boolean;
    target?: string;
    reseed?: boolean;
  }) => {
    try {
      const res = await fetch('/api/v1/database/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      const json = await res.json();
      if (json.success) {
        refreshAllData();
        return json.data;
      }
    } catch (e) {
      console.error('Error resetting database:', e);
    }
    return null;
  };

  const pendingCount = news.filter((n) => n.translation_status === 'pending' || !n.translated_title).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 dir-rtl font-sans antialiased selection:bg-orange-500 selection:text-white transition-colors flex flex-col">
      {/* Top Operations Header */}
      <AppHeader
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onRefreshAll={refreshAllData}
        isRefreshing={loadingNews || loadingSources || loadingStats}
        onTriggerScraper={handleTriggerScraper}
        isTriggeringScraper={isTriggeringScraper}
        onOpenSettings={() => handleNavigateTab('system')}
        errorCount={stats?.errors_count || 1}
      />

      {/* Main Layout: Sidebar + Operations Canvas */}
      <div className="flex-1 flex w-full">
        {/* Cloudflare Operations Sidebar */}
        <AppSidebar
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onNavigate={handleNavigateTab}
          pendingCount={pendingCount}
          errorCount={stats?.errors_count || 1}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-y-auto">
          {/* Route 1: /app/dashboard (پیشخوان عملیات خزش) */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              stats={stats}
              loadingStats={loadingStats}
              statsError={statsError}
              onRetryStats={() => fetchStats(false)}
              onRefreshAll={refreshAllData}
              news={news}
              sources={sources}
              onTriggerScraper={handleTriggerScraper}
              onTriggerTranslator={handleTriggerTranslator}
              onNavigateTab={handleNavigateTab}
              isTriggeringScraper={isTriggeringScraper}
              isTriggeringTranslator={isTriggeringTranslator}
              onTranslateArticle={handleTranslateArticle}
            />
          )}

          {/* Route 2: /app/crawler (موتور خزش، جاب‌ها و چک‌پوینت‌ها) */}
          {activeTab === 'crawler' && (
            <CrawlerTab
              sources={sources}
              stats={stats}
              onTriggerScraper={handleTriggerScraper}
              isTriggeringScraper={isTriggeringScraper}
              onRefreshAll={refreshAllData}
              initialSubTab={(activeSubTab as any) || 'overview'}
            />
          )}

          {/* Route 3: /app/sources (منابع ورودی و قوانین استخراج) */}
          {activeTab === 'sources' && (
            <InputSourcesTab
              sources={sources}
              loading={loadingSources}
              error={sourcesError}
              onAddSource={handleAddSource}
              onDeleteSource={handleDeleteSource}
              onUpdateSource={handleUpdateSource}
              onBulkDeleteSources={handleBulkDeleteSources}
              onBulkToggleStatus={handleBulkToggleStatus}
              onScrapeSource={handleScrapeSource}
              onTestFeed={handleTestFeed}
              onRefresh={fetchSources}
              initialSubTab={(activeSubTab as any) || 'connectors'}
            />
          )}

          {/* Route 4: /app/content (میز کار محتوا و مقالات ساختاریافته) */}
          {(activeTab === 'content' || activeTab === 'content-desk') && (
            <ContentDeskTab
              news={news}
              loading={loadingNews}
              error={newsError}
              onRefresh={fetchNews}
              onTriggerScraper={handleTriggerScraper}
              onTriggerTranslator={handleTriggerTranslator}
              onTranslateArticle={handleTranslateArticle}
              onDeleteArticle={handleDeleteArticle}
              onCreateCustomArticle={handleCreateCustomArticle}
              isTriggeringScraper={isTriggeringScraper}
              isTriggeringTranslator={isTriggeringTranslator}
              onNavigateTab={handleNavigateTab}
              initialSubTab={(activeSubTab as any) || 'queue'}
            />
          )}

          {/* Route 5: /app/ai (آماده‌سازی هوش مصنوعی و مدل‌ها) */}
          {activeTab === 'ai' && (
            <AITab />
          )}

          {/* Route 6: /app/system (زیرساخت، D1، KV، شیت‌ها و تنظیمات) */}
          {(activeTab === 'system' || activeTab === 'settings') && (
            <SystemAISettingsTab
              onTriggerScraper={handleTriggerScraper}
              onTriggerTranslator={handleTriggerTranslator}
              onResetDatabase={handleResetDatabase}
              isTriggeringScraper={isTriggeringScraper}
              isTriggeringTranslator={isTriggeringTranslator}
              workerFiles={workerFiles}
              sources={sources}
              news={news}
              stats={stats}
              onRefreshAll={refreshAllData}
              onAddSource={handleAddSource}
              onUpdateSource={handleUpdateSource}
              onDeleteSource={handleDeleteSource}
              onDeleteArticle={handleDeleteArticle}
              initialSubTab={(activeSubTab as any) || 'engine'}
            />
          )}

          {/* Deep link routes for full backward compatibility */}
          {activeTab === 'destinations' && (
            <DestinationsTab
              onRefreshAll={refreshAllData}
              initialSubTab={(activeSubTab as any) || 'wordpress'}
            />
          )}

          {(activeTab === 'reports' || activeTab === 'analytics') && (
            <ReportsLogsTab
              onTriggerScraper={handleTriggerScraper}
              onTriggerTranslator={handleTriggerTranslator}
              onResetDatabase={handleResetDatabase}
              isTriggeringScraper={isTriggeringScraper}
              isTriggeringTranslator={isTriggeringTranslator}
              workerFiles={workerFiles}
              initialSubTab={(activeSubTab as any) || 'tracing'}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-4 text-center text-xs text-gray-500 dark:text-gray-400 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-[11px]">
            Hazardastan News Crawler • Cloudflare Edge Architecture (Workers + D1 + KV + Queues)
          </p>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Edge Online</span>
            <span>v2.0.0-core-freeze</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
