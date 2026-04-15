import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, FileText, Database, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { submitBrandHealthTask } from '@/services/reportApi';
import { createMemoryEntry } from '@/services/memoryApi';
import { useOAuth } from '@/contexts/OAuthContext';
import { useMemory } from '@/contexts/MemoryContext';
import { htmlToMarkdown } from '@/lib/htmlToMarkdown';
import { useReportPolling } from '@/hooks/useReportPolling';
import { categoryTreeZh, categoryTreeEn, type CategoryTree } from '@/data/tiktok-categories';
import { MarketInsightComposer } from './MarketInsightComposer';
import { ReportDisplay, ReportPollingOverlay } from './ReportDisplay';
import { ReportHistorySheet } from './ReportHistorySheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BrandHealthProps {
  onNavigate?: (itemId: string) => void;
}

export function BrandHealth({ onNavigate }: BrandHealthProps) {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useOAuth();
  const { refreshMemoryEntries } = useMemory();
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh-');
  const categoryTree: CategoryTree = isZh ? categoryTreeZh : categoryTreeEn;

  const [view, setView] = useState<'input' | 'loading' | 'report'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    category: '',
    competitors: [] as string[],
  });
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isCopyingToMemory, setIsCopyingToMemory] = useState(false);

  const { reportUrl, isPolling, error } = useReportPolling(reportTaskId, view === 'report');

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'brand-health-report-back') setView('input');
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
      setView('input');
    }
  }, [error]);

  const handleGenerate = useCallback(
    async (payload: { brandName: string; category: string; competitors: string[] }) => {
      setFormData(payload);
      setView('loading');
      setIsLoading(true);
      try {
        const res = await submitBrandHealthTask({
          brandName: payload.brandName.trim(),
          category: payload.category.trim(),
          competitors: payload.competitors,
        });
        if (res?.success && res?.data) {
          setReportTaskId(String(res.data.taskId ?? ''));
          setView('report');
        } else {
          toast.error(res?.msg ?? t('brandHealth.submitFailed'));
          setView('input');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('brandHealth.submitFailed'));
        setView('input');
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const handleBack = useCallback(() => {
    setFormData({ brandName: '', category: '', competitors: [] });
    setReportTaskId(null);
    setHistoryKey((k) => k + 1);
    setView('input');
  }, []);

  const handleDownloadReport = useCallback(async () => {
    if (!reportUrl) {
      toast.error(t('brandHealth.loadingReport'));
      return;
    }
    setIsDownloadingReport(true);
    try {
      const res = await fetch(reportUrl, { mode: 'cors' });
      if (!res.ok) throw new Error(res.statusText);
      const html = await res.text();
      const filename = t('brandHealth.downloadHtmlFilename');
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('brandHealth.downloadReportSuccess'));
    } catch (e) {
      console.error('Download report failed:', e);
      toast.error(t('brandHealth.downloadReportFailed'));
    } finally {
      setIsDownloadingReport(false);
    }
  }, [t, reportUrl]);

  const handleCopyToMemory = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error(t('brandHealth.copyToMemoryNeedLogin'));
      return;
    }
    if (!reportUrl) {
      toast.error(t('brandHealth.loadingReport'));
      return;
    }
    if (isPolling) {
      toast.error(t('brandHealth.copyToMemoryWaitGenerating'));
      return;
    }
    setIsCopyingToMemory(true);
    try {
      const res = await fetch(reportUrl, { mode: 'cors' });
      if (!res.ok) throw new Error(res.statusText);
      const html = await res.text();
      let contentMd = htmlToMarkdown(html);
      if (!contentMd.trim()) {
        toast.error(t('brandHealth.copyToMemoryEmpty'));
        return;
      }
      const rawTitle = `${formData.brandName.trim()} ${t('brandHealth.reportTitle')}`.trim() || t('brandHealth.reportTitle');
      const title = rawTitle.slice(0, 255);
      const createRes = await createMemoryEntry({ title, contentMd });
      if (!createRes?.success) {
        toast.error(createRes?.msg || t('brandHealth.copyToMemoryFailed'));
        return;
      }
      await refreshMemoryEntries();
      toast.success(t('brandHealth.copyToMemorySuccess'));
    } catch (e) {
      console.error('Copy to memory failed:', e);
      toast.error(t('brandHealth.copyToMemoryFailed'));
    } finally {
      setIsCopyingToMemory(false);
    }
  }, [
    formData.brandName,
    isAuthenticated,
    isPolling,
    refreshMemoryEntries,
    reportUrl,
    t,
  ]);

  const historyLabels = {
    title: t('brandHealth.historyRecords'),
    triggerButton: t('brandHealth.historyRecords'),
    empty: t('brandHealth.historyEmpty'),
    loadFailed: t('brandHealth.historyLoadFailed'),
    total: t('brandHealth.historyTotal', { total: 0 }).replace('0', '{{total}}'),
    prevPage: t('brandHealth.prevPage'),
    nextPage: t('brandHealth.nextPage'),
    statusCompleted: t('brandHealth.statusCompleted'),
    statusProcessing: t('brandHealth.statusProcessing'),
    statusFailed: t('brandHealth.statusFailed'),
    statusQueued: t('brandHealth.statusQueued'),
  };

  // Loading View - 与 toolbox 一致
  if (view === 'loading') {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4 animate-fade-in">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <h2 className="text-lg font-medium text-foreground">{t('brandHealth.generating')}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {t('brandHealth.generatingFor')}{' '}
            <span className="text-foreground font-medium">{formData.brandName}</span>{' '}
            {t('brandHealth.generatingReportSuffix')}
          </p>
        </div>
      </div>
    );
  }

  // Input Form View - Chat Composer（与 toolbox 一致）
  if (view === 'input') {
    return (
      <div className="relative h-full">
        <div className="absolute top-4 right-4 z-20">
          <ReportHistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            reportType="brand_health"
            onSelectTask={(taskId) => {
              setReportTaskId(taskId);
              setView('report');
              setHistoryOpen(false);
            }}
            labels={historyLabels}
            onLoadError={(msg) => toast.error(msg)}
          />
        </div>
        <MarketInsightComposer
          key={historyKey}
          categoryTree={categoryTree}
          onSubmit={handleGenerate}
          disabled={isLoading}
          initialData={
            formData.brandName
              ? { brandName: formData.brandName, category: formData.category, competitors: formData.competitors }
              : undefined
          }
          title={t('brandHealth.composerTitle')}
          subtitle={t('brandHealth.composerSubtitle')}
          brandPlaceholder={t('brandHealth.brandNamePlaceholder')}
          categoryPlaceholder={t('brandHealth.composerCategoryPlaceholder')}
          competitorPlaceholder={t('brandHealth.competitorsPlaceholder')}
          competitorAddPlaceholder={t('brandHealth.competitorAddPlaceholder')}
          searchPlaceholder={t('brandHealth.cascaderSearchPlaceholder')}
          searchEmptyText={t('brandHealth.categorySearchEmpty')}
        />
      </div>
    );
  }

  // Report Dashboard View - 与 toolbox 报告结果样式一比一：顶栏、标题、Card 风格内容区，内容仍为 iframe（接口逻辑不变）
  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="min-h-full bg-muted/30 p-4 md:p-6">
        <div className="mx-auto max-w-7xl animate-fade-in">
          {/* Top Bar - 与 toolbox 一比一 */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('brandHealth.backToRegenerate')}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isCopyingToMemory || isPolling || !reportUrl}
                onClick={() => void handleCopyToMemory()}
              >
                {isCopyingToMemory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                {t('brandHealth.copyToMemory')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isDownloadingReport || isPolling}
                onClick={handleDownloadReport}
              >
                <FileText className="h-4 w-4" />
                {t('brandHealth.exportPdf')}
              </Button>
            </div>
          </div>

          {/* Report Title - 与 toolbox 一比一（含 id 便于后续打印等） */}
          <div className="mb-6" id="brand-health-report">
            <h1 className="text-2xl font-bold text-foreground">
              {formData.brandName} {t('brandHealth.reportTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('brandHealth.generatedTimeLabel')}
              {new Date().toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* 报告内容区：固定高度占满视口剩余空间，iframe 内可滚动查看全部 HTML 内容 */}
          <div className="relative flex flex-col h-[calc(100vh-14rem)] min-h-[420px] rounded-lg border bg-card overflow-hidden mb-6">
            <ReportPollingOverlay
              show={isPolling}
              generatingLabel={t('brandHealth.generating')}
              generatingHint={t('brandHealth.pollingHint')}
            />
            {reportUrl && (
              <ReportDisplay
                reportUrl={reportUrl}
                reportTitle={t('brandHealth.reportTitleSuffix')}
                generatingLabel={t('brandHealth.generating')}
                generatingHint={t('brandHealth.pollingHint')}
              />
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
