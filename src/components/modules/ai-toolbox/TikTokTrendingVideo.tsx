import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowUp, X, Play, Volume2, VolumeX, Eye, Heart, ShoppingCart, TrendingUp, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { categoryTreeZh, categoryTreeEn, type CategoryTree } from '@/data/tiktok-categories';
import { CategoryCascader, findPathInTree } from './CategoryCascader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  submitTiktokInsightJob,
  pollTiktokInsightJobStatus,
  getTiktokInsightJobResult,
  type TiktokInsightVideoItem,
} from '@/services/tiktokInsightApi';
import { TiktokTrendingVideoHistorySheet } from './TiktokTrendingVideoHistorySheet';
import { MediaViewer } from './MediaViewer';

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

  const [view, setView] = useState<'input' | 'loading' | 'result'>('input');
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
    setView('loading');
    try {
      const submitRes = await submitTiktokInsightJob({
        keyword: formData.categoryLevel3.trim(),
        sellingPoints: sellingPointsList,
      });
      const jobId = submitRes?.data?.jobId;
      if (jobId == null) {
        toast.error(submitRes?.msg ?? t('tiktokTrendingVideo.submitFailed', { defaultValue: '提交任务失败' }));
        setView('input');
        return;
      }
      const statusData = await pollTiktokInsightJobStatus(jobId);
      if (statusData.status === 'failed') {
        const msg = statusData.errorMessage || statusData.errorCode || t('tiktokTrendingVideo.taskFailed', { defaultValue: '任务执行失败' });
        toast.error(msg);
        setView('input');
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
      setView('input');
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

  const loadingTips = isZh
    ? ['正在扫描 TikTok 热门视频...', '分析视频内容与卖点匹配度...', '筛选播放量最高的爆款视频...', '整理数据生成报告...']
    : ['Scanning TikTok trending videos...', 'Analyzing content and selling point match...', 'Filtering top viral videos...', 'Generating report...'];
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  useEffect(() => {
    if (view !== 'loading') return;
    const interval = setInterval(() => {
      setLoadingTipIndex((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, [view]);

  if (view === 'loading') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 max-w-md text-center"
        >
          <div className="relative w-16 h-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-[3px] border-muted/30 border-t-foreground/70"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg">🔍</span>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground/90 mb-2">
              {isZh ? '正在为你收集匹配度最高的爆款TikTok视频...' : 'Collecting top matching TikTok viral videos...'}
            </h2>
            <motion.p
              key={loadingTipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-sm text-muted-foreground"
            >
              {loadingTips[loadingTipIndex]}
            </motion.p>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 rounded-full bg-foreground/50"
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'input') {
    const canSend = formData.categoryLevel3.trim() !== '' && formData.sellingPoints.filter((s) => s.trim()).length > 0;
    const addSellingPoint = (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !formData.sellingPoints.includes(trimmed)) {
        setFormData({ ...formData, sellingPoints: [...formData.sellingPoints, trimmed] });
      }
      setSellingPointInput('');
    };
    return (
      <div className="relative min-h-full flex flex-col">
        <div className="absolute top-4 right-4 z-20">
          <TiktokTrendingVideoHistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            onSelectJob={handleSelectHistoryJob}
            labels={historyLabels}
            onLoadError={(msg) => toast.error(msg)}
          />
        </div>
        {isLoadingHistoryResult && (
          <div className="fixed inset-0 bg-background/60 flex items-center justify-center z-30">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        )}
        <div className="flex flex-col items-center justify-center p-6 md:p-8 py-[80px] my-[100px]">
          <div className="w-full max-w-2xl animate-fade-in mt-[80px]">
            <div className="text-center mb-10">
              <h1 className="text-2xl md:text-3xl font-normal tracking-tight text-[#3d3d3d]">
                TikTok 爆款视频匹配
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isZh ? '选择品类并添加卖点，一键替你收集TikTok爆款视频' : 'Select category and add selling points to collect TikTok viral videos'}
              </p>
            </div>
            <div className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md">
              <div className="p-5">
                <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
                  <span className="whitespace-nowrap">{isZh ? '帮我搜索关于' : 'Search for'}</span>
                  <CategoryCascader
                    tree={categoryTree}
                    value={formData.categoryLevel3}
                    onChange={(v) => setFormData({ ...formData, categoryLevel3: v })}
                    placeholder={isZh ? '选择品类' : 'Select category'}
                    searchPlaceholder={t('tiktokTrendingVideo.categorySearchPlaceholder')}
                    searchEmptyText={t('tiktokTrendingVideo.categorySearchEmpty')}
                    className="h-7 rounded-lg px-2.5 text-sm mx-1 inline-flex"
                    triggerClassName="h-7 rounded-lg px-2.5 text-sm border-border/30 bg-muted/20 hover:bg-muted/40"
                  />
                  <span className="whitespace-nowrap">，</span>
                  <div className="inline-flex items-center gap-1 flex-wrap mx-1.5">
                    {formData.sellingPoints.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="inline-flex items-center gap-1 h-6 rounded-full bg-muted/40 border border-border/20 px-2 text-xs text-foreground/80"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setRemovingSellingPointIndex(i)}
                          className="hover:text-foreground transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={
                        formData.sellingPoints.length === 0
                          ? (isZh ? '输入卖点，回车添加' : 'Enter selling point, press Enter')
                          : isZh ? '添加卖点...' : 'Add more...'
                      }
                      value={sellingPointInput}
                      onChange={(e) => setSellingPointInput(e.target.value)}
                      onBlur={() => {
                        if (sellingPointInput.trim()) addSellingPoint(sellingPointInput);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          if (sellingPointInput.trim()) addSellingPoint(sellingPointInput);
                          else if (canSend) handleGenerate();
                        }
                      }}
                      className="h-6 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none w-[120px]"
                    />
                  </div>
                  <span className="whitespace-nowrap">{isZh ? '的 TikTok 爆款视频' : ' TikTok viral videos'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/20">
                <div />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canSend || isLoading}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                    canSend && !isLoading
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
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/20">
        <div className="px-6 py-4 max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView('input')} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-medium text-foreground truncate">TikTok 爆款视频匹配</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                {formData.categoryLevel3
                  ? (findPathInTree(categoryTree, formData.categoryLevel3)?.join(' > ') ?? formData.categoryLevel3)
                  : isZh ? '品类' : 'Category'}
              </span>
              {formData.sellingPoints.map((p) => (
                <span key={p} className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted-foreground">
              {isZh ? '共' : ''} {videoCards.length} {isZh ? '个结果' : 'results'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative flex flex-col overflow-auto">
        {videoCards.length > 0 && (
          <div className="px-6 py-6 max-w-7xl mx-auto">
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
                    onClick={() => {
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
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 pointer-events-none"
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
