import { useTranslation } from 'react-i18next';
import { Database, Tag, FolderOpen } from 'lucide-react';
import { SessionSetup } from './useSkillsEngine';

interface SetupSummaryProps {
  setup: SessionSetup;
}

export function SetupSummary({ setup }: SetupSummaryProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-border/20 bg-muted/20 px-4 py-3 flex items-center gap-4 flex-wrap text-sm">
      {setup.image && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border border-border/30 overflow-hidden">
            <img src={setup.image} alt={t('skills.chatInput.altProduct')} className="w-full h-full object-cover" />
          </div>
          <span className="text-xs text-muted-foreground/60 truncate max-w-[80px]">{setup.imageName}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <FolderOpen className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="text-xs text-foreground/70">{setup.category}</span>
      </div>
      {setup.sellingPoints && (
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-xs text-foreground/70 truncate max-w-[150px]">{setup.sellingPoints.split('\n')[0]}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Database className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="text-xs text-foreground/70">
          {setup.memoryEnabled
            ? t('skills.setupSummary.memoryWithCount', { count: setup.selectedMemoryIds.length })
            : t('skills.setupSummary.memoryOff')}
        </span>
      </div>
    </div>
  );
}
