import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database } from 'lucide-react';
import { useMemory } from '@/contexts/MemoryContext';
import { MemorySelectionDialog } from './MemorySelectionDialog';
import { cn } from '@/lib/utils';

export interface MemoryButtonWithDialogProps {
  /** 当前选中的记忆 ID 列表（受控） */
  selectedIds: string[];
  /** 切换某条记忆的选中状态 */
  onToggle: (id: string) => void;
  /** 字符上限，默认 5000 */
  maxChars?: number;
  /** 按钮额外 class */
  buttonClassName?: string;
  /** 弹窗额外 class */
  dialogClassName?: string;
}

/**
 * 策划方案 / 复刻视频 等页面共用的「记忆库」入口：按钮 + 选择弹窗。
 * 使用 useMemory 拉取记忆列表，选中状态由父组件通过 selectedIds / onToggle 控制。
 */
export function MemoryButtonWithDialog({
  selectedIds,
  onToggle,
  maxChars,
  buttonClassName,
  dialogClassName,
}: MemoryButtonWithDialogProps) {
  const { t } = useTranslation();
  const { entries } = useMemory();
  const [open, setOpen] = useState(false);

  const memoryItems = entries.map((e) => ({
    id: e.id,
    name: e.title,
    desc: e.content.slice(0, 60),
    tag: e.category,
    charCount: e.content.length,
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-colors',
          'bg-muted/30 text-muted-foreground/60 hover:bg-foreground/5 hover:text-muted-foreground',
          buttonClassName
        )}
      >
        <Database className="w-3 h-3 shrink-0" />
        <span>{t('common.memoryLibrary')}{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
      </button>
      <MemorySelectionDialog
        open={open}
        onOpenChange={setOpen}
        items={memoryItems}
        selectedIds={selectedIds}
        onToggle={onToggle}
        maxChars={maxChars}
      />
    </>
  );
}
