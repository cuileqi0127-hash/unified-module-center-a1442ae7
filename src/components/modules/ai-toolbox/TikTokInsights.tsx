import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Sparkles, Tag, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { submitTiktokInsightTask } from '@/services/reportApi';
import { useReportPolling } from '@/hooks/useReportPolling';
import { categoryTreeZh, categoryTreeEn, type CategoryTree } from '@/data/tiktok-categories';
import { CategoryCascader } from './CategoryCascader';
import { ReportDisplay, ReportPollingOverlay } from './ReportDisplay';
import { ReportHistorySheet } from './ReportHistorySheet';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const cardGlass = cn(
  'rounded-2xl border-0 overflow-hidden',
  'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl',
  'shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.06)]',
  'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.3)]',
  'transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5'
);

interface TikTokInsightsProps {
  onNavigate?: (itemId: string) => void;
}

export function TikTokInsights({ onNavigate }: TikTokInsightsProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh-');
  const categoryTree: CategoryTree = isZh ? categoryTreeZh : categoryTreeEn;

  const [view, setView] = useState<'input' | 'report'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    categoryLevel3: '',
    sellingPoints: [] as string[],
  });
  const [sellingPointInput, setSellingPointInput] = useState('');
  const sellingPointInputRef = useRef<HTMLInputElement>(null);
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [removingSellingPointIndex, setRemovingSellingPointIndex] = useState<number | null>(null);

  const { reportUrl, isPolling, error } = useReportPolling(reportTaskId, view === 'report');

  useEffect(() => {
    if (removingSellingPointIndex === null) return;
    const timer = setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        sellingPoints: prev.sellingPoints.filter((_, j) => j !== removingSellingPointIndex),
      }));
      setRemovingSellingPointIndex(null);
    }, 200);
    return () => clearTimeout(timer);
  }, [removingSellingPointIndex]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'tiktok-insight-report-back') setView('input');
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

  const handleGenerate = async () => {
    const sellingPointsList = formData.sellingPoints.filter((s) => s.trim()).map((s) => s.trim());
    if (!formData.categoryLevel3.trim() || sellingPointsList.length === 0) return;
    setIsLoading(true);
    try {
      const res = await submitTiktokInsightTask({
        category: formData.categoryLevel3.trim(),
        sellingPoints: sellingPointsList,
      });
      if (res?.success && res?.data) {
        setReportTaskId(String(res.data.taskId ?? ''));
        setView('report');
      } else {
        toast.error(res?.msg ?? t('tiktokInsights.submitFailed'));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tiktokInsights.submitFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const historyLabels = {
    title: t('tiktokInsights.historyRecords'),
    triggerButton: t('tiktokInsights.historyRecords'),
    empty: t('tiktokInsights.historyEmpty'),
    loadFailed: t('tiktokInsights.historyLoadFailed'),
    total: t('tiktokInsights.historyTotal', { total: 0 }).replace('0', '{{total}}'),
    prevPage: t('tiktokInsights.prevPage'),
    nextPage: t('tiktokInsights.nextPage'),
    statusCompleted: t('tiktokInsights.statusCompleted'),
    statusProcessing: t('tiktokInsights.statusProcessing'),
    statusFailed: t('tiktokInsights.statusFailed'),
    statusQueued: t('tiktokInsights.statusQueued'),
  };

  if (view === 'input') {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/20 overflow-hidden opacity-0 animate-page-enter">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">{t('tiktokInsights.title')}</h1>
              <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                {t('tiktokInsights.titleTag')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('tiktokInsights.subtitle')}</p>
          </div>
          <ReportHistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            reportType="tiktok_insight"
            onSelectTask={(taskId) => {
              setReportTaskId(taskId);
              setView('report');
              setHistoryOpen(false);
            }}
            labels={historyLabels}
            onLoadError={(msg) => toast.error(msg)}
          />
        </header>

        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-[500px]">
            <div className={cn(cardGlass, 'p-6 md:p-8')}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t('tiktokInsights.category')} <span className="text-destructive/90">*</span>
                  </Label>
                  <CategoryCascader
                    tree={categoryTree}
                    value={formData.categoryLevel3}
                    onChange={(v) => setFormData({ ...formData, categoryLevel3: v })}
                    placeholder={t('tiktokInsights.categoryPlaceholderSelect')}
                    triggerClassName="border-border/80 bg-black/[0.02] dark:bg-white/[0.04] focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="sellingPoints"
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t('tiktokInsights.sellingPoints')} <span className="text-destructive/90">*</span>
                  </Label>
                  <div
                    className={cn(
                      'min-h-11 rounded-xl border border-border/80 bg-black/[0.02] dark:bg-white/[0.04] px-3 py-2 flex flex-wrap items-center gap-2',
                      'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-colors duration-200',
                    )}
                  >
                    <span className="text-muted-foreground/60 shrink-0">
                      <Tag className="w-4 h-4" />
                    </span>
                    {formData.sellingPoints.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className={cn(
                          'inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-md bg-[#333] text-sm text-[#fff]',
                          'animate-tag-in transition-all duration-200 ease-out',
                          removingSellingPointIndex === i && 'opacity-0 scale-90 pointer-events-none'
                        )}
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          aria-label={t('tiktokInsights.removeTag')}
                          className="p-0.5 rounded text-[#eee] hover:text-[#fff]"
                          onClick={() => setRemovingSellingPointIndex(i)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={sellingPointInputRef}
                      id="sellingPoints"
                      type="text"
                      placeholder={formData.sellingPoints.length === 0 ? t('tiktokInsights.sellingPointsPlaceholder') : ''}
                      value={sellingPointInput}
                      onChange={(e) => setSellingPointInput(e.target.value)}
                      onBlur={() => setSellingPointInput('')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const v = sellingPointInput.trim();
                          if (v) {
                            setFormData({ ...formData, sellingPoints: [...formData.sellingPoints, v] });
                            setSellingPointInput('');
                          }
                        }
                      }}
                      className="flex-1 min-w-[120px] h-7 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
              </div>

              <Button
                className="mt-6 h-12 w-full rounded-xl gap-2 text-[15px] font-medium bg-primary hover:bg-primary/90"
                onClick={handleGenerate}
                disabled={!formData.categoryLevel3.trim() || formData.sellingPoints.filter((s) => s.trim()).length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="h-4 w-4 text-white" />
                    {t('tiktokInsights.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t('tiktokInsights.generateReport')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/20 overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">{t('tiktokInsights.title')}</h1>
            <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
              {t('tiktokInsights.titleTag')}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('tiktokInsights.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportHistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            reportType="tiktok_insight"
            onSelectTask={(taskId) => {
              setReportTaskId(taskId);
              setView('report');
              setHistoryOpen(false);
            }}
            labels={historyLabels}
            onLoadError={(msg) => toast.error(msg)}
          />
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setView('input')}>
            <ChevronLeft className="w-4 h-4" />
            {t('tiktokInsights.backToRegenerate')}
          </Button>
        </div>
      </header>
      <div className="flex-1 min-h-0 relative flex flex-col">
        <ReportPollingOverlay
          show={isPolling}
          generatingLabel={t('tiktokInsights.generating')}
          generatingHint={t('tiktokInsights.pollingHint')}
        />
        {reportUrl && (
          <ReportDisplay
            reportUrl={reportUrl}
            reportTitle={t('tiktokInsights.reportTitleSuffix')}
          />
        )}
      </div>
    </div>
  );
}
