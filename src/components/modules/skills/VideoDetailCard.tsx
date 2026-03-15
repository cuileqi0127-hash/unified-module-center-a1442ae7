import { useState } from 'react';
import { X, Play, Eye, Heart, ShoppingCart, TrendingUp, Volume2, ExternalLink, Maximize2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CandidateVideo } from './useSkillsEngine';

const coverColors = [
  'from-rose-300 to-orange-200',
  'from-blue-300 to-cyan-200',
  'from-violet-300 to-pink-200',
  'from-emerald-300 to-teal-200',
  'from-amber-300 to-yellow-200',
];

interface VideoDetailCardProps {
  video: CandidateVideo;
  index?: number;
  isSelected?: boolean;
  onSelect: (video: CandidateVideo) => void;
  onClose: () => void;
}

export function VideoDetailCard({ video, index = 0, isSelected, onSelect, onClose }: VideoDetailCardProps) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/20 flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-foreground">视频详情</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 py-4">
          {/* Card container */}
          <div className="rounded-2xl border border-border/30 bg-card overflow-hidden shadow-sm">
            {/* Video Preview - full width rounded top */}
            <div
              className={`relative aspect-[9/14] bg-gradient-to-br ${coverColors[index % coverColors.length]} flex items-center justify-center cursor-pointer`}
              onClick={() => setFullscreen(true)}
            >
              <Play className="w-14 h-14 text-foreground/15" />

              {/* Duration badge - bottom left */}
              <div className="absolute bottom-3 left-3 bg-foreground/80 text-background text-xs font-mono px-2.5 py-1 rounded-lg">
                {video.duration}
              </div>

              {/* Volume icon - bottom right */}
              <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-foreground/25 backdrop-blur-sm flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-background" />
              </div>
            </div>

            {/* Content area */}
            <div className="p-5 space-y-4">
              {/* Title & Likes */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-medium text-foreground leading-snug flex-1">{video.title}</h3>
                <div className="shrink-0 text-right">
                  <span className="text-xs text-muted-foreground">点赞: </span>
                  <span className="text-sm font-semibold text-foreground">{video.likes}</span>
                </div>
              </div>

              {/* Analysis */}
              {video.strategy && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{video.analysis || '视频解析'}</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    策略:{video.strategy}
                  </p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{video.views}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{video.likes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{video.salesCount ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{video.growthRate ?? '0%'}</span>
                </div>
              </div>

              {/* Selling point hit rate */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">卖点命中率</p>
                <Progress value={video.sellingPointHitRate ?? 0} className="h-1.5" />
                <p className="text-sm font-semibold text-foreground mt-1.5">{video.sellingPointHitRate ?? 0}%</p>
              </div>

              {/* One-click replicate button */}
              <Button
                onClick={() => onSelect(video)}
                className={cn(
                  'w-full rounded-full h-12 font-medium text-sm gap-2',
                  isSelected
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                )}
              >
                {isSelected ? (
                  <span className="flex items-center gap-2">已选择此视频</span>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    一键复刻
                  </>
                )}
              </Button>

              {/* TikTok link */}
              {video.tiktokUrl && (
                <div className="flex justify-center">
                  <a
                    href={video.tiktokUrl}
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
        </div>
      </ScrollArea>

      {/* Fullscreen dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-2xl p-0 rounded-2xl overflow-hidden">
          <div className={`aspect-[9/16] max-h-[80vh] bg-gradient-to-br ${coverColors[index % coverColors.length]} flex items-center justify-center`}>
            <Play className="w-16 h-16 text-foreground/20" />
            <div className="absolute bottom-4 left-4 bg-foreground/70 text-background text-sm font-mono px-3 py-1 rounded-md">
              {video.duration}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
