import { cn } from '@/lib/utils';
import { PixelProgress } from './PixelProgress';
import { ChevronRight } from 'lucide-react';
import pixelAgent from '@/assets/pixel-agent.svg';
import pixelCross from '@/assets/pixel-cross.png';

import pixelSearch from '@/assets/pixel-search.svg';
import pixelMemory from '@/assets/pixel-memory.svg';
import pixelPrompt from '@/assets/pixel-prompt.svg';
import pixelVideo from '@/assets/pixel-video.svg';
import expertCrawler from '@/assets/expert-crawler.png';
import expertDesigner from '@/assets/expert-designer.png';
import expertAnalyst from '@/assets/expert-analyst.png';
import expertAudio from '@/assets/expert-audio.png';

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

export interface AgentInfo {
  id: string;
  number: string;
  name: string;
  role: string;
  avatar: string;
  statusText: string;
  progress: number;
  status: 'idle' | 'running' | 'done' | 'skipped' | 'error';
}

interface AgentCardProps {
  agent: AgentInfo;
  onClick?: () => void;
  compact?: boolean;
}

export function AgentCard({ agent, onClick, compact }: AgentCardProps) {
  const avatarSrc = expertAvatars[agent.avatar];

  return (
    <div
      onClick={onClick}
      className={cn("rounded-xl border p-3 transition-all bg-sidebar",

      onClick && 'cursor-pointer hover:bg-muted/30',
      agent.status === 'running' && 'border-border/40',
      agent.status === 'done' && 'border-border/20',
      agent.status === 'error' && 'border-destructive/40 bg-destructive/5',
      agent.status === 'skipped' && 'border-border/10 opacity-40 grayscale',
      agent.status === 'idle' && 'border-border/10 opacity-50'
      )}>
      
      <div className="flex items-start gap-3">
        {/* Pixel avatar */}
        <div className="relative shrink-0">
          <div className={cn(
            'w-10 h-10 flex items-center justify-center',
            agent.status === 'running' && 'animate-pulse'
          )}>
            {avatarSrc ?
            <img src={avatarSrc} alt={agent.name} className="w-full h-full object-contain" /> :

            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-pixel text-sm">
                {agent.name[0]}
              </div>
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-pixel text-sm font-semibold text-foreground", agent.status === 'error' && 'text-destructive')}>{agent.name}</span>
            {agent.status === 'error' && <img src={pixelCross} className="w-4 h-4 shrink-0" alt="error" />}
            
          </div>

          {!compact &&
          <p className={cn(
            'text-xs leading-relaxed mt-1',
            agent.status === 'running' ?
            'text-foreground/70' :
            'text-muted-foreground/60'
          )}>
              <span className="mr-1">└</span>
              {agent.statusText}
            </p>
          }
        </div>

        {/* Right column: number + progress aligned */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="font-pixel text-lg font-medium text-[#3d3d3d]">{agent.number}</span>
          {!compact &&
          <PixelProgress progress={agent.progress} status={agent.status === 'done' ? 'done' : agent.status === 'error' ? 'error' : agent.status === 'running' ? 'running' : 'idle'} />
          }
        </div>
      </div>
    </div>);

}

interface AgentClusterCardProps {
  agents: AgentInfo[];
  title?: string;
  onAgentClick?: (agentId: string) => void;
}

export function AgentClusterCard({ agents, title, onAgentClick }: AgentClusterCardProps) {
  const runningCount = agents.filter((a) => a.status === 'running').length;
  const totalCount = agents.length;

  return (
    <div className="rounded-xl border border-border/30 bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
        <img src={pixelAgent} className="w-4 h-4" alt="" />
        <span className="text-xs font-medium text-foreground">Agent 集群</span>
        <span className="text-[10px] text-muted-foreground/50 ml-1">
          {totalCount} 个{runningCount > 0 ? '并行' : ''}任务
        </span>
      </div>

      {/* Agent cards */}
      <div className="p-3 space-y-2">
        {agents.map((agent) =>
        <AgentCard
          key={agent.id}
          agent={agent}
          onClick={onAgentClick ? () => onAgentClick(agent.id) : undefined} />

        )}
      </div>
    </div>);

}