import { X, Clock, Check, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SkillTask, CandidateVideo } from './useSkillsEngine';



import pixelSearch from '@/assets/pixel-search.svg';
import pixelMemory from '@/assets/pixel-memory.svg';
import pixelPrompt from '@/assets/pixel-prompt.svg';
import pixelVideo from '@/assets/pixel-video.svg';
import expertCrawler from '@/assets/expert-crawler.png';
import expertDesigner from '@/assets/expert-designer.png';
import expertAnalyst from '@/assets/expert-analyst.png';
import expertAudio from '@/assets/expert-audio.png';
import pixelCheck from '@/assets/pixel-check.png';
import pixelWait from '@/assets/pixel-wait.png';

const expertAvatars: Record<string, string> = {
  memory: pixelMemory,
  crawler: expertCrawler,
  video: pixelVideo,
  designer: expertDesigner,
  strategist: pixelPrompt,
  analyst: expertAnalyst,
  search: pixelSearch,
  audio: expertAudio
};

interface TaskDetailPanelProps {
  task: SkillTask;
  onClose: () => void;
  selectedVideoId?: string | null;
  onVideoSelect?: (video: CandidateVideo) => void;
}

export function TaskDetailPanel({ task, onClose, selectedVideoId, onVideoSelect }: TaskDetailPanelProps) {


  // Progress calculation
  const totalSteps = task.moduleChain?.length || 1;
  const completedSteps = task.status === 'done' ? totalSteps : task.status === 'running' ? Math.floor(totalSteps / 2) : 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                {task.status === 'running' &&
                <>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    当前进度 {completedSteps}/{totalSteps}
                  </>
                }
                {task.status === 'done' &&
                <>
                    <Check className="w-3 h-3" />
                    已完成
                  </>
                }
                {task.status === 'queued' && '排队中'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Input section */}
          {task.input &&
          <div>
              <p className="text-sm text-foreground leading-relaxed">{task.input}</p>
            </div>
          }

          {/* Output section - bullet point style like Kimi */}
          {task.output &&
          <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>📄</span>
                <span>输出结果</span>
              </div>
              <div className="pl-1 space-y-1.5">
                <p className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-muted-foreground/40 mt-0.5">•</span>
                  <span>{task.output}</span>
                </p>
              </div>
            </div>
          }



          {/* Sub-tasks */}
          {task.children.length > 0 &&
          <div>
              <p className="text-xs text-muted-foreground mb-2">子任务</p>
              <div className="space-y-0">
                {task.children.map((child) => {
                const childExpert = child.expert;
                const avatarSrc = childExpert ? expertAvatars[childExpert.avatar] : undefined;
                return (
                  <div key={child.id} className="flex items-center gap-3 px-3 py-3 border-b border-border/10 last:border-b-0">
                      {/* Left: expert pixel icon */}
                      {avatarSrc ?
                    <div className={cn(
                      'w-6 h-6 shrink-0 transition-opacity',
                      child.status === 'queued' && 'opacity-30'
                    )}>
                          <img src={avatarSrc} alt={childExpert?.name || ''} className="w-full h-full object-contain" />
                        </div> :

                    <div className="w-6 h-6 shrink-0" />
                    }

                      {/* Title */}
                      <span className={cn(
                      'text-sm flex-1',
                      child.status === 'done' && 'text-foreground/70',
                      child.status === 'running' && 'text-foreground',
                      child.status === 'queued' && 'text-muted-foreground/50'
                    )}>{child.title}</span>

                      {/* Right: pixel status icon */}
                      <div className="w-4 h-4 shrink-0">
                        {child.status === 'done' ?
                      <img src={pixelCheck} alt="done" className="w-full h-full object-contain" /> :
                      child.status === 'running' ?
                      <img src={pixelWait} alt="running" className="w-full h-full object-contain animate-pulse" /> :

                      <img src={pixelWait} alt="queued" className="w-full h-full object-contain opacity-20" />
                      }
                      </div>
                    </div>);

              })}
              </div>
            </div>
          }

          {/* Logs */}
          {task.logs.length > 0 &&
          <div>
              <p className="text-xs text-muted-foreground mb-2">日志</p>
              <div className="space-y-0.5 font-mono text-xs">
                {task.logs.map((log, i) =>
              <div key={i} className="flex items-start gap-2 py-0.5">
                    <span className="text-muted-foreground/40 shrink-0">{log.time}</span>
                    <span className="text-foreground/70">{log.message}</span>
                  </div>
              )}
              </div>
            </div>
          }

          {/* Time info */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground/50 pt-2 border-t border-border/10">
            {task.startAt && <span>开始: {task.startAt}</span>}
            {task.endAt && <span>结束: {task.endAt}</span>}
          </div>

        </div>
      </ScrollArea>

      {/* Bottom expert avatars */}
      {task.children.length > 0 &&
      <div className="px-5 py-3 border-t border-border/20 flex items-center gap-5">
          {task.children.map((child) => {
          const childExpert = child.expert;
          const avatarSrc = childExpert ? expertAvatars[childExpert.avatar] : undefined;

          return (
            <div key={child.id} className="flex flex-col items-center gap-1.5">
                {/* Status icon above avatar */}
                <div className="h-4 flex items-center justify-center">
                  {child.status === 'done' ?
                    <img src={pixelCheck} alt="done" className="w-4 h-4 object-contain" /> :
                  child.status === 'running' ?
                    <img src={pixelWait} alt="running" className="w-4 h-4 object-contain animate-pulse" /> :
                    <div className="w-4 h-4" />
                  }
                </div>
                {/* Pixel icon with animated black ring when running */}
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                  {child.status === 'running' && (
                    <div className="absolute inset-0 rounded-full border-2 border-foreground/20">
                      <div className="absolute inset-[-2px] rounded-full border-2 border-transparent border-t-foreground animate-spin" />
                    </div>
                  )}
                  <div className={cn(
                    'w-9 h-9 shrink-0 transition-all duration-300',
                    child.status === 'queued' && 'opacity-30'
                  )}>
                    {avatarSrc ?
                  <img src={avatarSrc} alt={childExpert?.name || ''} className="w-full h-full object-contain" /> :
                  <span className="text-lg">{child.title.slice(0, 1)}</span>
                  }
                  </div>
                </div>
                <span className={cn(
                'text-[10px] font-light',
                child.status === 'done' ? 'text-foreground/60' :
                child.status === 'running' ? 'text-foreground' : 'text-muted-foreground/40'
              )}>
                  {childExpert?.name || (child.status === 'done' ? '已完成' : child.status === 'running' ? '执行中' : '等待')}
                </span>
              </div>);

        })}
        </div>
      }
    </div>);

}