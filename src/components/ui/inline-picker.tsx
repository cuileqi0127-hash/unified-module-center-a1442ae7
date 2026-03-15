import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface InlinePickerOption {
  value: string;
  label: string;
}

/** 与「策划方案」页「制定」「预算量级」「营销周期」完全一致的下拉样式，供文生图/文生视频模型等复用；弹窗自适应位置不溢出视口 */
export function InlinePicker({
  options,
  value,
  onChange,
  placeholder,
  show,
  setShow,
  optionLabel,
  className,
}: {
  /** 选项列表，可为字符串数组（展示与 value 相同）或 { value, label } 数组 */
  options: string[] | InlinePickerOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  setShow: (v: boolean) => void;
  /** 当 options 为 string[] 时，用此函数渲染选项文案；不传则用选项本身 */
  optionLabel?: (optionValue: string) => string;
  className?: string;
}) {
  const normalizedOptions: InlinePickerOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );
  const getLabel = (v: string) => optionLabel?.(v) ?? normalizedOptions.find((o) => o.value === v)?.label ?? v;
  const displayValue = value ? getLabel(value) : '';

  return (
    <div className={cn('relative inline-block mx-1', className)}>
      <Popover open={show} onOpenChange={setShow}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 min-h-7 h-7 px-2.5 rounded-full border text-sm transition-colors max-w-full',
            value
              ? 'bg-accent/10 border-accent/20 text-accent font-medium'
              : 'bg-muted/20 border-border/30 text-muted-foreground/60 hover:border-border/60'
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{displayValue || placeholder}</span>
          <ChevronDown className="w-3 h-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={12}
        className={cn(
          'w-auto min-w-[140px] max-w-[min(100vw-2rem,320px)] p-1 rounded-xl border border-border/30 shadow-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2'
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="overflow-hidden">
          {normalizedOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setShow(false);
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-2 min-w-0 overflow-hidden',
                opt.value === value ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-muted/40 text-foreground/70'
              )}
            >
              {opt.value === value && <Check className="w-3 h-3 shrink-0 flex-shrink-0" />}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}
