import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, Sparkles, Package, MapPin, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { submitBrandHealthTask } from '@/services/reportApi';
import { useReportPolling } from '@/hooks/useReportPolling';
import { ReportDisplay, ReportPollingOverlay } from './ReportDisplay';
import { ReportHistorySheet } from './ReportHistorySheet';

const cardGlass = cn(
  'rounded-2xl border-0 overflow-hidden',
  'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl',
  'shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.06)]',
  'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.3)]',
  'transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5'
);

interface BrandHealthProps {
  onNavigate?: (itemId: string) => void;
}

export function BrandHealth({ onNavigate }: BrandHealthProps) {
  const { t } = useTranslation();

  const [view, setView] = useState<'input' | 'report'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    category: '',
    region: '',
    competitors: [] as string[],
  });
  const [competitorInput, setCompetitorInput] = useState('');
  const competitorInputRef = useRef<HTMLInputElement>(null);
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [removingCompetitorIndex, setRemovingCompetitorIndex] = useState<number | null>(null);

  const { reportUrl, isPolling, error } = useReportPolling(reportTaskId, view === 'report');

  useEffect(() => {
    if (removingCompetitorIndex === null) return;
    const timer = setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        competitors: prev.competitors.filter((_, j) => j !== removingCompetitorIndex),
      }));
      setRemovingCompetitorIndex(null);
    }, 200);
    return () => clearTimeout(timer);
  }, [removingCompetitorIndex]);

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

  const handleGenerate = async () => {
    if (!formData.brandName.trim() || !formData.region.trim()) return;
    setIsLoading(true);
    try {
      const competitorsList = formData.competitors.filter((s) => s.trim()).map((s) => s.trim());
      const res = await submitBrandHealthTask({
        brandName: formData.brandName.trim(),
        category: formData.category.trim() || undefined,
        competitors: competitorsList.length > 0 ? competitorsList : undefined,
        region: formData.region.trim(),
      });
      if (res?.success && res?.data) {
        setReportTaskId(String(res.data.taskId ?? ''));
        setView('report');
      } else {
        toast.error(res?.msg ?? t('brandHealth.submitFailed'));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('brandHealth.submitFailed'));
    } finally {
      setIsLoading(false);
    }
  };

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

  if (view === 'input') {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/20 overflow-hidden opacity-0 animate-page-enter">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">{t('brandHealth.title')}</h1>
              <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                {t('brandHealth.titleTag')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('brandHealth.subtitle')}</p>
          </div>
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
        </header>

        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-[500px]">
            <div className={cn(cardGlass, 'p-6 md:p-8')}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="brandName"
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t('brandHealth.brandName')} <span className="text-destructive/90">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <Input
                      id="brandName"
                      placeholder={t('brandHealth.brandNamePlaceholder')}
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      className={cn(
                        'h-11 pl-10 rounded-xl border border-border/80 bg-black/[0.02] dark:bg-white/[0.04]',
                        'placeholder:text-muted-foreground/60',
                        'focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30',
                        'transition-colors duration-200'
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t('brandHealth.category')}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                      <Package className="w-4 h-4" />
                    </span>
                    <Input
                      id="category"
                      placeholder={t('brandHealth.categoryPlaceholder')}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={cn(
                        'h-11 pl-10 rounded-xl border border-border/80 bg-black/[0.02] dark:bg-white/[0.04]',
                        'placeholder:text-muted-foreground/60',
                        'focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30',
                        'transition-colors duration-200'
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="region"
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t('brandHealth.region')} <span className="text-destructive/90">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <Input
                      id="region"
                      placeholder={t('brandHealth.regionPlaceholder')}
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className={cn(
                        'h-11 pl-10 rounded-xl border border-border/80 bg-black/[0.02] dark:bg-white/[0.04]',
                        'placeholder:text-muted-foreground/60',
                        'focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30',
                        'transition-colors duration-200'
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="competitors"
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t('brandHealth.competitors')}
                  </Label>
                  <div
                    className={cn(
                      'min-h-11 rounded-xl border border-border/80 bg-black/[0.02] dark:bg-white/[0.04] px-3 py-2 flex flex-wrap items-center gap-2',
                      'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-colors duration-200',
                    )}
                  >
                    <span className="text-muted-foreground/60 shrink-0">
                      <Users className="w-4 h-4" />
                    </span>
                    {formData.competitors.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className={cn(
                          'inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-md bg-[#333] text-sm text-[#fff]',
                          'animate-tag-in transition-all duration-200 ease-out',
                          removingCompetitorIndex === i && 'opacity-0 scale-90 pointer-events-none'
                        )}
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          aria-label={t('brandHealth.removeTag')}
                          className="p-0.5 rounded text-[#eee] hover:text-[#fff]"
                          onClick={() => setRemovingCompetitorIndex(i)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={competitorInputRef}
                      id="competitors"
                      type="text"
                      placeholder={formData.competitors.length === 0 ? t('brandHealth.competitorsPlaceholder') : ''}
                      value={competitorInput}
                      onChange={(e) => setCompetitorInput(e.target.value)}
                      onBlur={() => setCompetitorInput('')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const v = competitorInput.trim();
                          if (v) {
                            setFormData({ ...formData, competitors: [...formData.competitors, v] });
                            setCompetitorInput('');
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
                disabled={!formData.brandName.trim() || !formData.region.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('brandHealth.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t('brandHealth.generateReport')}
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
            <TrendingUp className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">{t('brandHealth.title')}</h1>
            <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
              {t('brandHealth.titleTag')}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('brandHealth.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setView('input')}>
            <ChevronLeft className="w-4 h-4" />
            {t('brandHealth.backToRegenerate')}
          </Button>
        </div>
      </header>
      <div className="flex-1 min-h-0 relative flex flex-col">
        <ReportPollingOverlay
          show={isPolling}
          generatingLabel={t('brandHealth.generating')}
          generatingHint={t('brandHealth.pollingHint')}
        />
        {reportUrl && (
          <ReportDisplay
            reportUrl={reportUrl}
            reportTitle={t('brandHealth.reportTitleSuffix')}
          />
        )}
      </div>
    </div>
  );
}
