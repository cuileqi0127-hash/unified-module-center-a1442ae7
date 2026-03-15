import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Tag, FolderOpen, Video, Copy, Check } from 'lucide-react';

interface PromptEditorBlockProps {
  prompt: string;
  onChange: (val: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  memoryEnabled: boolean;
  disabled?: boolean;
  readonly?: boolean;
}

export function PromptEditorBlock({ prompt, onChange, onConfirm, onBack, memoryEnabled, disabled, readonly }: PromptEditorBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">生成的爆款复刻 Prompt</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1 rounded-md hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
            title="复制 Prompt"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <Textarea
        value={prompt}
        onChange={e => onChange(e.target.value)}
        readOnly={readonly}
        className="min-h-[160px] rounded-xl border-border/40 bg-background text-sm font-mono leading-relaxed resize-none"
      />

      {/* Source tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground">来源：</span>
        {memoryEnabled && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Database className="w-2.5 h-2.5" /> 记忆库
          </Badge>
        )}
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Tag className="w-2.5 h-2.5" /> 卖点
        </Badge>
        <Badge variant="secondary" className="text-[10px] gap-1">
          <FolderOpen className="w-2.5 h-2.5" /> 品类
        </Badge>
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Video className="w-2.5 h-2.5" /> 参考视频
        </Badge>
      </div>

      {/* Actions - hidden in readonly mode */}
      {!readonly && (
        <div className="flex items-center gap-3">
          <Button
            onClick={onConfirm}
            disabled={disabled}
            className="flex-1 rounded-xl h-10 bg-foreground text-background hover:bg-foreground/90 font-medium disabled:opacity-50"
          >
            确认并生成
          </Button>
        </div>
      )}
    </div>
  );
}
