import { useState } from 'react';
import { X, ChevronRight, Copy, Check, FileText, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PixelProgress } from './PixelProgress';
import { PromptEditorBlock } from './PromptEditorBlock';
import { ResultPreviewBlock } from './ResultPreviewBlock';
import { VideoCandidateRow } from './VideoCandidateRow';
import type { AgentInfo } from './AgentCard';
import type { CandidateVideo, SkillTask, TaskLog } from './useSkillsEngine';

import pixelMemory from '@/assets/pixel-memory.svg';
import pixelSearch from '@/assets/pixel-search.svg';
import pixelVideo from '@/assets/pixel-video.svg';
import pixelPrompt from '@/assets/pixel-prompt.svg';
import expertCrawler from '@/assets/expert-crawler.png';
import expertDesigner from '@/assets/expert-designer.png';
import expertAnalyst from '@/assets/expert-analyst.png';
import expertAudio from '@/assets/expert-audio.png';
import pixelCheck from '@/assets/pixel-check.png';
import pixelWait from '@/assets/pixel-wait.png';
import pixelInfo from '@/assets/pixel-info.svg';
import pixelCross from '@/assets/pixel-cross.png';

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

export type RightView = 'none' | 'checklist' | 'agents' | 'read-memory';
export type AgentTab = '01' | '02' | '03' | '04';

interface RightWorkspaceProps {
  view: RightView;
  onClose: () => void;
  activeAgentTab?: AgentTab;
  onAgentTabChange?: (tab: AgentTab) => void;
  // Checklist data
  checklistItems?: string[];
  checklistDone?: boolean[];
  // Agent 01 data
  agent01?: AgentInfo;
  agent01Task?: SkillTask;
  candidateVideos?: CandidateVideo[];
  selectedVideoId?: string | null;
  onVideoSelect?: (video: CandidateVideo) => void;
  videoSelectDisabled?: boolean;
  // Agent 02/03 data
  agent02?: AgentInfo;
  agent03?: AgentInfo;
  agent02Task?: SkillTask;
  agent03Task?: SkillTask;
  generatedPrompt?: string;
  onPromptChange?: (val: string) => void;
  onPromptConfirm?: () => void;
  onBackToVideoSelect?: () => void;
  memoryEnabled?: boolean;
  isProcessing?: boolean;
  // Agent 04 data
  agent04?: AgentInfo;
  agent04Task?: SkillTask;
  resultVideo?: {url: string;cover: string;} | null;
  onRegenerate?: () => void;
  // Memory data
  memoryTitle?: string;
  memoryContent?: string;
  memoryCategory?: string;
}

function WorkLog({ logs, task }: {logs: TaskLog[];task?: SkillTask;}) {
  if (!logs || logs.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-2">工作日志</p>
      <div className="space-y-0.5 font-mono text-xs">
        {logs.map((log, i) =>
        <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="text-muted-foreground/40 shrink-0">{log.time}</span>
            <span className="text-foreground/70">{log.message}</span>
          </div>
        )}
      </div>
    </div>);
}

function SubTaskList({ task }: {task: SkillTask;}) {
  if (!task || task.children.length === 0) return null;
  return (
    <div className="space-y-0">
      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-3">子任务</p>
      {task.children.map((child, i) => {
        const avatarSrc = child.expert ? expertAvatars[child.expert.avatar] : undefined;
        const isDone = child.status === 'done';
        const isRunning = child.status === 'running';
        return (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border/10 last:border-b-0">
            {avatarSrc && <img src={avatarSrc} className="w-5 h-5 shrink-0 object-contain" alt="" />}
            <span className="text-sm text-foreground/70 flex-1">{child.title}</span>
            {isDone && <Check className="w-4 h-4 text-foreground/40" />}
            {isRunning && <Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" />}
          </div>);

      })}
    </div>);
}

function CopyButton({ text }: {text: string;}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-3 p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/20 hover:bg-muted/60 text-muted-foreground/40 hover:text-muted-foreground transition-colors z-10 shadow-sm"
      title="复制全部内容">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>);
}

const agentTabs: {id: AgentTab;label: string;avatar: string;name: string;}[] = [
{ id: '01', label: '01', avatar: 'search', name: 'TikTok爆款专家' },
{ id: '02', label: '02', avatar: 'memory', name: '记忆库专家' },
{ id: '03', label: '03', avatar: 'strategist', name: 'Prompt专家' },
{ id: '04', label: '04', avatar: 'video', name: '视频专家' }];


export function RightWorkspace(props: RightWorkspaceProps) {
  const { view, onClose, activeAgentTab = '01', onAgentTabChange } = props;

  if (view === 'none') return null;

  const renderAgentContent = () => {
    // Check if current agent has error status
    const agentStatusMap: Record<AgentTab, AgentInfo | undefined> = {
      '01': props.agent01,
      '02': props.agent02,
      '03': props.agent03,
      '04': props.agent04
    };
    const currentAgent = agentStatusMap[activeAgentTab];
    if (currentAgent?.status === 'error') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-5 text-center min-h-[300px]">
          <img src={pixelCross} className="w-10 h-10" alt="" />
          <p className="text-sm text-destructive font-medium">状态异常</p>
          <p className="text-xs text-muted-foreground/60">{currentAgent.statusText || '任务执行过程中出现错误'}</p>
        </div>);

    }

    switch (activeAgentTab) {
      case '01':
        return (
          <div className="p-5 space-y-5">
            {props.agent01Task && <WorkLog logs={props.agent01Task.logs} />}
            {props.candidateVideos && props.candidateVideos.length > 0 &&
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">爆款参考视频</p>
                <VideoCandidateRow
                videos={props.candidateVideos}
                onSelect={(v) => props.onVideoSelect?.(v)}
                selectedVideoId={props.selectedVideoId}
                disabled={props.videoSelectDisabled} />
              </div>
            }
          </div>);
      case '02':
        if (!props.memoryEnabled) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-5 text-center min-h-[300px]">
              <img src={pixelInfo} className="w-10 h-10 opacity-40" alt="" />
              <p className="text-sm text-muted-foreground/60">未选择记忆库</p>
            </div>);

        }
        return (
          <div className="p-5 space-y-5">
            {props.agent02Task && <WorkLog logs={props.agent02Task.logs} />}
          </div>);
      case '03':
        return (
          <div className="p-5 space-y-5 py-[20px] pb-[200px]">
            {props.agent03Task && <WorkLog logs={props.agent03Task.logs} />}
            {props.generatedPrompt &&
            <PromptEditorBlock
              prompt={props.generatedPrompt}
              onChange={(val) => props.onPromptChange?.(val)}
              onConfirm={() => props.onPromptConfirm?.()}
              onBack={() => props.onBackToVideoSelect?.()}
              memoryEnabled={props.memoryEnabled ?? false}
              disabled={props.isProcessing}
              readonly={props.agent04?.status !== undefined && props.agent04.status !== 'idle'} />
            }
          </div>);
      case '04':
        return (
          <div className="p-5 space-y-5">
            {props.agent04Task && <WorkLog logs={props.agent04Task.logs} />}
            {props.resultVideo &&
            <ResultPreviewBlock onRegenerate={props.onRegenerate} disabled={props.isProcessing} />
            }
          </div>);
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'checklist':
        return (
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground/60 mb-3">待办清单</p>
            {props.checklistItems?.map((item, i) =>
            <div key={i} className="flex items-start gap-2 py-1">
                <span className="font-pixel text-xs text-foreground/60 mt-0.5">
                  {props.checklistDone?.[i] ? '[x]' : '[ ]'}
                </span>
                <span className={cn(
                'text-sm',
                props.checklistDone?.[i] ? 'text-foreground/70' : 'text-muted-foreground/50'
              )}>{item}</span>
              </div>
            )}
          </div>);

      case 'agents':
        return renderAgentContent();

      case 'read-memory':{
          const lines = (props.memoryContent || '暂无内容').split('\n');
          return (
            <div className="flex flex-col h-full">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/30 bg-muted/30 shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground font-normal">阅读</span>
              <span className="text-sm text-muted-foreground/40">|</span>
              <span className="text-sm truncate text-[#5c5c5c] font-normal">{props.memoryTitle || '记忆库'}.md</span>
              {props.memoryCategory &&
                <span className="ml-auto inline-block text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                  {props.memoryCategory}
                </span>
                }
              <Button variant="ghost" size="icon" onClick={onClose} className={cn("h-8 w-8 shrink-0", !props.memoryCategory && "ml-auto")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto relative">
              <CopyButton text={props.memoryContent || '暂无内容'} />
              <div className="px-5 pt-10 pb-4 font-mono text-sm leading-7">
                {lines.map((line, i) =>
                  <div key={i} className="flex">
                    <span className="w-10 shrink-0 text-right pr-4 text-muted-foreground/30 select-none">{i + 1}</span>
                    <span className="text-foreground/80 whitespace-pre-wrap break-all">{line || '\u00A0'}</span>
                  </div>
                  )}
              </div>
            </div>
          </div>);
        }

      default:
        return null;
    }
  };

  const isReadMemory = view === 'read-memory';
  const isAgents = view === 'agents';

  const headerTitle = isAgents ?
  `Agent${activeAgentTab}` :
  view === 'checklist' ?
  '编写待办清单' :
  props.memoryTitle || '记忆库';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      {!isReadMemory &&
      <div className="px-5 py-3 border-b border-border/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isAgents ?
          <span className="font-pixel text-base font-medium text-foreground">{headerTitle}</span> :
          <span className="text-sm font-medium text-foreground">{headerTitle}</span>
          }
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>
      }

      <ScrollArea className="flex-1">
        {renderContent()}
      </ScrollArea>

      {/* Bottom agent tab switcher */}
      {isAgents && (() => {
        const agentStatusMap: Record<AgentTab, AgentInfo | undefined> = {
          '01': props.agent01,
          '02': props.agent02,
          '03': props.agent03,
          '04': props.agent04
        };
        const visibleTabs = agentTabs.filter((tab) => {
          const agent = agentStatusMap[tab.id];
          return agent && agent.status !== 'idle';
        });
        if (visibleTabs.length === 0) return null;
        return (
          <div className="border-t border-border/20 shrink-0 flex items-center justify-center gap-3 px-[13px] py-[5px]">
          {visibleTabs.map((tab) => {
              const agent = agentStatusMap[tab.id];
              const status = agent?.status || 'idle';
              const isActive = activeAgentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onAgentTabChange?.(tab.id)}
                  className={cn("flex flex-col items-center gap-1 px-4 text-xs transition-all border-foreground/80 border border-solid py-[2px]",
                  isActive ?
                  'bg-background text-foreground font-medium shadow-[3px_3px_0px_0px_hsl(var(--foreground)/0.8)] translate-x-[-1px] translate-y-[-1px]' :
                  'text-muted-foreground border-muted-foreground/30 hover:border-foreground/60 hover:shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.4)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]'
                  )}>
                  <span className="font-pixel leading-none text-lg">{tab.label}</span>
                  <span className={cn("font-pixel text-[10px] leading-none text-[#8a8a8a]",
                  status === 'running' && 'text-amber-600',
                  status === 'done' && 'text-emerald-600',
                  status === 'error' && 'text-destructive',
                  status === 'skipped' && 'text-muted-foreground/50',
                  status === 'idle' && 'text-muted-foreground/40'
                  )}>
                    {status === 'running' ? 'LOADING' : status === 'done' ? 'DONE' : status === 'error' ? 'ERROR' : status === 'skipped' ? 'SKIP' : 'WAITING'}
                  </span>
                </button>);
            })}
        </div>);
      })()
      }
    </div>);
}