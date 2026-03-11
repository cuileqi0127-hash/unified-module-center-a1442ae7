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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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

/** 与 toolbox 市场洞察历史记录一致的状态样式：rounded-full border + 背景/文字 */
const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: '已完成', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  processing: { label: '进行中', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' },
  failed: { label: '失败', className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-500/30' },
  queued: { label: '排队中', className: 'bg-muted text-muted-foreground border-border' },
};

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
 * 样式一比一对齐 toolbox 市场洞察历史记录（接口逻辑不变）
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

  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    return statusConfig[s] ?? statusConfig.queued;
  };

  /** 条目主标题：API 无 brandName，用日期 + 报告类型 */
  const getEntryTitle = (item: ReportListItem) => {
    const dateStr = item.createTime
      ? new Date(item.createTime).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })
      : '';
    return reportType === 'brand_health' ? `${dateStr} 洞察报告` : `${dateStr} 报告`;
  };

  /** 条目副标题：创建时间或类型说明 */
  const getEntrySubtitle = (item: ReportListItem) => {
    return reportType === 'brand_health' ? '品牌健康度报告' : 'TikTok 洞察报告';
  };

  const formatDate = (createTime: string) => {
    return createTime ? new Date(createTime).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : '-';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted/40"
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
                    key={String(item.id)}
                    type="button"
                    onClick={() => {
                      onSelectTask(String(item.id));
                      onOpenChange(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all group relative"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate pr-2">
                        {getEntryTitle(item)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full border',
                            st.className
                          )}
                        >
                          {statusText(item.status)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(item.createTime)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{getEntrySubtitle(item)}</p>
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
                      className="rounded-lg h-8 text-xs"
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
                      className="rounded-lg h-8 text-xs"
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
