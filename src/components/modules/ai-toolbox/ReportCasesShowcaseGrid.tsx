import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ShowcaseCard, type ShowcaseCardData } from './app-plaza/ShowcaseCard';
import { getReportCaseDetail, getReportCasesPage, type ReportCaseListItem } from '@/services/reportCasesApi';
import { ReportDisplay } from './ReportDisplay';

const REPORT_THUMB_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200" viewBox="0 0 160 200"><rect width="160" height="200" fill="#f4f4f5"/><text x="80" y="102" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="system-ui,sans-serif">Report</text></svg>`
  );

function toShowcaseCard(item: ReportCaseListItem, hoverText: string, targetId: string, category: string): ShowcaseCardData {
  const thumb =
    typeof item.coverUrl === 'string' && item.coverUrl.trim() !== '' ? item.coverUrl.trim() : REPORT_THUMB_PLACEHOLDER;
  return {
    title: item.title,
    desc: item.intro || '',
    hoverText,
    image: thumb,
    miniTitle: item.title.length > 18 ? `${item.title.slice(0, 18)}…` : item.title,
    targetId,
    category,
  };
}

export interface ReportCasesShowcaseGridProps {
  reportType: 'MARKET_INSIGHT' | 'STRATEGY_CASE';
  /** 每页条数，默认 16（与设计稿 4×4 一致） */
  pageSize?: number;
  /** 标题关键词搜索（透传接口 title） */
  titleKeyword?: string;
  className?: string;
  /** 卡片网格 class，如 gap-2 / gap-5 */
  gridClassName?: string;
  /** 分页上方间距 */
  paginationClassName?: string;
}

export function ReportCasesShowcaseGrid({
  reportType,
  pageSize = 16,
  titleKeyword,
  className,
  gridClassName = 'grid grid-cols-2 lg:grid-cols-4 gap-4',
  paginationClassName = 'mt-5',
}: ReportCasesShowcaseGridProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const [page, setPage] = useState(0);
  const [list, setList] = useState<ReportCaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<{ title: string; reportUrl: string } | null>(null);

  const hoverText =
    reportType === 'MARKET_INSIGHT'
      ? t('reportCases.hoverMarketInsight')
      : t('reportCases.hoverStrategyCase');
  const targetNavId = reportType === 'MARKET_INSIGHT' ? 'market-insights' : 'planning-solutions';
  const showcaseCategory = reportType === 'MARKET_INSIGHT' ? 'market' : 'campaign';

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReportCasesPage({
        reportType,
        page: page + 1,
        size: pageSize,
        ...(titleKeyword?.trim() ? { title: titleKeyword.trim() } : {}),
      });
      setList(res.list);
      setTotal(res.total);
    } catch (e) {
      setList([]);
      setTotal(0);
      toast.error(e instanceof Error ? e.message : t('reportCases.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, reportType, titleKeyword, t]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(0);
  }, [reportType, titleKeyword]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedList = useMemo(() => list, [list]);

  const openDetail = useCallback(
    async (id: string | number) => {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      setActiveDetail(null);
      try {
        const d = await getReportCaseDetail(id);
        setActiveDetail({ title: d.title, reportUrl: d.reportUrl });
      } catch (e) {
        setDetailError(e instanceof Error ? e.message : t('reportCases.detailLoadFailed'));
      } finally {
        setDetailLoading(false);
      }
    },
    [t]
  );

  if (loading && list.length === 0) {
    return (
      <div className={cn('flex justify-center py-12', className)}>
        <LoadingSpinner className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!loading && pagedList.length === 0) {
    return (
      <p className={cn('text-center text-sm text-muted-foreground py-10', className)}>{t('reportCases.empty')}</p>
    );
  }

  return (
    <div className={className}>
      <div className={gridClassName}>
        {pagedList.map((item) => (
          <ShowcaseCard
            key={String(item.id)}
            card={toShowcaseCard(item, hoverText, targetNavId, showcaseCategory)}
            variant="default"
            onClick={() => void openDetail(item.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className={cn('flex items-center justify-center gap-3', paginationClassName)}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setActiveDetail(null);
            setDetailError(null);
          }
        }}
      >
        <DialogContent
          className={cn(
            'max-w-[min(96vw,1200px)] w-full h-[min(92vh,880px)] p-0 gap-0 flex flex-col',
            'border-border/40'
          )}
        >
          <DialogHeader className="px-4 py-3 border-b border-border/20 shrink-0 space-y-0">
            <DialogTitle className="text-base font-medium line-clamp-1 pr-8">
              {activeDetail?.title || t('reportCases.caseDetailTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 relative bg-muted/20">
            {detailLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60">
                <LoadingSpinner className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            {detailError && (
              <div className="p-6 text-sm text-destructive text-center">{detailError}</div>
            )}
            {!detailLoading && !detailError && activeDetail?.reportUrl && (
              <ReportDisplay
                reportUrl={activeDetail.reportUrl}
                reportTitle={activeDetail.title}
                generatingLabel={t('reportCases.openingReport')}
                generatingHint={t('reportCases.openingReportHint')}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
