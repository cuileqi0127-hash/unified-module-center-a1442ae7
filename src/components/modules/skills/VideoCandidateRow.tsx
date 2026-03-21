import { useState } from 'react';
import { Play, Volume2, X, ChevronLeft, ChevronRight, Eye, Heart, ShoppingCart, TrendingUp, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CandidateVideo } from './useSkillsEngine';
import { TrendingVideoCard, type TrendingVideoCardData } from '@/components/modules/ai-toolbox/TrendingVideoCard';
import { cn } from '@/lib/utils';

/** 将 Skills 候选视频映射为爆款卡片组件所需数据结构 */
function candidateToCardData(v: CandidateVideo): TrendingVideoCardData {
  const analysis = v.strategy ? `策略:${v.strategy}` : v.analysis ?? '';
  return {
    id: v.id,
    coverUrl: v.cover || undefined,
    originalLink: v.tiktokUrl || undefined,
    duration: v.duration,
    title: v.title,
    likesShort: v.likes,
    analysis,
    views: v.views,
    likes: v.likes,
    cartOrConversions: v.salesCount != null ? String(v.salesCount) : '—',
    growthRate: v.growthRate ?? '0%',
    sellingPointHitRate: v.sellingPointHitRate ?? 0,
  };
}

interface VideoCandidateRowProps {
  videos: CandidateVideo[];
  onSelect: (video: CandidateVideo) => void;
  onPreview?: (video: CandidateVideo) => void;
  selectedVideoId?: string | null;
  disabled?: boolean;
}

const coverColors = [
  'from-violet-200 to-violet-100',
  'from-blue-200 to-blue-100',
  'from-amber-200 to-amber-100',
  'from-emerald-200 to-emerald-100',
  'from-rose-200 to-rose-100',
];

export function VideoCandidateRow({ videos, onSelect, onPreview, selectedVideoId, disabled }: VideoCandidateRowProps) {
  const [detailVideo, setDetailVideo] = useState<CandidateVideo | null>(null);
  const [detailIndex, setDetailIndex] = useState(0);
  const [fullscreenVideo, setFullscreenVideo] = useState<CandidateVideo | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const displayVideos = videos.slice(0, 6);

  const openDetail = (video: CandidateVideo, idx: number) => {
    setDetailVideo(video);
    setDetailIndex(idx);
  };

  const openFullscreen = (video: CandidateVideo, idx: number) => {
    setFullscreenVideo(video);
    setFullscreenIndex(idx);
  };

  const navigateFullscreen = (dir: -1 | 1) => {
    const newIdx = fullscreenIndex + dir;
    if (newIdx >= 0 && newIdx < displayVideos.length) {
      setFullscreenIndex(newIdx);
      setFullscreenVideo(displayVideos[newIdx]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {displayVideos.map((video, i) => (
          <TrendingVideoCard
            key={video.id}
            card={candidateToCardData(video)}
            onVideoClick={() => openDetail(video, i)}
            onOriginalLink={() => video.tiktokUrl && window.open(video.tiktokUrl, '_blank', 'noopener,noreferrer')}
            onReplicate={() => !disabled && onSelect(video)}
            replicateLabel={selectedVideoId === video.id ? '已选择' : undefined}
            replicateDisabled={disabled && selectedVideoId !== video.id}
            animationDelay={i * 40}
            className="cursor-pointer"
          />
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailVideo} onOpenChange={(open) => !open && setDetailVideo(null)}>
        <DialogContent className="max-w-md p-0 rounded-2xl overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          {detailVideo && (
            <ScrollArea className="max-h-[85vh]">
              <div className="rounded-2xl overflow-hidden">
                {/* Video cover */}
                <div
                  className={`relative aspect-[9/14] bg-gradient-to-br ${coverColors[detailIndex % coverColors.length]} flex items-center justify-center cursor-pointer`}
                  onClick={() => { setDetailVideo(null); openFullscreen(detailVideo, detailIndex); }}
                >
                  <Play className="w-14 h-14 text-foreground/15" />
                  <div className="absolute bottom-3 left-3 bg-foreground/80 text-background text-xs font-mono px-2.5 py-1 rounded-lg">
                    {detailVideo.duration}
                  </div>
                  <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-foreground/25 backdrop-blur-sm flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-background" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-medium text-foreground leading-snug flex-1">{detailVideo.title}</h3>
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-muted-foreground">点赞: </span>
                      <span className="text-sm font-semibold text-foreground">{detailVideo.likes}</span>
                    </div>
                  </div>

                  {detailVideo.strategy && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{detailVideo.analysis || '视频解析'}</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">策略:{detailVideo.strategy}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{detailVideo.views}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{detailVideo.likes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{detailVideo.salesCount ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{detailVideo.growthRate ?? '0%'}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">卖点命中率</p>
                    <Progress value={detailVideo.sellingPointHitRate ?? 0} className="h-1.5" />
                    <p className="text-sm font-semibold text-foreground mt-1.5">{detailVideo.sellingPointHitRate ?? 0}%</p>
                  </div>

                  <Button
                    onClick={() => { onSelect(detailVideo); setDetailVideo(null); }}
                    className={cn(
                      'w-full rounded-full h-12 font-medium text-sm gap-2',
                      selectedVideoId === detailVideo.id
                        ? 'bg-muted text-foreground hover:bg-muted/80'
                        : 'bg-foreground text-background hover:bg-foreground/90'
                    )}
                  >
                    <Copy className="w-4 h-4" />
                    一键复刻
                  </Button>

                  {detailVideo.tiktokUrl && (
                    <div className="flex justify-center">
                      <a
                        href={detailVideo.tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        查看 TikTok 原视频
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Video Dialog */}
      <Dialog open={!!fullscreenVideo} onOpenChange={(open) => !open && setFullscreenVideo(null)}>
        <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-none rounded-none flex items-center justify-center [&>button]:hidden">
          {fullscreenVideo && (
            <>
              {/* Counter */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/20 text-white text-sm px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 z-10">
                {fullscreenIndex + 1} / {displayVideos.length}
              </div>

              {/* Close */}
              <button
                onClick={() => setFullscreenVideo(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-md border border-white/30 flex items-center justify-center transition-colors z-10"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Video */}
              <div className="relative h-[85vh] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl">
                <div className={`w-full h-full bg-gradient-to-br ${coverColors[fullscreenIndex % coverColors.length]} flex items-center justify-center`}>
                  <Play className="w-20 h-20 text-foreground/15" />
                </div>
                {/* Title overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-background text-sm font-medium text-center leading-relaxed">
                    {fullscreenVideo.title}
                  </p>
                </div>
              </div>

              {/* Nav arrows */}
              {fullscreenIndex > 0 && (
                <button
                  onClick={() => navigateFullscreen(-1)}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-md border border-white/30 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}
              {fullscreenIndex < displayVideos.length - 1 && (
                <button
                  onClick={() => navigateFullscreen(1)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-md border border-white/30 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
