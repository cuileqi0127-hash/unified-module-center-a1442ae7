'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ShowcaseCard, type ShowcaseCardData } from './ShowcaseCard';
import { ShowcaseDetailDialog } from './ShowcaseDetailDialog';
import { SHOWCASE_CARDS } from './showcaseData';
import { useReplicatePrefill } from '@/contexts/ReplicatePrefillContext';

const CASE_CATEGORIES = [
  { id: 'market', label: '市场洞察' },
  { id: 'campaign', label: '策划方案' },
  { id: 'video', label: '灵感库' },
] as const;

const VISUAL_CATEGORY = 'video';

interface AppPlazaShowcaseSectionProps {
  onNavigate: (itemId: string) => void;
}

export function AppPlazaShowcaseSection({ onNavigate }: AppPlazaShowcaseSectionProps) {
  const { setPrefill } = useReplicatePrefill();
  const [activeCaseCategory, setActiveCaseCategory] = useState<string>('market');
  const [page, setPage] = useState(0);
  const [detailCard, setDetailCard] = useState<ShowcaseCardData | null>(null);

  const isVisualCategory = activeCaseCategory === VISUAL_CATEGORY;
  const itemsPerPage = isVisualCategory ? 12 : 16;

  const filteredCases = useMemo(
    () => SHOWCASE_CARDS.filter((c) => c.category === activeCaseCategory),
    [activeCaseCategory],
  );

  const totalPages = Math.ceil(filteredCases.length / itemsPerPage) || 1;
  const pagedCases = filteredCases.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const handleCategoryChange = (id: string) => {
    setActiveCaseCategory(id);
    setPage(0);
  };

  const handleCardClick = (card: ShowcaseCardData) => {
    if (isVisualCategory) {
      setDetailCard(card);
      return;
    }
    if (card.reportUrl) {
      window.open(card.reportUrl, '_blank');
    }
  };

  const handleReplicate = () => {
    if (!detailCard) return;
    setPrefill({
      sellingPoints: [],
      inspirationVideo: {
        id: `showcase-${detailCard.title}`,
        title: detailCard.title,
        views: detailCard.detail?.stats?.views || '0',
        likes: detailCard.detail?.stats?.likes || '0',
        coverGradient: 'from-rose-500/60 to-orange-400/60',
      },
    });
    onNavigate(detailCard.targetId);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  return (
    <>
      <section id="showcase-section" className="flex flex-col px-0 pt-2 pb-2">
        <h2 className="text-lg font-normal text-foreground/60 mb-2 shrink-0">案例</h2>
        <div className="flex gap-1 mb-2 shrink-0">
          {CASE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                activeCaseCategory === cat.id
                  ? 'text-orange-600 font-medium bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {pagedCases.map((card, i) => (
              <ShowcaseCard
                key={`${card.category}-${page}-${i}-${card.title}`}
                card={card}
                variant={isVisualCategory ? 'visual' : 'default'}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      <ShowcaseDetailDialog
        card={detailCard}
        open={!!detailCard}
        onOpenChange={(open) => {
          if (!open) setDetailCard(null);
        }}
        onReplicate={handleReplicate}
      />
    </>
  );
}
