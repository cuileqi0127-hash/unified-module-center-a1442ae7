import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Eye, Heart, MessageSquare, Share2, Download, Sparkles, Play, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ShowcaseCardData } from './ShowcaseCard';

interface ShowcaseDetailDialogProps {
  card: ShowcaseCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplicate?: () => void;
}

export function ShowcaseDetailDialog({ card, open, onOpenChange, onReplicate }: ShowcaseDetailDialogProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  }, []);

  const goFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
    else if ((v as HTMLVideoElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) (v as HTMLVideoElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
    v.play();
    setIsPlaying(true);
  }, []);

  if (!card) return null;

  const isVideo = card.category === 'video';
  const isImage = card.category === 'image';
  const detail = card.detail;

  // Image dialog: simple layout
  if (isImage) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{card.title}</DialogTitle>
          <div className="relative aspect-[4/3] bg-muted/30">
            <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
          </div>
          <div className="p-5 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{card.title}</h2>
            <p className="text-sm text-muted-foreground">{card.desc}</p>
            <Button variant="outline" className="w-full rounded-full h-10 gap-2">
              <Download className="w-4 h-4" />
              {t('showcaseDetail.downloadImage')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Video dialog: full detail layout with playable video
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setIsPlaying(false); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{card.title}</DialogTitle>
        <div className="flex flex-col sm:flex-row sm:min-h-[420px]">
          {/* Video preview */}
          <div
            className="shrink-0 flex items-center justify-center bg-foreground/5 relative cursor-pointer sm:w-[320px] aspect-[9/16] sm:aspect-auto sm:self-stretch"
            onClick={togglePlay}
          >
            <video
              ref={videoRef}
              src={card.image}
              className="w-full h-full object-cover"
              onEnded={() => setIsPlaying(false)}
            />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-foreground/40 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-5 h-5 text-background ml-0.5" />
                </div>
              </div>
            )}

            {/* Fullscreen button */}
            <button
              onClick={(e) => { e.stopPropagation(); goFullscreen(); }}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-foreground/30 backdrop-blur-sm text-background hover:bg-foreground/50 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Details */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col gap-5 min-w-0">
            <h2 className="text-xl font-semibold text-foreground leading-tight">{card.title}</h2>

            {detail && (
              <div className="space-y-2 text-sm">
                {detail.author && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{t('showcaseDetail.publisher')}:</span>
                    <span className="text-foreground">{detail.author}</span>
                  </div>
                )}
                {detail.businessType && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{t('showcaseDetail.businessType')}:</span>
                    <span className="text-foreground">{detail.businessType}</span>
                  </div>
                )}
                {detail.purpose && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{t('showcaseDetail.purpose')}:</span>
                    <span className="text-foreground">{detail.purpose}</span>
                  </div>
                )}
                {detail.audience && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{t('showcaseDetail.audience')}:</span>
                    <span className="text-foreground">{detail.audience}</span>
                  </div>
                )}
                {detail.techHighlight && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{t('showcaseDetail.techHighlight')}:</span>
                    <span className="text-foreground">{detail.techHighlight}</span>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            {detail?.stats && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{detail.stats.views}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{detail.stats.likes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{detail.stats.comments}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{detail.stats.shares}</span>
                </div>
              </div>
            )}

            {/* Tags */}
            {detail?.tags && detail.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="rounded-full text-xs font-normal px-3 py-1">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-auto pt-2">
              <Button variant="outline" className="flex-1 rounded-full h-11 gap-2">
                <Download className="w-4 h-4" />
                下载视频
              </Button>
              <Button
                onClick={() => { onReplicate?.(); onOpenChange(false); }}
                className="flex-1 rounded-full h-11 gap-2 bg-foreground text-background hover:bg-foreground/90"
              >
                <Sparkles className="w-4 h-4" />
                复制爆款
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
