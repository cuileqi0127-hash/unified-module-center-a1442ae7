import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { categoryTreeZh, categoryTreeEn, type CategoryTree } from '@/data/tiktok-categories';
import { CategoryCascader, findPathInTree } from '@/components/ui/category-cascader';
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
import { TrendingVideoCard as TrendingVideoCardComponent, type TrendingVideoCardData } from './TrendingVideoCard';

/** @deprecated 使用 TrendingVideoCardData；保留别名便于 mapVideoItemToCard 等兼容 */
export type TrendingVideoCard = TrendingVideoCardData;

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
function mapVideoItemToCard(item: TiktokInsightVideoItem, index: number): TrendingVideoCardData {
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
    originalLink: item.url || undefined,
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
  const [videoCards, setVideoCards] = useState<TrendingVideoCardData[]>([]);
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

  const handleReplicate = (card: TrendingVideoCardData) => {
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
                  />
                  <span className="whitespace-nowrap">，</span>
                  <div className="inline-flex items-center gap-1 flex-wrap mx-1.5">
                    {formData.sellingPoints.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="inline-flex items-center gap-1 h-6 rounded-full bg-accent/10 border border-accent/20 px-2 text-xs text-accent font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setRemovingSellingPointIndex(i)}
                          className="hover:text-accent/70 transition-colors"
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
                  onMouseEnter={() => {
                    if (card.videoUrl) videoRefsMap.current.get(card.id)?.play().catch(() => {});
                  }}
                  onMouseLeave={() => {
                    if (card.videoUrl) videoRefsMap.current.get(card.id)?.pause();
                  }}
                >
                  <TrendingVideoCardComponent
                    card={card}
                    isMuted={cardMutedMap[card.id] ?? false}
                    onMutedToggle={
                      card.videoUrl
                        ? () => setCardMutedMap((prev) => ({ ...prev, [card.id]: !(prev[card.id] ?? false) }))
                        : undefined
                    }
                    videoRef={(el) => setVideoRef(card.id, el)}
                    onVideoClick={() => {
                      if (!card.videoUrl) return;
                      const idx = viewerItems.findIndex((i) => i.id === card.id);
                      if (idx >= 0) {
                        setViewerIndex(idx);
                        setViewerOpen(true);
                      }
                    }}
                    onOriginalLink={() => {
                      if (card.originalLink) window.open(card.originalLink, '_blank', 'noopener,noreferrer');
                    }}
                    onReplicate={() => handleReplicate(card)}
                    animationDelay={index * 60}
                  />
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
