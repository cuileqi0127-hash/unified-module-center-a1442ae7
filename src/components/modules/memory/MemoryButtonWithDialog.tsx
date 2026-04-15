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
    byteLength: e.contentLength,
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          // 与「生图/生视频」底部筛选胶囊（ghost sm）保持一致：h-7 + text-xs + rounded-full
          'w-[max-content] inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          buttonClassName
        )}
      >
        <Database className="h-3.5 w-3.5 shrink-0" />
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
