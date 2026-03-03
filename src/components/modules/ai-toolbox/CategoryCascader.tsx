import { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import type { CategoryTree } from '@/data/tiktok-categories';

/** 扁平化树为 [path, value] 列表，用于检索 */
function flattenTree(tree: CategoryTree): { path: [string, string, string]; value: string }[] {
  const out: { path: [string, string, string]; value: string }[] = [];
  for (const l1 of Object.keys(tree)) {
    const l2Map = tree[l1];
    if (!l2Map) continue;
    for (const l2 of Object.keys(l2Map)) {
      const l3List = l2Map[l2] ?? [];
      for (const l3 of l3List) {
        out.push({ path: [l1, l2, l3], value: l3 });
      }
    }
  }
  return out;
}

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
  /** 检索输入框占位文案 */
  searchPlaceholder?: string;
  /** 检索无结果时的提示文案 */
  searchEmptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function CategoryCascader({
  tree,
  value,
  onChange,
  placeholder = '请选择',
  searchPlaceholder = '输入关键词检索',
  searchEmptyText = '暂无匹配品类',
  className,
  triggerClassName,
  disabled,
}: CategoryCascaderProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoverL1, setHoverL1] = useState<string | null>(null);
  const [hoverL2, setHoverL2] = useState<string | null>(null);

  const path = useMemo(() => (value ? findPathInTree(tree, value) : null), [tree, value]);
  const displayText = path ? path.join(' / ') : '';

  const flatList = useMemo(() => flattenTree(tree), [tree]);
  const searchTrimmed = searchQuery.trim();
  const filteredBySearch = useMemo(() => {
    if (!searchTrimmed) return [];
    const q = searchTrimmed.toLowerCase();
    return flatList.filter(
      (item) =>
        item.path[0].toLowerCase().includes(q) ||
        item.path[1].toLowerCase().includes(q) ||
        item.path[2].toLowerCase().includes(q)
    );
  }, [flatList, searchTrimmed]);

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
    setSearchQuery('');
    setHoverL1(null);
    setHoverL2(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
        <div className="border-b border-border/60 p-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none border-0" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-8 text-sm border-0 rounded-none"
            />
          </div>
        </div>
        {searchTrimmed ? (
          <ScrollArea className="h-[280px] w-[340px]">
            <div className="py-1">
              {filteredBySearch.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">{searchEmptyText}</p>
              ) : (
                filteredBySearch.map((item) => (
                  <div
                    key={item.path.join('-')}
                    className={cn(columnItemBase, value === item.value && 'bg-accent text-accent-foreground')}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectLevel3(item.value);
                    }}
                  >
                    <span className="truncate">{item.path.join(' / ')}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
        <div className="flex h-[280px]">
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
        )}
      </PopoverContent>
    </Popover>
  );
}
