import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CampaignPlannerComposer, type CampaignPayload } from './CampaignPlannerComposer';
import { ReportDisplay, ReportPollingOverlay } from './ReportDisplay';
import { UnifiedReportHistorySheet } from './UnifiedReportHistorySheet';
import { estimateUnifiedReportTask, createUnifiedReportTask } from '@/services/unifiedReportApi';
import { useReportPolling } from '@/hooks/useReportPolling';

export function CampaignPlanner() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh-');

  const [view, setView] = useState<'input' | 'report'>('input');
  const [payload, setPayload] = useState<CampaignPayload | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [estimatedCredits, setEstimatedCredits] = useState<number>(0);
  const [estimateBizCode, setEstimateBizCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { reportUrl, isPolling, error } = useReportPolling(taskId, view === 'report');

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setView('input');
  }, [error]);

  const estimateBody = useMemo(() => {
    if (!payload?.brandName?.trim()) return null;
    return {
      reportType: 'STRATEGY_CASE' as const,
      reportInput: {
        scenarioInput: {
          brandName: payload.brandName.trim(),
          marketingGoal: payload.goal,
          targetAudience: payload.audience ?? [],
          coreSellingPoints: payload.sellingPoints ?? [],
          budgetLevel: payload.budget,
          primaryChannels: payload.channels ?? [],
          marketingPeriod: payload.cycle || undefined,
        },
      },
      memoryEntryIds: payload.memoryEntryIds ?? [],
    };
  }, [payload]);

  useEffect(() => {
    if (view !== 'input' || !estimateBody) {
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
  }, [estimateBody, view]);

  const handleSubmit = useCallback(async (data: CampaignPayload) => {
    setPayload(data);
    setIsSubmitting(true);
    try {
      const body = {
        reportType: 'STRATEGY_CASE' as const,
        reportInput: {
          scenarioInput: {
            brandName: data.brandName.trim(),
            marketingGoal: data.goal,
            targetAudience: data.audience ?? [],
            coreSellingPoints: data.sellingPoints ?? [],
            budgetLevel: data.budget,
            primaryChannels: data.channels ?? [],
            marketingPeriod: data.cycle || undefined,
          },
        },
        memoryEntryIds: data.memoryEntryIds ?? [],
      };
      const res = await createUnifiedReportTask(body);
      if (res?.success && res.data?.taskId != null) {
        setTaskId(String(res.data.taskId));
        setView('report');
      } else {
        toast.error(res?.msg || t('errors.requestFailed'));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  }, [t]);

  const historyLabels = {
    title: t('unifiedHistory.title'),
    triggerButton: t('unifiedHistory.triggerButton'),
    empty: t('unifiedHistory.empty'),
    loadFailed: t('unifiedHistory.loadFailed'),
    total: t('unifiedHistory.total', { total: 0 }).replace('0', '{{total}}'),
    prevPage: t('unifiedHistory.prevPage'),
    nextPage: t('unifiedHistory.nextPage'),
    statusCompleted: t('unifiedHistory.statusCompleted'),
    statusProcessing: t('unifiedHistory.statusProcessing'),
    statusFailed: t('unifiedHistory.statusFailed'),
    statusQueued: t('unifiedHistory.statusQueued'),
  };

  if (view === 'input') {
    return (
      <div className="relative h-full">
        <div className="absolute top-4 right-4 z-20">
          <UnifiedReportHistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            reportType="STRATEGY_CASE"
            onSelectTask={(id) => {
              setTaskId(id);
              setView('report');
              setHistoryOpen(false);
            }}
            labels={historyLabels}
            onLoadError={(msg) => toast.error(msg)}
          />
        </div>
        <CampaignPlannerComposer
          onSubmit={handleSubmit}
          disabled={isSubmitting}
          estimatedCredits={estimatedCredits}
          estimateCreditsBizCode={estimateBizCode}
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
              ‹ {t('common.back')}
            </button>
            <UnifiedReportHistorySheet
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              reportType="STRATEGY_CASE"
              onSelectTask={(id) => {
                setTaskId(id);
                setHistoryOpen(false);
              }}
              labels={historyLabels}
              onLoadError={(msg) => toast.error(msg)}
            />
          </div>

          <div className="relative flex flex-col h-[calc(100vh-14rem)] min-h-[420px] rounded-lg border bg-card overflow-hidden mb-6">
            <ReportPollingOverlay
              show={isPolling}
              generatingLabel={t('reportDisplay.generatingLabel')}
              generatingHint={t('campaignPlanner.generatingHint')}
            />
            {reportUrl && (
              <ReportDisplay
                reportUrl={reportUrl}
                reportTitle={t('campaignPlanner.reportTitle')}
                generatingLabel={t('reportDisplay.generatingLabel')}
                generatingHint={t('campaignPlanner.generatingHint')}
              />
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
