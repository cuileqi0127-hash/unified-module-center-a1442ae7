import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { categoryTreeZh, categoryTreeEn, type CategoryTree } from '@/data/tiktok-categories';
import { MarketInsightComposer } from './MarketInsightComposer';
import { ReportDisplay, ReportPollingOverlay } from './ReportDisplay';
import { UnifiedReportHistorySheet } from './UnifiedReportHistorySheet';
import { estimateUnifiedReportTask, createUnifiedReportTask } from '@/services/unifiedReportApi';
import { useReportPolling } from '@/hooks/useReportPolling';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MarketInsights() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh-');
  const categoryTree: CategoryTree = isZh ? categoryTreeZh : categoryTreeEn;

  const [view, setView] = useState<'input' | 'report'>('input');
  const [formData, setFormData] = useState({ brandName: '', category: '', competitors: [] as string[] });
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [estimatedCredits, setEstimatedCredits] = useState<number>(0);
  const [estimateBizCode, setEstimateBizCode] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { reportUrl, isPolling, error } = useReportPolling(taskId, view === 'report');

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setView('input');
  }, [error]);

  const toggleMemory = useCallback((id: string) => {
    setSelectedMemoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const estimateBody = useMemo(() => {
    if (!formData.brandName.trim()) return null;
    return {
      reportType: 'MARKET_INSIGHT' as const,
      reportInput: {
        scenarioInput: {
          brandName: formData.brandName.trim(),
          category: formData.category?.trim() || undefined,
          recommendedCompetitors: formData.competitors ?? [],
        },
      },
      memoryEntryIds: selectedMemoryIds,
    };
  }, [formData.brandName, formData.category, formData.competitors, selectedMemoryIds]);

  useEffect(() => {
    if (!estimateBody) {
      setEstimatedCredits(0);
      setEstimateBizCode(null);
      return;
    }
    const ac = new AbortController();
    const tid = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await estimateUnifiedReportTask(estimateBody);
          if (ac.signal.aborted) return;
          if (res?.success && res.data && typeof res.data.estimatedCredits === 'number') {
            setEstimatedCredits(res.data.estimatedCredits);
            setEstimateBizCode((res as any)?.bizCode ?? null);
          } else {
            setEstimatedCredits(0);
            setEstimateBizCode((res as any)?.bizCode ?? null);
          }
        } catch {
          if (!ac.signal.aborted) {
            setEstimatedCredits(0);
            setEstimateBizCode(null);
          }
        }
      })();
    }, 400);
    return () => {
      ac.abort();
      window.clearTimeout(tid);
    };
  }, [estimateBody]);

  const handleSubmitWithMemory = useCallback(
    async (
      payload: { brandName: string; category: string; competitors: string[] },
      memoryEntryIds: string[]
    ) => {
      setFormData(payload);
      setIsSubmitting(true);
      try {
        const body = {
          reportType: 'MARKET_INSIGHT' as const,
          reportInput: {
            scenarioInput: {
              brandName: payload.brandName.trim(),
              category: payload.category?.trim() || undefined,
              recommendedCompetitors: payload.competitors ?? [],
            },
          },
          memoryEntryIds,
        };
        const res = await createUnifiedReportTask(body);
        if (res?.success && res.data?.taskId != null) {
          setTaskId(String(res.data.taskId));
          setView('report');
        } else {
          toast.error(res?.msg || 'Request failed');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const historyLabels = {
    title: isZh ? '历史记录' : 'History',
    triggerButton: isZh ? '历史记录' : 'History',
    empty: isZh ? '暂无历史报告' : 'No history yet',
    loadFailed: isZh ? '加载历史记录失败' : 'Failed to load history',
    total: isZh ? '共 {{total}} 条' : '{{total}} total',
    prevPage: isZh ? '上一页' : 'Prev',
    nextPage: isZh ? '下一页' : 'Next',
    statusCompleted: isZh ? '已完成' : 'Completed',
    statusProcessing: isZh ? '生成中' : 'Processing',
    statusFailed: isZh ? '失败' : 'Failed',
    statusQueued: isZh ? '排队中' : 'Queued',
  };

  if (view === 'input') {
    return (
      <div className="relative h-full">
        <div className="absolute top-4 right-4 z-20">
          <UnifiedReportHistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            reportType="MARKET_INSIGHT"
            onSelectTask={(id) => {
              setTaskId(id);
              setView('report');
              setHistoryOpen(false);
            }}
            labels={historyLabels}
            onLoadError={(msg) => toast.error(msg)}
          />
        </div>
        <MarketInsightComposer
          categoryTree={categoryTree}
          disabled={isSubmitting}
          initialData={formData.brandName ? formData : undefined}
          onSubmit={() => {}}
          onSubmitWithMemory={handleSubmitWithMemory}
          selectedMemoryIds={selectedMemoryIds}
          onToggleMemory={toggleMemory}
          estimatedCredits={estimatedCredits}
          estimateCreditsBizCode={estimateBizCode}
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

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="min-h-full bg-muted/30 p-4 md:p-6">
        <div className="mx-auto max-w-7xl animate-fade-in">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              className="gap-2 text-muted-foreground hover:text-foreground inline-flex items-center"
              onClick={() => {
                setView('input');
                setTaskId(null);
              }}
            >
              ‹ {isZh ? '返回' : 'Back'}
            </button>
            <div className="flex items-center gap-2">
              <UnifiedReportHistorySheet
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                reportType="MARKET_INSIGHT"
                onSelectTask={(id) => {
                  setTaskId(id);
                  setHistoryOpen(false);
                }}
                labels={historyLabels}
                onLoadError={(msg) => toast.error(msg)}
              />
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{formData.brandName} {isZh ? '洞察报告' : 'Insight Report'}</h1>
          </div>

          <div className="relative flex flex-col h-[calc(100vh-14rem)] min-h-[420px] rounded-lg border bg-card overflow-hidden mb-6">
            <ReportPollingOverlay
              show={isPolling}
              generatingLabel={isZh ? '生成中...' : 'Generating...'}
              generatingHint={isZh ? '正在生成报告，请稍候…' : 'Generating report, please wait…'}
            />
            {reportUrl && (
              <ReportDisplay
                reportUrl={reportUrl}
                reportTitle={isZh ? '市场洞察报告' : 'Market Insight Report'}
                generatingLabel={isZh ? '生成中...' : 'Generating...'}
                generatingHint={isZh ? '正在生成报告，请稍候…' : 'Generating report, please wait…'}
              />
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

