import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryCascader } from '@/components/ui/category-cascader';
import { EstimatedCreditsHint } from './EstimatedCreditsHint';
import { ReportCasesShowcaseGrid } from './ReportCasesShowcaseGrid';
import type { CategoryTree } from '@/types/category';
import { MemoryButtonWithDialog } from '@/components/modules/memory/MemoryButtonWithDialog';

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
  /** 可选：包含记忆库选择 */
  onSubmitWithMemory?: (payload: { brandName: string; category: string; competitors: string[] }, memoryEntryIds: string[]) => void;
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
  /** 预估积分展示 */
  estimatedCredits?: number | string;
  estimateCreditsBizCode?: string | null;
  /** 记忆库选择（受控）。不传则不展示记忆库按钮 */
  selectedMemoryIds?: string[];
  onToggleMemory?: (id: string) => void;
}

export function MarketInsightComposer({
  categoryTree,
  onSubmit,
  onSubmitWithMemory,
  disabled,
  initialData,
  title,
  subtitle,
  brandPlaceholder,
  categoryPlaceholder,
  competitorPlaceholder,
  competitorAddPlaceholder,
  searchPlaceholder,
  searchEmptyText,
  estimatedCredits = 0,
  estimateCreditsBizCode,
  selectedMemoryIds,
  onToggleMemory,
}: MarketInsightComposerProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('marketInsights.composerTitle');
  const resolvedSubtitle = subtitle ?? t('marketInsights.composerSubtitle');
  const resolvedBrandPlaceholder = brandPlaceholder ?? t('marketInsights.composerBrandPlaceholder');
  const resolvedCategoryPlaceholder = categoryPlaceholder ?? t('marketInsights.composerCategoryPlaceholder');
  const resolvedCompetitorPlaceholder = competitorPlaceholder ?? t('marketInsights.composerCompetitorPlaceholder');
  const resolvedCompetitorAddPlaceholder = competitorAddPlaceholder ?? t('marketInsights.composerCompetitorAddPlaceholder');
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('marketInsights.cascaderSearchPlaceholder');
  const resolvedSearchEmptyText = searchEmptyText ?? t('marketInsights.cascaderSearchEmpty');

  const [brandName, setBrandName] = useState(initialData?.brandName || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [competitors, setCompetitors] = useState<string[]>(initialData?.competitors || []);
  const [competitorInput, setCompetitorInput] = useState('');
  const competitorInputRef = useRef<HTMLInputElement>(null);

  const canSend = Boolean(brandName.trim() && category.trim() && competitors.length > 0);

  const handleSend = useCallback(() => {
    if (!canSend || disabled) return;
    const payload = { brandName: brandName.trim(), category, competitors };
    const ids = selectedMemoryIds ?? [];
    if (onSubmitWithMemory) onSubmitWithMemory(payload, ids);
    else onSubmit(payload);
  }, [canSend, disabled, brandName, category, competitors, onSubmit, onSubmitWithMemory, selectedMemoryIds]);

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
          <h1 className="text-2xl md:text-3xl tracking-tight text-[#3d3d3d] font-normal">{resolvedTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{resolvedSubtitle}</p>
        </div>

        {/* Composer Card */}
        <div className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md">
          <div className="p-5">
            {/* Fixed sentence structure with inline inputs */}
            <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
              <span className="whitespace-nowrap">{t('marketInsights.composePrefix')}</span>

              {/* Brand name - inline input */}
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={resolvedBrandPlaceholder}
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
                  placeholder={resolvedCategoryPlaceholder}
                  searchPlaceholder={resolvedSearchPlaceholder}
                  searchEmptyText={resolvedSearchEmptyText}
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
                  placeholder={competitors.length === 0 ? resolvedCompetitorPlaceholder : resolvedCompetitorAddPlaceholder}
                  className="h-6 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none w-[120px]"
                />
              </div>

              <span className="whitespace-nowrap">{t('marketInsights.composeSuffix')}</span>
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
                <span className="text-[11px] font-medium">{t('campaignPlanner.searchingOnline')}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <EstimatedCreditsHint amount={estimatedCredits || 0} bizCode={estimateCreditsBizCode} />
              {selectedMemoryIds && onToggleMemory && (
                <MemoryButtonWithDialog
                  selectedIds={selectedMemoryIds}
                  onToggle={onToggleMemory}
                />
              )}
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

      <div className="mt-10 w-full max-w-5xl">
        <ReportCasesShowcaseGrid reportType="MARKET_INSIGHT" pageSize={16} gridClassName="grid grid-cols-2 lg:grid-cols-4 gap-5" />
      </div>
    </div>
  );
}
