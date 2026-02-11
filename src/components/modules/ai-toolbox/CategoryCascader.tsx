import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CategoryTree } from '@/data/tiktok-categories';

/** 根据叶子节点值在树中查找路径 [一级, 二级, 三级] */
export function findPathInTree(tree: CategoryTree, leafValue: string): [string, string, string] | null {
  for (const level1 of Object.keys(tree)) {
    const level2Map = tree[level1];
    if (!level2Map) continue;
    for (const level2 of Object.keys(level2Map)) {
      const level3List = level2Map[level2];
      if (level3List?.includes(leafValue)) return [level1, level2, leafValue];
    }
  }
  return null;
}

const columnItemBase = cn(
  'flex items-center justify-between w-full px-3 py-2 text-sm cursor-pointer',
  'hover:bg-accent hover:text-accent-foreground',
  'transition-colors duration-150 ease-out'
);

interface CategoryCascaderProps {
  tree: CategoryTree;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function CategoryCascader({
  tree,
  value,
  onChange,
  placeholder = '请选择',
  className,
  triggerClassName,
  disabled,
}: CategoryCascaderProps) {
  const [open, setOpen] = useState(false);
  const [hoverL1, setHoverL1] = useState<string | null>(null);
  const [hoverL2, setHoverL2] = useState<string | null>(null);

  const path = useMemo(() => (value ? findPathInTree(tree, value) : null), [tree, value]);
  const displayText = path ? path.join(' / ') : '';

  const level1List = useMemo(() => Object.keys(tree), [tree]);
  const level2List = useMemo(() => {
    const key = hoverL1 ?? path?.[0] ?? null;
    return key ? Object.keys(tree[key] ?? {}) : [];
  }, [tree, hoverL1, path]);
  const level3List = useMemo(() => {
    const l1 = hoverL1 ?? path?.[0] ?? null;
    const l2 = hoverL2 ?? path?.[1] ?? null;
    if (!l1 || !l2) return [];
    return tree[l1]?.[l2] ?? [];
  }, [tree, hoverL1, hoverL2, path]);

  const handleSelectLevel3 = (level3: string) => {
    onChange(level3);
    setOpen(false);
    setHoverL1(null);
    setHoverL2(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-xl border border-border/80 px-3',
            'bg-black/[0.02] dark:bg-white/[0.04]',
            'text-left text-sm placeholder:text-muted-foreground/60',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName,
            className
          )}
        >
          <span className={displayText ? 'text-foreground' : 'text-muted-foreground'}>
            {displayText || placeholder}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out', open && 'rotate-180')}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0 overflow-hidden [animation-duration:0.2s]"
        sideOffset={4}
      >
        <div className="flex h-[320px]">
          <ScrollArea className="h-full w-[140px] shrink-0 border-r border-border/60">
            <div className="py-1">
              {level1List.map((l1) => (
                <div
                  key={l1}
                  className={cn(
                    columnItemBase,
                    (hoverL1 ?? path?.[0]) === l1 && 'bg-accent text-accent-foreground'
                  )}
                  onMouseEnter={() => setHoverL1(l1)}
                >
                  <span>{l1}</span>
                  <span className="text-muted-foreground">›</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="h-full w-[140px] shrink-0 border-r border-border/60 overflow-hidden">
            <div key={hoverL1 ?? path?.[0] ?? '_'} className="py-1 animate-fade-in">
              {level2List.map((l2) => (
                <div
                  key={l2}
                  className={cn(
                    columnItemBase,
                    (hoverL2 ?? path?.[1]) === l2 && 'bg-accent text-accent-foreground'
                  )}
                  onMouseEnter={() => setHoverL2(l2)}
                >
                  <span>{l2}</span>
                  <span className="text-muted-foreground">›</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="h-full w-[160px] shrink-0 overflow-hidden">
            <div key={hoverL2 ?? path?.[1] ?? '_'} className="py-1 animate-fade-in">
              {level3List.map((l3) => (
                <div
                  key={l3}
                  className={cn(columnItemBase, value === l3 && 'bg-accent text-accent-foreground')}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectLevel3(l3);
                  }}
                >
                  <span>{l3}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
