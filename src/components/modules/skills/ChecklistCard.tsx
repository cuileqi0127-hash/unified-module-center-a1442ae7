import { useState } from 'react';
import { Check, Loader2, Clock, SkipForward, ChevronRight, ChevronDown, ListChecks, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkillTask } from './useSkillsEngine';

interface ChecklistCardProps {
  tasks: SkillTask[];
  onTaskClick: (taskId: string) => void;
  activeTaskId: string | null;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'done':
      return (
        <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-background" strokeWidth={2.5} />
        </div>
      );
    case 'running':
      return (
        <div className="w-5 h-5 rounded-full border-2 border-foreground/40 flex items-center justify-center shrink-0">
          <Loader2 className="w-3 h-3 text-foreground animate-spin" />
        </div>
      );
    case 'skipped':
      return (
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
          <SkipForward className="w-3 h-3 text-muted-foreground" />
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-border/40 flex items-center justify-center shrink-0">
          <Clock className="w-2.5 h-2.5 text-muted-foreground/40" />
        </div>
      );
  }
};

const ChildStatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'done':
      return (
        <div className="w-4 h-4 rounded-full bg-foreground/80 flex items-center justify-center shrink-0">
          <Check className="w-2.5 h-2.5 text-background" strokeWidth={2.5} />
        </div>
      );
    case 'running':
      return (
        <div className="w-4 h-4 rounded-full border border-foreground/30 flex items-center justify-center shrink-0">
          <CircleDot className="w-2.5 h-2.5 text-foreground animate-pulse" />
        </div>
      );
    default:
      return (
        <div className="w-4 h-4 rounded-full border border-border/30 shrink-0" />
      );
  }
};

export function ChecklistCard({ tasks, onTaskClick, activeTaskId }: ChecklistCardProps) {
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="rounded-xl border border-border/30 bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-foreground/60" />
          <span className="text-xs font-medium text-foreground">编写待办清单</span>
        </div>
        <span className="text-[10px] text-muted-foreground/60">
          {doneCount}/{tasks.length} 完成
        </span>
      </div>

      {/* Task list */}
      <div>
        {tasks.map((task, idx) => {
          const hasChildren = task.children.length > 0;
          const isExpanded = expandedTasks[task.id] ?? false;

          return (
            <div key={task.id}>
              {/* Main task row */}
              <div
                className={cn(
                  'w-full text-left px-4 py-3 flex items-center gap-3 transition-all hover:bg-muted/30 group cursor-pointer',
                  activeTaskId === task.id && 'bg-muted/40',
                  idx < tasks.length - 1 && !isExpanded && 'border-b border-border/10',
                )}
              >
                {/* Expand toggle */}
                {hasChildren ? (
                  <button
                    onClick={(e) => toggleExpand(task.id, e)}
                    className="shrink-0 p-0.5 -ml-1 rounded hover:bg-muted/50 transition-colors"
                  >
                    <ChevronDown className={cn(
                      'w-3.5 h-3.5 text-muted-foreground/50 transition-transform',
                      !isExpanded && '-rotate-90'
                    )} />
                  </button>
                ) : (
                  <div className="w-4.5 shrink-0" />
                )}

                <StatusIcon status={task.status} />

                <button
                  onClick={() => onTaskClick(task.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <span className={cn(
                    'text-sm',
                    task.status === 'done' && 'text-foreground',
                    task.status === 'running' && 'text-foreground font-medium',
                    task.status === 'skipped' && 'text-muted-foreground/50 line-through',
                    task.status === 'queued' && 'text-muted-foreground/70',
                  )}>
                    {task.title}
                  </span>
                </button>

                {/* Child progress indicator */}
                {hasChildren && (
                  <span className="text-[10px] text-muted-foreground/50 shrink-0">
                    {task.children.filter(c => c.status === 'done').length}/{task.children.length}
                  </span>
                )}

                <ChevronRight
                  className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors shrink-0 cursor-pointer"
                  onClick={() => onTaskClick(task.id)}
                />
              </div>

              {/* Children sub-tasks */}
              {hasChildren && isExpanded && (
                <div className={cn(
                  'pl-12 pr-4 pb-2 space-y-0.5',
                  idx < tasks.length - 1 && 'border-b border-border/10',
                )}>
                  {task.children.map(child => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/20 transition-colors"
                    >
                      <ChildStatusIcon status={child.status} />
                      <span className={cn(
                        'text-xs',
                        child.status === 'done' && 'text-foreground/70',
                        child.status === 'running' && 'text-foreground',
                        child.status === 'queued' && 'text-muted-foreground/50',
                      )}>
                        {child.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
