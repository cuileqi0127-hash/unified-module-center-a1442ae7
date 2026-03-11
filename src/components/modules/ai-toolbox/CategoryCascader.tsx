import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

/** 单列列表：与 toolbox 一致 - 选中加粗、浅灰右箭头(非叶子)、叶子选中显示 Check */
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
              'w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left',
              isSelected
                ? 'bg-muted/60 text-foreground font-medium'
                : 'text-foreground/80 hover:bg-muted/30'
            )}
          >
            <span className="truncate">{label}</span>
            {!isLast ? (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 ml-2" />
            ) : isSelected ? (
              <Check className="w-3.5 h-3.5 text-foreground shrink-0 ml-2" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

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
  /** 面包屑展示：一级 > 二级 > 三级，与 toolbox / 设计图一致 */
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
            'flex items-center gap-1 h-7 rounded-md border border-border/40 text-xs bg-transparent px-2 hover:border-border transition-colors',
            !displayText && 'text-muted-foreground',
            triggerClassName,
            className
          )}
        >
          <span className="truncate max-w-[200px]">{displayText || placeholder}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="p-0 rounded-xl shadow-lg w-auto max-w-[540px] overflow-hidden [animation-duration:0.2s]"
      >
        {/* 搜索框 - 与 toolbox 一致 */}
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
          /* 搜索结果列表 */
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
                    'w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-muted/30',
                    value === item.value ? 'bg-muted/60 text-foreground font-medium' : 'text-foreground/80'
                  )}
                >
                  {item.path.join(' > ')}
                </button>
              ))
            )}
          </div>
        ) : (
          /* 三列级联 - 与 toolbox 一致 */
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
