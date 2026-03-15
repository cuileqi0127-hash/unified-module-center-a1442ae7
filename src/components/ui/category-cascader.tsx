import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CategoryTree } from '@/types/category';

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

/** 单列列表：选中加粗、非叶子右箭头、叶子选中显示 Check */
function CascaderColumn({
  items,
  selectedValue,
  onSelect,
  onHover,
  isLast,
}: {
  items: string[];
  selectedValue: string | null;
  onSelect: (item: string) => void;
  onHover: (item: string) => void;
  isLast?: boolean;
}) {
  return (
    <div className="min-w-[160px] max-h-[320px] overflow-y-auto border-r border-border/20 last:border-r-0 py-1 scrollbar-thin">
      {items.map((label) => {
        const isSelected = label === selectedValue;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(label)}
            onMouseEnter={() => onHover(label)}
            className={cn(
              'w-full min-w-0 flex items-center justify-between gap-2 px-3 py-2 rounded-full text-sm transition-colors text-left overflow-hidden',
              isSelected
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-foreground/80 hover:bg-muted/40'
            )}
          >
            <span className="min-w-0 truncate">{label}</span>
            {!isLast ? (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 ml-2" />
            ) : isSelected ? (
              <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-2" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export interface CategoryCascaderProps {
  /** 品类树数据，由外部传入 */
  tree: CategoryTree;
  /** 当前选中的叶子节点值（三级） */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  searchEmptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

/**
 * 通用下拉级联控件（品类选择器）。
 * 数据通过 tree 属性外部传入，不依赖具体业务数据源。
 */
export function CategoryCascader({
  tree,
  value,
  onChange,
  placeholder = '请选择',
  searchPlaceholder = '搜索品类...',
  searchEmptyText = '暂无匹配品类',
  className,
  triggerClassName,
  disabled,
}: CategoryCascaderProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoverL1, setHoverL1] = useState<string | null>(null);
  const [hoverL2, setHoverL2] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const path = useMemo(() => (value ? findPathInTree(tree, value) : null), [tree, value]);
  const displayText = path ? path.join(' > ') : '';

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

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleLevel1 = (l1: string) => {
    setHoverL1(l1);
    setHoverL2(null);
  };
  const handleLevel2 = (l2: string) => {
    setHoverL2(l2);
  };
  const handleSelectLevel3 = (level3: string) => {
    onChange(level3);
    setOpen(false);
    setSearchQuery('');
    setHoverL1(null);
    setHoverL2(null);
  };

  const handleSearchSelect = (item: { path: [string, string, string]; value: string }) => {
    onChange(item.value);
    setOpen(false);
    setSearchQuery('');
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
            'inline-flex items-center gap-1 h-7 rounded-full border px-2.5 py-1.5 text-sm transition-colors',
            displayText
              ? 'bg-accent/10 border-accent/20 text-accent font-medium'
              : 'bg-muted/20 border-border/30 text-muted-foreground/60 hover:border-border/60',
            triggerClassName,
            className
          )}
        >
          <span className="truncate max-w-[200px]">{displayText || placeholder}</span>
          <ChevronDown className="w-3 h-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="p-0 rounded-xl shadow-lg w-auto max-w-[540px] overflow-hidden [animation-duration:0.2s]"
      >
        <div className="px-3 py-2 border-b border-border/20">
          <div className="flex items-center gap-2 px-2 h-8 rounded-lg bg-muted/30 border border-border/20">
            <Search className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none min-w-0"
            />
          </div>
        </div>

        {searchTrimmed ? (
          <div className="max-h-[320px] overflow-y-auto py-1 scrollbar-thin">
            {filteredBySearch.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 text-center py-6">{searchEmptyText}</p>
            ) : (
              filteredBySearch.slice(0, 20).map((item) => (
                <button
                  key={item.path.join('-')}
                  type="button"
                  onClick={() => handleSearchSelect(item)}
                  className={cn(
                    'w-full min-w-0 text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted/40 overflow-hidden',
                    value === item.value ? 'bg-accent/10 text-accent font-medium' : 'text-foreground/80'
                  )}
                >
                  <span className="block truncate">{item.path.join(' > ')}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="flex">
            <CascaderColumn
              items={level1List}
              selectedValue={hoverL1 ?? path?.[0] ?? null}
              onSelect={handleLevel1}
              onHover={handleLevel1}
              isLast={false}
            />
            {level2List.length > 0 && (
              <CascaderColumn
                items={level2List}
                selectedValue={hoverL2 ?? path?.[1] ?? null}
                onSelect={handleLevel2}
                onHover={handleLevel2}
                isLast={false}
              />
            )}
            {level3List.length > 0 && (
              <CascaderColumn
                items={level3List}
                selectedValue={value}
                onSelect={handleSelectLevel3}
                onHover={() => {}}
                isLast
              />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
