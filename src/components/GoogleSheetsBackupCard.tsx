import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Activity,
  ArrowDownToLine,
  HelpCircle,
  Code2
} from 'lucide-react';

export const GoogleSheetsBackupCard: React.FC = () => {
  const [webAppUrl, setWebAppUrl] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message: string;
    remoteData?: any;
  } | null>(null);

  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    syncedCount?: number;
  } | null>(null);

  // Fetch current config
  useEffect(() => {
    fetch('/api/v1/backup/sheets/config')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setWebAppUrl(res.data.web_app_url || '');
          setSecretToken(res.data.secret_token || '');
          setIsActive(res.data.is_active !== undefined ? res.data.is_active : true);
        }
      })
      .catch((err) => console.error('Failed to load Google Sheets config:', err));
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/v1/backup/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          web_app_url: webAppUrl,
          secret_token: secretToken,
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus({ success: true, message: 'تنظیمات با موفقیت در دیتابیس D1 ذخیره شد.' });
      } else {
        setSaveStatus({ success: false, message: data.error || 'خطا در ذخیره تنظیمات' });
      }
    } catch (err: any) {
      setSaveStatus({ success: false, message: `خطا در ارتباط: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleHealthCheck = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/backup/sheets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          web_app_url: webAppUrl,
          secret_token: secretToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          latencyMs: data.data?.latencyMs,
          message: data.data?.message || 'ارتباط با موفقیت برقرار شد.',
          remoteData: data.data?.remoteResponse,
        });
      } else {
        setTestResult({
          success: false,
          latencyMs: data.data?.latencyMs,
          message: data.error || 'پاسخ ناموفق از سرور گوگل دریافت شد.',
          remoteData: data.data?.remoteResponse,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `عدم امکان برقراری ارتباط: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/v1/backup/sheets/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult({
          success: true,
          syncedCount: data.data?.syncedCount,
          message: data.data?.message || 'همگام‌سازی با موفقیت انجام شد.',
        });
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'خطا در همگام‌سازی با Google Sheets',
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: `خطا: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const appsScriptCode = `/**
 * Google Apps Script Web App for Hazardastan News Crawler
 * پشتیبان‌گیری خودکار اخبار و ترجمه‌ها در گوگل شیت
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'sync_articles';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. تست سلامت و پینگ
    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Google Sheets Web App is alive and connected!',
        spreadsheet_name: ss.getName(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. درج مقالات در شیت
    if (action === 'sync_articles' && data.articles && Array.isArray(data.articles)) {
      var sheetName = 'Articles_Backup';
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        var headers = [
          'ID', 'Source', 'Original Title', 'Translated Title', 
          'Status', 'Model', 'Tags', 'Date Added', 'Original URL'
        ];
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#F3F4F6');
      }
      
      var rowsAdded = 0;
      for (var i = 0; i < data.articles.length; i++) {
        var a = data.articles[i];
        sheet.appendRow([
          a.id || '',
          a.source_name || '',
          a.original_title || '',
          a.translated_title || '',
          a.status || 'approved',
          a.model || '',
          a.tags || '',
          new Date().toLocaleString('fa-IR'),
          a.original_url || ''
        ]);
        rowsAdded++;
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        rows_added: rowsAdded,
        message: 'Successfully backed up ' + rowsAdded + ' articles to ' + sheetName,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action or payload'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'operational',
    service: 'Hazardastan Google Sheets Backup Endpoint',
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
              <FileSpreadsheet className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-sans">پشتیبان‌گیری در Google Sheets</h2>
              <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                همگام‌سازی امن، بلادرنگ و نامتقارن داده‌های D1 با صفحات گسترده گوگل شیت از طریق Google Apps Script
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              webAppUrl ? 'bg-white/20 text-white border border-white/30' : 'bg-amber-400 text-amber-950'
            }`}>
              <Activity className="w-3.5 h-3.5" />
              {webAppUrl ? 'پیکربندی شده' : 'نیازمند تنظیم URL'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Connection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Connection Settings Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>تنظیمات وب‌اپلیکیشن گوگل (Google Apps Script URL)</span>
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  آدرس Google Apps Script Web App URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-mono text-gray-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-hidden"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  آدرس Web App به دست آمده پس از مرحله Deploy در بخش Apps Script شیت گوگل.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  کلید امنیتی یا Secret Token (اختیاری)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={secretToken}
                  onChange={(e) => setSecretToken(e.target.value)}
                  placeholder="کلید احراز هویت توکن جهت تایید درخواست‌ها"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-mono text-gray-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-gray-800">فعال بودن مقصد پشتیبان‌گیری Google Sheets</span>
                </label>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>ذخیره در پایگاه داده D1</span>
                </button>
              </div>

              {saveStatus && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  saveStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {saveStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{saveStatus.message}</span>
                </div>
              )}
            </form>
          </div>

          {/* Health Check & Manual Sync Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>عملیات و ارزیابی زنده اتصال (Health Check & Sync)</span>
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleHealthCheck}
                disabled={isTesting || !webAppUrl}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Activity className="w-4 h-4 text-emerald-400" />}
                <span>بررسی سلامت اتصال (Health Check)</span>
              </button>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing || !webAppUrl}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <ArrowDownToLine className="w-4 h-4 text-emerald-600" />}
                <span>همگام‌سازی دستی ۲۰ خبر اخیر</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl text-xs border ${
                testResult.success ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.latencyMs && (
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-white rounded-md border border-gray-200">
                      تاخیر: {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                {testResult.remoteData && (
                  <pre className="mt-2 p-2 bg-white/75 rounded-lg font-mono text-[10px] text-gray-700 overflow-x-auto" dir="ltr">
                    {JSON.stringify(testResult.remoteData, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {syncResult && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                syncResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {syncResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{syncResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code & Deploy Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step-by-Step Guide */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              <span>راهنمای گام‌به‌گام راه‌اندازی در Google Sheets</span>
            </h3>

            <ol className="space-y-2.5 text-xs text-gray-700 leading-relaxed list-decimal list-inside">
              <li>یک فایل جدید در <strong className="text-gray-900">Google Sheets</strong> ایجاد کنید.</li>
              <li>از منوی بالا به مسیر <strong className="text-gray-900">Extensions &gt; Apps Script</strong> بروید.</li>
              <li>کد آماده زیر را به طور کامل جایگزین محتوای ادیتور نمایید.</li>
              <li>روی دکمه <strong className="text-gray-900">Deploy &gt; New deployment</strong> کلیک کنید.</li>
              <li>نوع استقرار را روی <strong className="text-gray-900">Web app</strong> قرار دهید.</li>
              <li>گزینه <strong className="text-gray-900">Who has access</strong> را روی <strong className="text-emerald-700 font-bold">Anyone</strong> تنظیم فرمایید.</li>
              <li>آدرس <strong className="text-gray-900">Web app URL</strong> تولیدشده را کپی کرده و در کادر تنظیمات قرار دهید.</li>
            </ol>
          </div>

          {/* Copyable Apps Script Code */}
          <div className="bg-gray-900 text-gray-100 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-gray-200 font-mono">Google Apps Script (Code.gs)</span>
              </div>

              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'کپی شد!' : 'کپی کد اسکریپت'}</span>
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto rounded-xl bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-300" dir="ltr">
              <pre>{appsScriptCode}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
