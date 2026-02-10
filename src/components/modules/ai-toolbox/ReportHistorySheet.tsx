import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { getReportList } from '@/services/reportApi';
import type { ReportListItem } from '@/services/reportApi';

export type ReportType = 'brand_health' | 'tiktok_insight';

export interface ReportHistorySheetLabels {
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

interface ReportHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: ReportType;
  onSelectTask: (taskId: string) => void;
  labels: ReportHistorySheetLabels;
  onLoadError?: (message: string) => void;
}

const PAGE_SIZE = 10;

/**
 * 报告历史记录 Sheet：按 reportType 拉取列表，点击条目回调 onSelectTask
 */
export function ReportHistorySheet({
  open,
  onOpenChange,
  reportType,
  onSelectTask,
  labels,
  onLoadError,
}: ReportHistorySheetProps) {
  const [list, setList] = useState<ReportListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getReportList({
      reportType,
      page,
      size: PAGE_SIZE,
      sort: 'createTime,desc',
    })
      .then((res) => {
        if (res?.success && res?.data) {
          setList(res.data.list ?? []);
          setTotal(res.data.total ?? 0);
        }
      })
      .catch(() => {
        onLoadError?.(labels.loadFailed);
      })
      .finally(() => setLoading(false));
  }, [open, reportType, page, labels.loadFailed, onLoadError]);

  const statusText = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return labels.statusCompleted;
    if (s === 'processing') return labels.statusProcessing;
    if (s === 'failed') return labels.statusFailed;
    return labels.statusQueued;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-2">
          <History className="w-4 h-4" />
          {labels.triggerButton}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{labels.empty}</p>
          ) : (
            <ul className="space-y-1">
              {list.map((item) => (
                <li
                  key={String(item.id)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3 text-sm cursor-pointer transition-colors hover:bg-muted/50',
                  )}
                  onClick={() => {
                    onSelectTask(String(item.id));
                    onOpenChange(false);
                  }}
                >
                  <span className="text-muted-foreground truncate">
                    {item.createTime ? new Date(item.createTime).toLocaleString() : '-'}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 px-2 py-0.5 rounded text-xs font-medium',
                      item.status === 'completed' && 'bg-primary/10 text-primary',
                      item.status === 'processing' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      item.status === 'failed' && 'bg-destructive/10 text-destructive',
                      (item.status === 'queued' || !item.status) && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {statusText(item.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
              <span className="text-xs text-muted-foreground">
                {labels.total.replace('{{total}}', String(total))}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {labels.prevPage}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * PAGE_SIZE >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {labels.nextPage}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
