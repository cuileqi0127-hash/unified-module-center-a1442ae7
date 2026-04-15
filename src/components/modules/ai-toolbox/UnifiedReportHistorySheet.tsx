import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getUnifiedReportList, type UnifiedReportListItem } from '@/services/unifiedReportApi';

export type UnifiedReportType = 'MARKET_INSIGHT' | 'STRATEGY_CASE';

export interface UnifiedReportHistorySheetLabels {
  title: string;
  triggerButton: string;
  empty: string;
  loadFailed: string;
  total: string;
  prevPage: string;
  nextPage: string;
  statusCompleted: string;
  statusProcessing: string;
  statusFailed: string;
  statusQueued: string;
}

const statusConfig: Record<string, { className: string }> = {
  completed: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  processing: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' },
  failed: { className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-500/30' },
  queued: { className: 'bg-muted text-muted-foreground border-border' },
};

interface UnifiedReportHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: UnifiedReportType;
  onSelectTask: (taskId: string) => void;
  labels: UnifiedReportHistorySheetLabels;
  onLoadError?: (message: string) => void;
}

const PAGE_SIZE = 10;

export function UnifiedReportHistorySheet({
  open,
  onOpenChange,
  reportType,
  onSelectTask,
  labels,
  onLoadError,
}: UnifiedReportHistorySheetProps) {
  const [list, setList] = useState<UnifiedReportListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getUnifiedReportList({ reportType, page, size: PAGE_SIZE })
      .then((res) => {
        if (res?.success && res?.data) {
          setList(res.data.list ?? []);
          setTotal(res.data.total ?? 0);
        }
      })
      .catch(() => onLoadError?.(labels.loadFailed))
      .finally(() => setLoading(false));
  }, [open, reportType, page, labels.loadFailed, onLoadError]);

  const statusText = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return labels.statusCompleted;
    if (s === 'processing') return labels.statusProcessing;
    if (s === 'failed') return labels.statusFailed;
    return labels.statusQueued;
  };

  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    return statusConfig[s] ?? statusConfig.queued;
  };

  const formatDate = (createTime: string) => {
    const normalized = createTime?.includes('T') ? createTime : createTime?.replace(' ', 'T');
    const d = normalized ? new Date(normalized) : null;
    if (!d || Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-full hover:bg-muted/40"
        >
          <History className="w-3.5 h-3.5" />
          <span>{labels.triggerButton}</span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-80 sm:w-96 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base font-medium">{labels.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner className="h-6 w-6 text-primary" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{labels.empty}</p>
          ) : (
            <>
              {list.map((item) => {
                const st = getStatusStyle(item.status);
                return (
                  <button
                    key={String(item.taskId)}
                    type="button"
                    onClick={() => {
                      onSelectTask(String(item.taskId));
                      onOpenChange(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all group relative"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate pr-2">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', st.className)}>
                          {statusText(item.status)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(item.createTime)}</span>
                      </div>
                    </div>
                    {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                    {item.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {item.tags.slice(0, 6).map((tag) => (
                          <span key={tag} className="text-[10px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">
                    {labels.total.replace('{{total}}', String(total))}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      className="rounded-full h-8 text-xs"
                    >
                      {labels.prevPage}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * PAGE_SIZE >= total}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => p + 1);
                      }}
                      className="rounded-full h-8 text-xs"
                    >
                      {labels.nextPage}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

