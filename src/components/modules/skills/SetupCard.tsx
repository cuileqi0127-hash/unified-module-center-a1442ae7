import { useState, useRef, useMemo } from 'react';
import { Upload, Image as ImageIcon, X, ChevronDown, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MemorySelectionDialog } from '@/components/modules/memory/MemorySelectionDialog';
import { SessionSetup } from './useSkillsEngine';

interface SetupCardProps {
  memoryItems: { id: string; name: string; desc: string; tag: string }[];
  categories: string[];
  onComplete: (setup: SessionSetup) => void;
  onReset: () => void;
}

export function SetupCard({ memoryItems, categories, onComplete, onReset }: SetupCardProps) {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [sellingPoints, setSellingPoints] = useState('');
  const [category, setCategory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setImageName(file.name);
    }
  };

  const toggleMemory = (id: string) => {
    setSelectedMemoryIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const memorySelectItems = useMemo(
    () =>
      memoryItems.map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.desc,
        tag: item.tag,
        charCount: item.desc?.length ?? 0,
      })),
    [memoryItems]
  );

  const canSubmit = image && sellingPoints.trim() && category;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">初始化配置</h3>
          <p className="text-xs text-muted-foreground mt-0.5">上传商品图，配置参数后开始生成</p>
        </div>
        <Badge variant="outline" className="text-xs">Setup</Badge>
      </div>

      {/* Image upload */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">白底商品图</label>
        {image ? (
          <div className="relative w-28 h-28 rounded-xl border border-border overflow-hidden group">
            <img src={image} alt="Product" className="w-full h-full object-cover" />
            <button
              onClick={() => { setImage(null); setImageName(null); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-xs text-muted-foreground mt-1 truncate absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5">{imageName}</p>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 rounded-xl border-2 border-dashed border-border/60 hover:border-foreground/30 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">点击或拖拽上传</span>
            <span className="text-xs text-muted-foreground/60">支持 PNG / JPG</span>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Memory - 使用公共记忆库弹窗 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">记忆库</label>
          <Switch checked={memoryEnabled} onCheckedChange={setMemoryEnabled} />
        </div>
        {memoryEnabled && (
          <>
            <button
              type="button"
              onClick={() => setMemoryDialogOpen(true)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all',
                'border-border/40 hover:border-border/60 text-left'
              )}
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Database className="w-3.5 h-3.5" />
                选择记忆库
              </span>
              {selectedMemoryIds.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {selectedMemoryIds.length} 个
                </Badge>
              )}
            </button>
            <MemorySelectionDialog
              open={memoryDialogOpen}
              onOpenChange={setMemoryDialogOpen}
              items={memorySelectItems}
              selectedIds={selectedMemoryIds}
              onToggle={toggleMemory}
            />
          </>
        )}
      </div>

      {/* Selling points */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">核心卖点</label>
        <Textarea
          value={sellingPoints}
          onChange={e => setSellingPoints(e.target.value)}
          placeholder="输入产品核心卖点，支持多条换行..."
          className="min-h-[80px] resize-none rounded-xl border-border/60 bg-background text-sm"
        />
      </div>

      {/* Category */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">商品品类</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="rounded-xl border-border/60">
            <SelectValue placeholder="选择品类" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={() => canSubmit && onComplete({ image, imageName, memoryEnabled, selectedMemoryIds, sellingPoints, category })}
          disabled={!canSubmit}
          className="flex-1 rounded-xl h-10 bg-foreground text-background hover:bg-foreground/90 font-medium"
        >
          开始生成
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
          className="rounded-xl h-10 border-border/60"
        >
          重置
        </Button>
      </div>
    </div>
  );
}
