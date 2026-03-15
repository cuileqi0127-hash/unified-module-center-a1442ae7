import { Play, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CandidateVideo } from './useSkillsEngine';

interface Props {
  videos: CandidateVideo[];
  onShowPanel: () => void;
  active?: boolean;
}

export function VideoCandidateCollapsible({ videos, onShowPanel, active }: Props) {
  if (videos.length === 0) return null;

  return (
    <button
      onClick={onShowPanel}
      className={cn(
        "w-full rounded-xl border px-4 py-3 flex items-center justify-between transition-colors",
        active
          ? "border-foreground/30 bg-foreground/5 ring-1 ring-foreground/10"
          : "border-border/30 bg-background hover:bg-muted/20"
      )}
    >
      <div className="flex items-center gap-2">
        <Play className={cn("w-4 h-4", active ? "text-foreground" : "text-foreground/60")} />
        <span className="text-sm font-medium text-foreground">爆款视频列表</span>
        <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded-full">
          {videos.length} 条
        </span>
      </div>
      <ChevronRight className={cn("w-4 h-4 text-muted-foreground/50", active && "text-foreground/60")} />
    </button>
  );
}