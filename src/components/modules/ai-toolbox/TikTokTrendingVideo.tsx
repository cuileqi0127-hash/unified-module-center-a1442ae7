import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Sparkles, Tag, ChevronLeft, X, Play, Volume2, VolumeX, Eye, Heart, ShoppingCart, TrendingUp, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { categoryTreeZh, categoryTreeEn, type CategoryTree } from '@/data/tiktok-categories';
import { CategoryCascader } from './CategoryCascader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import {
  submitTiktokInsightJob,
  pollTiktokInsightJobStatus,
  getTiktokInsightJobResult,
  type TiktokInsightVideoItem,
} from '@/services/tiktokInsightApi';
import { TiktokTrendingVideoHistorySheet } from './TiktokTrendingVideoHistorySheet';
import { MediaViewer } from './MediaViewer';

const cardGlass = cn(
  'rounded-2xl border-0 overflow-hidden',
  'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl',
  'shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.06)]',
  'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.3)]',
  'transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5'
);

export interface TrendingVideoCard {
  id: string;
  coverUrl?: string;
  /** 视频地址，有值时卡片内展示视频、支持 hover 播放/暂停，一键复刻可带入复刻视频页 */
  videoUrl?: string;
  duration: string;
  title: string;
  likesShort: string;
  analysis: string;
  views: string;
  likes: string;
  cartOrConversions: string;
  growthRate: string;
  sellingPointHitRate: number;
}

interface TikTokTrendingVideoProps {
  onNavigate?: (itemId: string) => void;
}

/** 数字转短格式，如 9957084 -> "10.0M", 34064 -> "34.1K" */
function formatShortNum(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** 将接口返回的视频项映射为瀑布流卡片 */
function mapVideoItemToCard(item: TiktokInsightVideoItem, index: number): TrendingVideoCard {
  const id = item.videoId != null ? String(item.videoId) : `rank-${item.rank ?? index}`;
  const videoUrl = item.downloadUrl;
  const analysisParts: string[] = [];
  if (item.hashtags) analysisParts.push(item.hashtags);
  if (item.strategy) analysisParts.push(`策略:${item.strategy}`);
  const analysis = analysisParts.length ? analysisParts.join('、') : '';
  const conversionRate = item.conversionRate != null ? `${(item.conversionRate * 100).toFixed(1)}%` : '—';
  return {
    id,
    videoUrl: videoUrl || undefined,
    duration: item.duration ?? '0:00',
    title: item.title ?? '',
    likesShort: formatShortNum(item.likes),
    analysis,
    views: formatShortNum(item.views),
    likes: formatShortNum(item.likes),
    cartOrConversions: item.sales != null ? formatShortNum(item.sales) : '—',
    growthRate: conversionRate,
    sellingPointHitRate: item.sellingPointMatch ?? 0,
  };
}

export function TikTokTrendingVideo({ onNavigate }: TikTokTrendingVideoProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh-');
  const categoryTree: CategoryTree = isZh ? categoryTreeZh : categoryTreeEn;

  const [view, setView] = useState<'input' | 'result'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isLoadingHistoryResult, setIsLoadingHistoryResult] = useState(false);
  const [formData, setFormData] = useState({
    categoryLevel3: '',
    sellingPoints: [] as string[],
  });
  const [sellingPointInput, setSellingPointInput] = useState('');
  const [videoCards, setVideoCards] = useState<TrendingVideoCard[]>([]);
  const [removingSellingPointIndex, setRemovingSellingPointIndex] = useState<number | null>(null);
  const [cardMutedMap, setCardMutedMap] = useState<Record<string, boolean>>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const videoRefsMap = useRef<Map<string, HTMLVideoElement>>(new Map());

  const viewerItems = useMemo(
    () =>
      videoCards
        .filter((c) => c.videoUrl)
        .map((c) => ({
          id: c.id,
          url: c.videoUrl!,
          type: 'video' as const,
          prompt: c.title,
        })),
    [videoCards]
  );

  const setVideoRef = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) videoRefsMap.current.set(id, el);
    else videoRefsMap.current.delete(id);
  }, []);

  useEffect(() => {
    if (removingSellingPointIndex === null) return;
    const timer = setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        sellingPoints: prev.sellingPoints.filter((_, j) => j !== removingSellingPointIndex),
      }));
      setRemovingSellingPointIndex(null);
    }, 200);
    return () => clearTimeout(timer);
  }, [removingSellingPointIndex]);

  const handleGenerate = async () => {
    const sellingPointsList = formData.sellingPoints.filter((s) => s.trim()).map((s) => s.trim());
    if (!formData.categoryLevel3.trim() || sellingPointsList.length === 0) return;
    setIsLoading(true);
    try {
      const submitRes = await submitTiktokInsightJob({
        keyword: formData.categoryLevel3.trim(),
        sellingPoints: sellingPointsList,
      });
      const jobId = submitRes?.data?.jobId;
      if (jobId == null) {
        toast.error(submitRes?.msg ?? t('tiktokTrendingVideo.submitFailed', { defaultValue: '提交任务失败' }));
        return;
      }
      const statusData = await pollTiktokInsightJobStatus(jobId);
      if (statusData.status === 'failed') {
        const msg = statusData.errorMessage || statusData.errorCode || t('tiktokTrendingVideo.taskFailed', { defaultValue: '任务执行失败' });
        toast.error(msg);
        return;
      }
      const resultRes = await getTiktokInsightJobResult(jobId);
      const videos = resultRes?.data?.videos;
      if (!Array.isArray(videos) || videos.length === 0) {
        setVideoCards([]);
        toast.info(t('tiktokTrendingVideo.noVideos', { defaultValue: '暂无视频结果' }));
      } else {
        setVideoCards(videos.map((v, i) => mapVideoItemToCard(v, i)));
      }
      setView('result');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('tiktokTrendingVideo.submitFailed', { defaultValue: '提交任务失败' });
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplicate = (card: TrendingVideoCard) => {
    if (card.videoUrl) {
      try {
        sessionStorage.setItem('videoReplicationInitialVideoUrl', card.videoUrl);
      } catch {
        // ignore
      }
    }
    onNavigate?.('reference-to-video');
  };

  const handleSelectHistoryJob = async (jobId: string) => {
    setHistoryOpen(false);
    setIsLoadingHistoryResult(true);
    try {
      const resultRes = await getTiktokInsightJobResult(jobId);
      const videos = resultRes?.data?.videos;
      if (!Array.isArray(videos) || videos.length === 0) {
        setVideoCards([]);
        toast.info(t('tiktokTrendingVideo.noVideos', { defaultValue: '暂无视频结果' }));
      } else {
        setVideoCards(videos.map((v, i) => mapVideoItemToCard(v, i)));
      }
      setView('result');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('tiktokTrendingVideo.historyLoadResultFailed', { defaultValue: '加载任务结果失败' });
      toast.error(msg);
    } finally {
      setIsLoadingHistoryResult(false);
    }
  };

  const historyLabels = {
    title: t('tiktokTrendingVideo.historyRecords'),
    triggerButton: t('tiktokTrendingVideo.historyRecords'),
    empty: t('tiktokTrendingVideo.historyEmpty'),
    loadFailed: t('tiktokTrendingVideo.historyLoadFailed'),
    total: t('tiktokTrendingVideo.historyTotal', { total: 0 }).replace('0', '{{total}}'),
    prevPage: t('tiktokTrendingVideo.prevPage'),
    nextPage: t('tiktokTrendingVideo.nextPage'),
    statusCompleted: t('tiktokTrendingVideo.statusCompleted'),
    statusProcessing: t('tiktokTrendingVideo.statusProcessing'),
    statusFailed: t('tiktokTrendingVideo.statusFailed'),
    statusQueued: t('tiktokTrendingVideo.statusQueued'),
  };

  if (view === 'input') {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/20 overflow-hidden opacity-0 animate-page-enter">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">{t('tiktokTrendingVideo.title')}</h1>
              <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                {t('tiktokTrendingVideo.titleTag')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('tiktokTrendingVideo.subtitle')}</p>
          </div>
          <TiktokTrendingVideoHistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            onSelectJob={handleSelectHistoryJob}
            labels={historyLabels}
            onLoadError={(msg) => toast.error(msg)}
          />
        </header>

        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-6 md:p-10 relative">
          {isLoadingHistoryResult && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
              <LoadingSpinner className="h-8 w-8 text-primary" />
            </div>
          )}
          <div className="w-full max-w-[500px]">
            <div className={cn(cardGlass, 'p-6 md:p-8')}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t('tiktokTrendingVideo.category')} <span className="text-destructive/90">*</span>
                  </Label>
                  <CategoryCascader
                    tree={categoryTree}
                    value={formData.categoryLevel3}
                    onChange={(v) => setFormData({ ...formData, categoryLevel3: v })}
                    placeholder={t('tiktokTrendingVideo.categoryPlaceholderSelect')}
                    triggerClassName="border-border/80 bg-black/[0.02] dark:bg-white/[0.04] focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="sellingPoints"
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t('tiktokTrendingVideo.sellingPoints')} <span className="text-destructive/90">*</span>
                  </Label>
                  <div
                    className={cn(
                      'min-h-11 rounded-xl border border-border/80 bg-black/[0.02] dark:bg-white/[0.04] px-3 py-2 flex flex-wrap items-center gap-2',
                      'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-colors duration-200',
                    )}
                  >
                    <span className="text-muted-foreground/60 shrink-0">
                      <Tag className="w-4 h-4" />
                    </span>
                    {formData.sellingPoints.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className={cn(
                          'inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-md bg-[#333] text-sm text-[#fff]',
                          'animate-tag-in transition-all duration-200 ease-out',
                          removingSellingPointIndex === i && 'opacity-0 scale-90 pointer-events-none'
                        )}
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          aria-label={t('tiktokTrendingVideo.removeTag')}
                          className="p-0.5 rounded text-[#eee] hover:text-[#fff]"
                          onClick={() => setRemovingSellingPointIndex(i)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      id="sellingPoints"
                      type="text"
                      placeholder={formData.sellingPoints.length === 0 ? t('tiktokTrendingVideo.sellingPointsPlaceholder') : ''}
                      value={sellingPointInput}
                      onChange={(e) => setSellingPointInput(e.target.value)}
                      onBlur={() => setSellingPointInput('')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const v = sellingPointInput.trim();
                          if (v) {
                            setFormData({ ...formData, sellingPoints: [...formData.sellingPoints, v] });
                            setSellingPointInput('');
                          }
                        }
                      }}
                      className="flex-1 min-w-[120px] h-7 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
              </div>

              <Button
                className="mt-6 h-12 w-full rounded-xl gap-2 text-[15px] font-medium bg-primary hover:bg-primary/90"
                onClick={handleGenerate}
                disabled={!formData.categoryLevel3.trim() || formData.sellingPoints.filter((s) => s.trim()).length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="h-4 w-4 text-white" />
                    {t('tiktokTrendingVideo.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t('tiktokTrendingVideo.generateReport')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/20 overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">{t('tiktokTrendingVideo.title')}</h1>
            <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
              {t('tiktokTrendingVideo.titleTag')}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('tiktokTrendingVideo.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setView('input')}>
          <ChevronLeft className="w-4 h-4" />
          {t('tiktokTrendingVideo.backToRegenerate')}
        </Button>
      </header>
      <div className="flex-1 min-h-0 relative flex flex-col overflow-auto">
        {videoCards.length > 0 && (
          <div className="p-6">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {videoCards.map((card, index) => (
                <div
                  key={card.id}
                  className={cn(
                    'overflow-hidden opacity-0 w-full min-w-0',
                    'rounded-2xl border border-border/50 bg-card/95 dark:bg-card/90',
                    'shadow-[0_1px_3px_hsl(var(--foreground)/0.06),0_2px_8px_hsl(var(--foreground)/0.04)]',
                    'hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.08),0_8px_24px_hsl(var(--foreground)/0.06)]',
                    'hover:-translate-y-1 hover:border-border/80',
                    'transition-all duration-300 ease-out',
                    'animate-trending-card-enter group'
                  )}
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
                  onMouseEnter={() => {
                    if (card.videoUrl) videoRefsMap.current.get(card.id)?.play().catch(() => {});
                  }}
                  onMouseLeave={() => {
                    if (card.videoUrl) videoRefsMap.current.get(card.id)?.pause();
                  }}
                >
                  <div
                    className={cn(
                      'relative w-full aspect-[9/16] max-h-[320px] bg-muted/80 rounded-t-2xl overflow-hidden',
                      card.videoUrl && 'cursor-pointer'
                    )}
                    onDoubleClick={() => {
                      if (!card.videoUrl) return;
                      const idx = viewerItems.findIndex((i) => i.id === card.id);
                      if (idx >= 0) {
                        setViewerIndex(idx);
                        setViewerOpen(true);
                      }
                    }}
                  >
                    {card.videoUrl ? (
                      <video
                        ref={(el) => setVideoRef(card.id, el)}
                        src={card.videoUrl}
                        muted={cardMutedMap[card.id] ?? false}
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : card.coverUrl ? (
                      <img src={card.coverUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <Play className="w-12 h-12 text-muted-foreground/60" />
                      </div>
                    )}
                    <span className="absolute left-2.5 bottom-2.5 text-xs font-medium text-white/95 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                      {card.duration}
                    </span>
                    <button
                      type="button"
                      className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-black/30 backdrop-blur-sm text-white/90 transition-opacity duration-200 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (card.videoUrl) {
                          setCardMutedMap((prev) => ({ ...prev, [card.id]: !(prev[card.id] ?? false) }));
                        }
                      }}
                      aria-label={cardMutedMap[card.id] ? t('tiktokTrendingVideo.unmute', { defaultValue: '打开声音' }) : t('tiktokTrendingVideo.mute', { defaultValue: '静音' })}
                    >
                      {card.videoUrl && (cardMutedMap[card.id] ?? false) ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-2 flex-1">{card.title}</h3>
                      <span className="shrink-0 text-xs font-medium text-primary">点赞: {card.likesShort}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">{t('tiktokTrendingVideo.videoAnalysis')}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{card.analysis}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        {card.views}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 shrink-0" />
                        {card.likes}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                        {card.cartOrConversions}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        {card.growthRate}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">{t('tiktokTrendingVideo.sellingPointHitRate')}</p>
                      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                          style={{ width: `${card.sellingPointHitRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground mt-0.5 inline-block">{card.sellingPointHitRate}%</span>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full rounded-xl gap-2 mt-1 h-10 font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                      onClick={() => handleReplicate(card)}
                    >
                      <Copy className="w-4 h-4" />
                      {t('tiktokTrendingVideo.oneClickReplicate')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <MediaViewer
        items={viewerItems}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
