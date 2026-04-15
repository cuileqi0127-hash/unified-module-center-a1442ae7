import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Bot, ArrowUp, X, Paperclip, Brain, ChevronDown, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategoryCascader } from '@/components/ui/category-cascader';
import { CATEGORY_TREE, categoryNodeTreeToCategoryTree } from './categoryTreeData';
import { MemorySelectionDialog } from '@/components/modules/memory/MemorySelectionDialog';
import { uploadFile } from '@/services/fileUploadApi';

export interface MemoryItem {
  id: string;
  name: string;
  desc: string;
  tag: string;
  /** 正文 UTF-8 字节长度 */
  byteLength: number;
}

interface ChatInputBarProps {
  onSend: (text: string, image?: string | null, category?: string, memoryIds?: string[]) => void;
  disabled?: boolean;
  memoryItems: MemoryItem[];
}

const MODEL_IDS = ['k2.5-agent', 'k2.5-fast', 'k2.5-pro'] as const;

export function ChatInputBar({ onSend, disabled, memoryItems }: ChatInputBarProps) {
  const { t } = useTranslation();
  const models = useMemo(
    () =>
      MODEL_IDS.map((id) => ({
        id,
        label:
          id === 'k2.5-agent'
            ? t('skills.chatInput.modelK25Agent')
            : id === 'k2.5-fast'
              ? t('skills.chatInput.modelK25Fast')
              : t('skills.chatInput.modelK25Pro'),
      })),
    [t]
  );
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [category, setCategory] = useState('');
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(MODEL_IDS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || !image || !category || disabled) return;
    onSend(input.trim(), image, category || undefined, selectedMemoryIds.length > 0 ? selectedMemoryIds : undefined);
    setInput('');
    setImage(null);
    setImageName(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    uploadFile(file)
      .then(({ url }) => {
        setImage(url);
        setImageName(file.name);
      })
      .finally(() => setIsUploadingImage(false));
    setPlusOpen(false);
  };

  const removeImage = () => {
    setImage(null);
    setImageName(null);
  };

  const toggleMemory = (id: string) => {
    setSelectedMemoryIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const hasContent = input.trim() && image && category;
  const categoryTree = useMemo(() => categoryNodeTreeToCategoryTree(CATEGORY_TREE), []);
  const selectedModel = models.find((m) => m.id === selectedModelId) ?? models[0];

  return (
    <div className="border-t border-border/20 bg-transparent px-6 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start gap-4">
          {/* Left: Image upload box */}
          <div className="shrink-0 pt-0.5">
            {image ? (
              <div className="relative w-[100px] h-[100px] rounded-xl overflow-hidden border border-border/60 group">
                <img src={image} alt={t('skills.chatInput.altProduct')} className="w-full h-full object-cover" />
                <button
                  onClick={removeImage}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploadingImage}
                className={cn(
                  "w-[100px] h-[100px] rounded-xl border-2 border-dashed border-border/40 hover:border-foreground/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors",
                  (disabled || isUploadingImage) && "opacity-60 cursor-not-allowed"
                )}
              >
                {isUploadingImage ? (
                  <>
                    <Bot className="w-5 h-5 text-muted-foreground/50 animate-pulse" />
                    <span className="text-[10px] text-muted-foreground/50 leading-tight text-center px-2">
                      {t('common.loading')}
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground/50 leading-tight text-center px-2">
                      {t('skills.chatInput.uploadProductImage')}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right: Input area */}
          <div className="flex-1 min-w-0">
            {/* Category cascader; tree from CATEGORY_TREE */}
            <div className="flex items-center gap-2 mb-2">
              <CategoryCascader
                tree={categoryTree}
                value={category}
                onChange={setCategory}
                placeholder={t('skills.chatInput.selectCategory')}
              />
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t('skills.chatInput.placeholderSellingPoints')}
              disabled={disabled}
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50 leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between mt-2 pt-2">
          <div className="flex items-center gap-2">
            {/* Plus menu */}
            <button
              onClick={() => setMemoryDialogOpen(true)}
              className={cn(
                'h-8 rounded-full border flex items-center justify-center transition-all',
                selectedMemoryIds.length > 0
                  ? 'border-orange-400/60 bg-orange-400/10 text-orange-400 gap-1.5 px-3'
                  : 'w-8 border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Brain className="w-4 h-4" />
              {selectedMemoryIds.length > 0 && (
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {t('skills.chatInput.memoryCount', { count: selectedMemoryIds.length })}
                </span>
              )}
            </button>

            {/* Credits display */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{t('skills.chatInput.creditsRemaining')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model selector */}
            <Popover open={modelOpen} onOpenChange={setModelOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md">
                  {selectedModel.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1 rounded-xl" sideOffset={8}>
                {models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModelId(m.id); setModelOpen(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors',
                      selectedModel.id === m.id
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!hasContent || disabled}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                hasContent && !disabled
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-muted/60 text-muted-foreground/40 cursor-not-allowed'
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Memory selection dialog */}
      <MemorySelectionDialog
        open={memoryDialogOpen}
        onOpenChange={setMemoryDialogOpen}
        items={memoryItems}
        selectedIds={selectedMemoryIds}
        onToggle={toggleMemory}
      />
    </div>
  );
}
