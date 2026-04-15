import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface MemorySelectItem {
  id: string;
  name: string;
  desc: string;
  tag: string;
  /** 条目正文 UTF-8 字节长度（用于选中合计与上限） */
  byteLength: number;
}

interface MemorySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MemorySelectItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** 选中项正文 UTF-8 字节合计上限，默认 5000 */
  maxChars?: number;
  className?: string;
}

/** 默认上限：UTF-8 字节 */
const CHAR_LIMIT = 5000;

export function MemorySelectionDialog({
  open,
  onOpenChange,
  items,
  selectedIds,
  onToggle,
  maxChars = CHAR_LIMIT,
  className,
}: MemorySelectionDialogProps) {
  const { t } = useTranslation();
  const totalBytes = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)).reduce((sum, i) => sum + i.byteLength, 0),
    [items, selectedIds]
  );

  const isOverLimit = totalBytes > maxChars;
  const nearLimit = totalBytes > maxChars * 0.8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md rounded-2xl', className)} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-base font-medium">{t('memory.dialogTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span
              className={cn('text-muted-foreground', isOverLimit && 'text-destructive font-medium')}
            >
              {t('memory.bytesSelected', { current: totalBytes.toLocaleString(), max: maxChars.toLocaleString() })}
            </span>
            {isOverLimit && (
              <span className="flex items-center gap-1 text-destructive font-medium">
                <AlertTriangle className="w-3 h-3" />
                {t('memory.overLimit')}
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isOverLimit ? 'bg-destructive' : nearLimit ? 'bg-amber-500' : 'bg-foreground/60'
              )}
              style={{ width: `${Math.min(100, (totalBytes / maxChars) * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5 mt-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('memory.noMemory')}</p>
          ) : (
            items.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all',
                    selected
                      ? 'border-foreground/20 bg-foreground/[0.03]'
                      : 'border-border/30 hover:border-border/60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border flex items-center justify-center transition-all',
                          selected ? 'border-foreground bg-foreground' : 'border-border'
                        )}
                      >
                        {selected && <Check className="w-3 h-3 text-background" />}
                      </div>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">{item.byteLength.toLocaleString()}{t('memory.bytesSuffix')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-[30px]">{item.desc}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          {isOverLimit && (
            <p className="text-[11px] text-destructive">
              {t('memory.reduceSelection', { count: totalBytes - maxChars })}
            </p>
          )}
          <div className="ml-auto">
            <Button
              onClick={() => onOpenChange(false)}
              size="sm"
              disabled={isOverLimit}
              className="rounded-full h-8 px-5 bg-foreground text-background hover:bg-foreground/90 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认 ({selectedIds.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
