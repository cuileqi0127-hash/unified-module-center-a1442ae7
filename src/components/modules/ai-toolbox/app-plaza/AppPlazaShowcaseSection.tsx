'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ShowcaseCard, type ShowcaseCardData } from './ShowcaseCard';
import { ShowcaseDetailDialog } from './ShowcaseDetailDialog';
import { SHOWCASE_CARDS } from './showcaseData';
import { useReplicatePrefill } from '@/contexts/ReplicatePrefillContext';
import { ReportCasesShowcaseGrid } from '../ReportCasesShowcaseGrid';
import { getInspirationVideoDetail, getInspirationVideosPage, type MaterialSquareItem } from '@/services/inspirationVideoApi';

const VISUAL_CATEGORY = 'video';

interface AppPlazaShowcaseSectionProps {
  onNavigate: (itemId: string) => void;
}

export function AppPlazaShowcaseSection({ onNavigate }: AppPlazaShowcaseSectionProps) {
  const { t } = useTranslation();
  const { setPrefill } = useReplicatePrefill();
  const [activeCaseCategory, setActiveCaseCategory] = useState<string>('market');
  const [page, setPage] = useState(0);
  const [detailCard, setDetailCard] = useState<ShowcaseCardData | null>(null);
  const [videoList, setVideoList] = useState<MaterialSquareItem[]>([]);
  const [videoTotal, setVideoTotal] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);

  const CASE_CATEGORIES = useMemo(
    () =>
      [
        { id: 'market', label: t('appPlaza.caseCategories.market') },
        { id: 'campaign', label: t('appPlaza.caseCategories.campaign') },
        { id: 'video', label: t('appPlaza.caseCategories.video') },
      ] as const,
    [t]
  );

  const isVisualCategory = activeCaseCategory === VISUAL_CATEGORY;
  const itemsPerPage = isVisualCategory ? 12 : 16;

  const filteredCases = useMemo(
    () => SHOWCASE_CARDS.filter((c) => c.category === activeCaseCategory),
    [activeCaseCategory],
  );

  const totalPages = Math.ceil(filteredCases.length / itemsPerPage) || 1;
  const pagedCases = filteredCases.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const visualTotalPages = Math.max(1, Math.ceil(videoTotal / itemsPerPage) || 1);
  const displayTotalPages = isVisualCategory ? visualTotalPages : totalPages;

  const formatCompact = (n?: number) => {
    if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
    const loc = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
    return new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  };

  const buildVideoCardFromItem = (item: MaterialSquareItem): ShowcaseCardData => {
    const desc = item.category ? `${item.category}${item.publisher ? ` · ${item.publisher}` : ''}` : (item.publisher || '');
    return {
      title: item.title,
      desc: desc || '',
      hoverText: t('appPlaza.hoverReplicateTrendingVideo'),
      // visual variant uses <video src={card.image}>
      image: item.sourceUrl || item.previewUrl || '/app-plaza-inspiration-temp.mp4',
      miniTitle: item.title,
      targetId: 'replicate-video',
      category: 'video',
      detail: {
        author: item.publisher || undefined,
        sourceUrl: item.sourceUrl,
        previewUrl: item.previewUrl ?? null,
        stats: {
          views: formatCompact(item.viewCount),
          likes: formatCompact(item.likeCount),
          comments: formatCompact(item.commentCount),
          shares: formatCompact(item.shareCount),
        },
        tags: item.tags ?? [],
      },
    };
  };

  // Load inspiration videos when tab/page changes
  useEffect(() => {
    if (!isVisualCategory) return;
    setVideoLoading(true);
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await getInspirationVideosPage({
          page: page + 1,
          size: itemsPerPage,
          mediaType: 'video',
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setVideoList(res.list);
        setVideoTotal(res.total);
      } catch {
        if (!ac.signal.aborted) {
          setVideoList([]);
          setVideoTotal(0);
        }
      } finally {
        if (!ac.signal.aborted) setVideoLoading(false);
      }
    })();
    return () => ac.abort();
  }, [isVisualCategory, page, itemsPerPage]);

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
        <h2 className="text-lg font-normal text-foreground/60 mb-2 shrink-0">{t('appPlaza.caseSectionTitle')}</h2>
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
          {isVisualCategory ? (
            <>
              {videoLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
              ) : videoList.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">{t('appPlaza.inspirationEmpty')}</div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {videoList.map(buildVideoCardFromItem).map((card, i) => (
                    <ShowcaseCard
                      key={`${card.category}-${page}-${i}-${card.title}`}
                      card={card}
                      variant="visual"
                      onClick={() => {
                        const rawItem = videoList[i];
                        if (rawItem?.id != null) {
                          const ac = new AbortController();
                          void (async () => {
                            try {
                              const d = await getInspirationVideoDetail(rawItem.id, ac.signal);
                              const base = buildVideoCardFromItem(d);
                              base.detail = {
                                ...(base.detail || {}),
                                purpose: d.purpose || undefined,
                                audience: d.targetAudience || undefined,
                                techHighlight: d.aiTech || undefined,
                              };
                              setDetailCard(base);
                            } catch {
                              setDetailCard(card);
                            }
                          })();
                        } else {
                          setDetailCard(card);
                        }
                      }}
                    />
                  ))}
                </div>
              )}

              {videoList.length > 0 && displayTotalPages > 1 && (
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
                    {page + 1} / {displayTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(displayTotalPages - 1, p + 1))}
                    disabled={page === displayTotalPages - 1}
                    className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            // 接口 GET .../cases/page 的 reportType：市场洞察=MARKET_INSIGHT，策划方案=STRATEGY_CASE
            <ReportCasesShowcaseGrid
              key={activeCaseCategory}
              reportType={activeCaseCategory === 'market' ? 'MARKET_INSIGHT' : 'STRATEGY_CASE'}
              pageSize={16}
              gridClassName="grid grid-cols-2 lg:grid-cols-4 gap-2"
              paginationClassName="mt-4"
            />
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
