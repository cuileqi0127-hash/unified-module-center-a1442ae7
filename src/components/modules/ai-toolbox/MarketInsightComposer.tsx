import { useState, useRef, useCallback } from 'react';
import { ArrowUp, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryCascader } from '@/components/ui/category-cascader';
import { ShowcaseCard } from './app-plaza/ShowcaseCard';
import { SHOWCASE_CARDS } from './app-plaza/showcaseData';
import { EstimatedCreditsHint } from './EstimatedCreditsHint';
import type { CategoryTree } from '@/types/category';

export interface HistoryEntry {
  id: string;
  brandName: string;
  category: string;
  competitors: string[];
  date: string;
  status: 'completed' | 'in_progress' | 'failed';
}

interface MarketInsightComposerProps {
  categoryTree: CategoryTree;
  onSubmit: (payload: { brandName: string; category: string; competitors: string[] }) => void;
  disabled?: boolean;
  initialData?: { brandName: string; category: string; competitors: string[] };
  /** i18n */
  title?: string;
  subtitle?: string;
  brandPlaceholder?: string;
  categoryPlaceholder?: string;
  competitorPlaceholder?: string;
  competitorAddPlaceholder?: string;
  searchPlaceholder?: string;
  searchEmptyText?: string;
}

export function MarketInsightComposer({
  categoryTree,
  onSubmit,
  disabled,
  initialData,
  title = '市场洞察报告',
  subtitle = '输入品牌与品类信息，一键生成洞察报告',
  brandPlaceholder = '品牌名称',
  categoryPlaceholder = '选择品类',
  competitorPlaceholder = '输入竞品，回车添加',
  competitorAddPlaceholder = '添加竞品...',
  searchPlaceholder = '输入关键词检索',
  searchEmptyText = '暂无匹配品类',
}: MarketInsightComposerProps) {
  const [brandName, setBrandName] = useState(initialData?.brandName || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [competitors, setCompetitors] = useState<string[]>(initialData?.competitors || []);
  const [competitorInput, setCompetitorInput] = useState('');
  const [casesPage, setCasesPage] = useState(0);
  const competitorInputRef = useRef<HTMLInputElement>(null);

  const canSend = Boolean(brandName.trim() && category.trim() && competitors.length > 0);

  const handleSend = useCallback(() => {
    if (!canSend || disabled) return;
    onSubmit({
      brandName: brandName.trim(),
      category,
      competitors,
    });
  }, [canSend, disabled, brandName, category, competitors, onSubmit]);

  const addCompetitor = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !competitors.includes(trimmed)) {
      setCompetitors((prev) => [...prev, trimmed]);
    }
    setCompetitorInput('');
  };

  const removeCompetitor = (name: string) => {
    setCompetitors((prev) => prev.filter((c) => c !== name));
  };

  const handleCompetitorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (competitorInput.trim()) {
        addCompetitor(competitorInput);
      } else {
        handleSend();
      }
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-8 py-[80px]">
      <div className="w-full max-w-2xl animate-fade-in mt-[80px]">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl tracking-tight text-[#3d3d3d] font-normal">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Composer Card */}
        <div className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md">
          <div className="p-5">
            {/* Fixed sentence structure with inline inputs */}
            <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
              <span className="whitespace-nowrap">为我生成</span>

              {/* Brand name - inline input */}
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={brandPlaceholder}
                className={cn(
                  'mx-1.5 px-2.5 h-7 bg-muted/20 border border-border/30 rounded-full text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20 transition-colors',
                  'w-[100px]'
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <span className="whitespace-nowrap">，</span>

              {/* Category - cascader */}
              <div className="inline-block mx-1.5 align-middle">
                <CategoryCascader
                  tree={categoryTree}
                  value={category}
                  onChange={setCategory}
                  placeholder={categoryPlaceholder}
                  searchPlaceholder={searchPlaceholder}
                  searchEmptyText={searchEmptyText}
                />
              </div>

              <span className="whitespace-nowrap">，</span>

              {/* Competitors inline area */}
              <div className="inline-flex items-center gap-1 flex-wrap mx-1.5">
                {competitors.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 h-6 rounded-full bg-accent/10 border border-accent/20 px-2 text-xs text-accent font-medium"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCompetitor(c)}
                      className="hover:text-accent/70 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={competitorInputRef}
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={handleCompetitorKeyDown}
                  onBlur={() => {
                    if (competitorInput.trim()) addCompetitor(competitorInput);
                  }}
                  placeholder={competitors.length === 0 ? competitorPlaceholder : competitorAddPlaceholder}
                  className="h-6 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none w-[120px]"
                />
              </div>

              <span className="whitespace-nowrap">的洞察报告</span>
            </div>
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/20">
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/8 text-accent/80">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/60 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent/80" />
                </span>
                <span className="text-[11px] font-medium">联网搜索中</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <EstimatedCreditsHint amount={200} />
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend || disabled}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                  canSend && !disabled
                    ? 'bg-foreground text-background hover:bg-foreground/90'
                    : 'bg-muted/60 text-muted-foreground/40 cursor-not-allowed'
                )}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Case Cards - full width, synced with App Plaza */}
      {(() => {
        const allMarketCases = SHOWCASE_CARDS.filter((c) => c.category === 'market');
        const ITEMS_PER_PAGE = 16;
        const totalPages = Math.ceil(allMarketCases.length / ITEMS_PER_PAGE);
        const pagedCases = allMarketCases.slice(casesPage * ITEMS_PER_PAGE, (casesPage + 1) * ITEMS_PER_PAGE);

        return allMarketCases.length > 0 ? (
          <div className="mt-10 w-full max-w-5xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {pagedCases.map((card, i) => (
                <ShowcaseCard
                  key={`market-${casesPage}-${i}`}
                  card={card}
                  variant="default"
                  onClick={() => {
                    if (card.reportUrl) {
                      window.open(card.reportUrl, '_blank');
                    }
                  }}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setCasesPage((p) => Math.max(0, p - 1))}
                  disabled={casesPage === 0}
                  className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground">
                  {casesPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCasesPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={casesPage === totalPages - 1}
                  className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : null;
      })()}
    </div>
  );
}
