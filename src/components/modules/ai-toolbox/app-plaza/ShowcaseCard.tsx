import { Play, Heart, MessageSquare } from 'lucide-react';
import logoDark from '@/assets/logo_dark.svg';

export interface ShowcaseCardDetail {
  author?: string;
  businessType?: string;
  purpose?: string;
  audience?: string;
  techHighlight?: string;
  /** 灵感库：视频源地址（详情播放/下载） */
  sourceUrl?: string;
  /** 灵感库：封面预览图（用于 video poster） */
  previewUrl?: string | null;
  stats?: { views: string; likes: string; comments: string; shares: string };
  tags?: string[];
}

export interface ShowcaseCardData {
  title: string;
  desc: string;
  hoverText: string;
  image: string;
  miniTitle: string;
  targetId: string;
  category: string;
  detail?: ShowcaseCardDetail;
  reportUrl?: string;
}

export function ShowcaseCard({
  card,
  onClick,
  variant = 'default',
}: {
  card: ShowcaseCardData;
  onClick: () => void;
  variant?: 'default' | 'visual';
}) {
  const isVideoCard = card.category === 'video';

  if (variant === 'visual') {
    return (
      <div className="relative group cursor-pointer" onClick={onClick}>
        <div className="relative overflow-hidden rounded-[16px] aspect-[4/3] border border-border/20">
          {isVideoCard ? (
            <video
              src={card.image}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <img
              src={card.image}
              alt={card.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-background text-xs font-medium leading-snug line-clamp-2 drop-shadow-sm">
              {card.title}
            </p>
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-[16px]">
            <p className="text-background text-[11px] leading-[1.4] font-medium px-3 text-center">
              {card.hoverText}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative group cursor-pointer"
      onClick={onClick}
    >

      {/* Main card */}
      <div className="relative overflow-hidden bg-muted/40 dark:bg-muted/20 rounded-[16px] backdrop-blur-[5px] z-10 border border-border/20">
        {/* Floating mini report card */}
        <div className="absolute flex items-center justify-center right-[-10px] top-[2px] w-[90px] z-10 transition-transform duration-300 ease-out group-hover:translate-x-[-6px] group-hover:translate-y-[-4px]">
          <div className="flex-none rotate-[-6deg] transition-transform duration-300 ease-out group-hover:rotate-[-4deg]">
            <div className="bg-background overflow-hidden rounded-[4px] shadow-[0px_2px_16px_0px_rgba(35,35,35,0.18)] w-[80px] h-[104px] relative">
              {/* Window dots */}
              <div className="flex items-center gap-[2px] px-[5px] py-[3px]">
                <div className="w-[2.5px] h-[2.5px] rounded-full bg-destructive" />
                <div className="w-[2.5px] h-[2.5px] rounded-full bg-amber-400" />
                <div className="w-[2.5px] h-[2.5px] rounded-full bg-emerald-400" />
              </div>
              {/* Title area */}
              <div className="flex items-start gap-[3px] px-[5px] pt-[1px] pb-[3px]">
                <div className="flex flex-col gap-[3px] flex-1 min-w-0">
                  <p className="font-semibold leading-normal line-clamp-1 text-[5px] text-foreground">
                    {card.miniTitle}
                  </p>
                  <div className="flex items-center gap-[2px]">
                    <div className="w-[6px] h-[6px] rounded-full overflow-hidden bg-muted">
                      <img alt="OranAI" src={logoDark} className="w-full h-full object-contain" />
                    </div>
                    <p className="font-medium leading-normal text-[4px] text-muted-foreground truncate">
                      OranAI
                    </p>
                  </div>
                  <div className="flex items-center gap-[2px]">
                    <div className="flex items-center gap-px">
                      <Play className="w-[3.5px] h-[3.5px] text-muted-foreground fill-muted-foreground" />
                      <p className="font-medium text-[3.5px] text-muted-foreground">1080w</p>
                    </div>
                    <div className="flex items-center gap-px">
                      <Heart className="w-[3.5px] h-[3.5px] text-muted-foreground" />
                      <p className="font-medium text-[3.5px] text-muted-foreground">28w</p>
                    </div>
                    <div className="flex items-center gap-px">
                      <MessageSquare className="w-[3.5px] h-[3.5px] text-muted-foreground" />
                      <p className="font-medium text-[3.5px] text-muted-foreground">12w</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Thumbnail */}
              <div className="relative h-[70px] rounded-[3px] mx-[5px] mb-[5px] overflow-hidden">
                {isVideoCard ? (
                  <video
                    src={card.image}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 max-w-none object-cover w-full h-full"
                  />
                ) : (
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 max-w-none object-cover w-full h-full"
                    src={card.image}
                  />
                )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-muted to-transparent" />
            </div>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[16px] bg-foreground/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="text-background text-[11px] leading-[1.4] font-medium">
            {card.hoverText}
          </p>
        </div>

        {/* Bottom text area */}
        <div className="relative h-[152px]">
          <div className="absolute left-0 bottom-0 flex flex-col gap-[4px] items-start justify-end p-[14px] py-[12px] w-full">
            <div className="relative shrink-0 w-[65%] whitespace-pre-wrap mb-0 group-hover:opacity-0 transition-opacity duration-200">
              <p className="font-medium leading-[1.35] text-[13px] text-foreground">
                {card.title}
              </p>
              <p className="mt-[6px] font-normal leading-[1.35] text-[10px] text-muted-foreground line-clamp-2">
                {card.desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
