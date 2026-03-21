import { useTranslation } from 'react-i18next';
import { Play, Volume2, VolumeX, Eye, Heart, ShoppingCart, TrendingUp, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** 爆款视频瀑布流单卡数据结构 */
export interface TrendingVideoCardData {
  id: string;
  coverUrl?: string;
  videoUrl?: string;
  originalLink?: string;
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

export interface TrendingVideoCardProps {
  card: TrendingVideoCardData;
  /** 是否静音（受控） */
  isMuted?: boolean;
  /** 切换静音 */
  onMutedToggle?: () => void;
  /** 视频元素 ref 回调，用于父组件 hover 时播放/暂停 */
  videoRef?: (el: HTMLVideoElement | null) => void;
  /** 点击视频区域（如打开大图/预览） */
  onVideoClick?: () => void;
  /** 点击「原链接」 */
  onOriginalLink?: () => void;
  /** 点击「复刻」 */
  onReplicate?: () => void;
  /** 复刻按钮文案覆盖（如「已选择」） */
  replicateLabel?: string;
  /** 复刻按钮是否禁用（如已选择时） */
  replicateDisabled?: boolean;
  /** 入场动画延迟（ms） */
  animationDelay?: number;
  className?: string;
}

/**
 * 爆款视频瀑布流单卡组件。
 * 包含：视频预览、时长/静音、标题、点赞、视频解析、数据指标、卖点命中率、原链接/复刻按钮。
 */
export function TrendingVideoCard({
  card,
  isMuted = false,
  onMutedToggle,
  videoRef,
  onVideoClick,
  onOriginalLink,
  onReplicate,
  replicateLabel,
  replicateDisabled = false,
  animationDelay = 0,
  className,
}: TrendingVideoCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'overflow-hidden w-full min-w-0',
        'rounded-2xl border border-border/50 bg-card/95 dark:bg-card/90',
        'shadow-[0_1px_3px_hsl(var(--foreground)/0.06),0_2px_8px_hsl(var(--foreground)/0.04)]',
        'hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.08),0_8px_24px_hsl(var(--foreground)/0.06)]',
        'hover:-translate-y-1 hover:border-border/80',
        'transition-all duration-300 ease-out',
        'opacity-0 animate-trending-card-enter group',
        className
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
    >
      {/* 视频预览区 */}
      <div
        className={cn(
          'relative w-full aspect-[9/16] max-h-[320px] bg-muted/80 rounded-t-2xl overflow-hidden',
          card.videoUrl && 'cursor-pointer'
        )}
        onClick={onVideoClick}
      >
        {card.videoUrl ? (
          <video
            ref={videoRef}
            src={card.videoUrl}
            muted={isMuted}
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 pointer-events-none"
          />
        ) : card.coverUrl ? (
          <img
            src={card.coverUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Play className="w-12 h-12 text-muted-foreground/60" />
          </div>
        )}
        <span className="absolute left-2.5 bottom-2.5 text-xs font-medium text-white/95 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
          {card.duration}
        </span>
        {card.videoUrl && onMutedToggle && (
          <button
            type="button"
            className="absolute right-2.5 bottom-2.5 p-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white/90 transition-opacity duration-200 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30"
            onClick={(e) => {
              e.stopPropagation();
              onMutedToggle();
            }}
            aria-label={isMuted ? t('tiktokTrendingVideo.unmute', { defaultValue: '打开声音' }) : t('tiktokTrendingVideo.mute', { defaultValue: '静音' })}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* 详情区 */}
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
        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-full gap-1.5 h-10 font-medium transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onOriginalLink?.();
            }}
            disabled={!card.originalLink}
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            {t('tiktokTrendingVideo.originalLink')}
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={replicateDisabled}
            className="flex-1 rounded-full gap-1.5 h-10 font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
            onClick={(e) => {
              e.stopPropagation();
              onReplicate?.();
            }}
          >
            <Copy className="w-4 h-4 shrink-0" />
            {replicateLabel ?? t('tiktokTrendingVideo.replicate')}
          </Button>
        </div>
      </div>
    </div>
  );
}
