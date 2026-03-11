import { useState, useRef, useCallback } from 'react';
import { ArrowUp, X, ChevronDown, ChevronLeft, ChevronRight, Check, Database } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useMemory } from '@/contexts/MemoryContext';
import { MemorySelectionDialog } from '@/components/modules/memory/MemorySelectionDialog';
import { ShowcaseCard, SHOWCASE_CARDS } from './app-plaza/ShowcaseCard';

/* ─── Types ─── */
export interface CampaignPayload {
  brandName: string;
  goal: string;
  audience: string[];
  sellingPoints: string[];
  budget: string;
  channels: string[];
  cycle: string;
}

/* ─── Constants ─── */
const GOALS = ['品牌升级', '销量增长', '新品发布', '节点营销', '用户拉新'];
const BUDGETS = ['S级全域战役', 'A级核心爆破', 'B级日常种草'];
const CHANNELS = ['抖音', '小红书'];
const CYCLES = ['Q1', 'Q2', 'Q3', 'Q4', '全年', '双11节点', '618节点'];

/* ─── Inline picker ─── */
function InlinePicker({
  options,
  value,
  onChange,
  placeholder,
  show,
  setShow,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  setShow: (v: boolean) => void;
}) {
  return (
    <div className="relative inline-block mx-1">
      <button
        type="button"
        onClick={() => setShow(!show)}
        className={cn(
          'inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-sm transition-colors',
          value
            ? 'bg-accent/10 border-accent/20 text-accent font-medium'
            : 'bg-muted/20 border-border/30 text-muted-foreground/60 hover:border-border/60'
        )}
      >
        {value || placeholder}
        <ChevronDown className="w-3 h-3" />
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setShow(false)} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-[101] bg-popover border border-border/30 rounded-xl shadow-lg p-1 min-w-[140px]">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setShow(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2',
                  opt === value ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-muted/40 text-foreground/70'
                )}
              >
                {opt === value && <Check className="w-3 h-3" />}
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Tag input component ─── */
function TagInput({
  tags,
  input,
  setInput,
  onAdd,
  onRemove,
  placeholder,
  inputRef,
  onEmptyEnter,
}: {
  tags: string[];
  input: string;
  setInput: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onEmptyEnter?: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 flex-wrap mx-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 h-6 rounded-full bg-accent/10 border border-accent/20 px-2 text-xs text-accent font-medium"
        >
          {t}
          <button type="button" onClick={() => onRemove(t)} className="hover:text-accent/70 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (input.trim()) onAdd(input);
            else onEmptyEnter?.();
          }
        }}
        onBlur={() => {
          if (input.trim()) onAdd(input);
        }}
        placeholder={tags.length === 0 ? placeholder : '添加更多...'}
        className="h-6 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none min-w-[120px] flex-1"
      />
    </div>
  );
}

const CAMPAIGN_CASES = SHOWCASE_CARDS.filter((c) => c.category === 'campaign');
const CASES_PER_PAGE = 16;

function CampaignCaseSection() {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(CAMPAIGN_CASES.length / CASES_PER_PAGE);
  const pagedCases = CAMPAIGN_CASES.slice(page * CASES_PER_PAGE, (page + 1) * CASES_PER_PAGE);

  return (
    <div className="mt-8 w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pagedCases.map((card, i) => (
          <ShowcaseCard
            key={`campaign-${page}-${i}`}
            card={card}
            onClick={() => {
              if (card.reportUrl) {
                window.open(card.reportUrl, '_blank');
              }
            }}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

interface CampaignPlannerComposerProps {
  onSubmit: (payload: CampaignPayload) => void;
  disabled?: boolean;
  initialData?: CampaignPayload;
}

export function CampaignPlannerComposer({
  onSubmit,
  disabled,
  initialData,
}: CampaignPlannerComposerProps) {
  const { entries } = useMemory();
  const memoryItems = entries.map((e) => ({
    id: e.id,
    name: e.title,
    desc: e.content.slice(0, 60),
    tag: e.category,
    charCount: e.content.length,
  }));
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [brandName, setBrandName] = useState(initialData?.brandName || '');
  const [goal, setGoal] = useState(initialData?.goal || '');
  const [audience, setAudience] = useState<string[]>(initialData?.audience || []);
  const [audienceInput, setAudienceInput] = useState('');
  const [sellingPoints, setSellingPoints] = useState<string[]>(initialData?.sellingPoints || []);
  const [spInput, setSpInput] = useState('');
  const [budget, setBudget] = useState(initialData?.budget || '');
  const [channels, setChannels] = useState<string[]>(initialData?.channels || ['抖音', '小红书']);
  const [cycle, setCycle] = useState(initialData?.cycle || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showBudgetPicker, setShowBudgetPicker] = useState(false);
  const [showCyclePicker, setShowCyclePicker] = useState(false);

  const audienceRef = useRef<HTMLInputElement>(null);
  const spRef = useRef<HTMLInputElement>(null);
  const anyPickerOpen = showGoalPicker || showBudgetPicker || showCyclePicker;

  const canSend =
    Boolean(brandName.trim()) &&
    Boolean(goal) &&
    audience.length > 0 &&
    sellingPoints.length > 0;

  const handleSend = useCallback(() => {
    if (!canSend || disabled) return;
    onSubmit({
      brandName: brandName.trim(),
      goal,
      audience,
      sellingPoints,
      budget,
      channels,
      cycle,
    });
  }, [canSend, disabled, brandName, goal, audience, sellingPoints, budget, channels, cycle, onSubmit]);

  const toggleMemory = (id: string) => {
    setSelectedMemoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addTag = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) setList((prev) => [...prev, trimmed]);
    setInput('');
  };

  const removeTag = (value: string, setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList((prev) => prev.filter((t) => t !== value));
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-8 py-[80px]">
      <div
        className={cn(
          'w-full max-w-2xl animate-fade-in mt-[80px] relative',
          anyPickerOpen && 'z-[220]'
        )}
      >
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-normal tracking-tight text-[#3d3d3d]">
            策划方案
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            输入品牌与营销目标，AI 一键生成营销策划方案
          </p>
        </div>

        <div className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md">
          <div className="p-5 space-y-3">
            <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
              <span className="whitespace-nowrap">为</span>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="品牌名称"
                className="mx-1.5 px-2.5 h-7 bg-muted/20 border border-border/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20 transition-colors w-[100px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <span className="whitespace-nowrap">制定</span>
              <InlinePicker
                options={GOALS}
                value={goal}
                onChange={setGoal}
                placeholder="营销目标"
                show={showGoalPicker}
                setShow={setShowGoalPicker}
              />
              <span className="whitespace-nowrap">策划方案</span>
            </div>

            <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
              <span className="whitespace-nowrap">目标人群</span>
              <TagInput
                tags={audience}
                input={audienceInput}
                setInput={setAudienceInput}
                onAdd={(v) => addTag(v, audience, setAudience, setAudienceInput)}
                onRemove={(v) => removeTag(v, setAudience)}
                placeholder="如：18-25岁大学生、熬夜党"
                inputRef={audienceRef}
                onEmptyEnter={handleSend}
              />
              <span className="whitespace-nowrap">，核心卖点</span>
              <TagInput
                tags={sellingPoints}
                input={spInput}
                setInput={setSpInput}
                onAdd={(v) => addTag(v, sellingPoints, setSellingPoints, setSpInput)}
                onRemove={(v) => removeTag(v, setSellingPoints)}
                placeholder="如：温和不刺激、医生推荐"
                inputRef={spRef}
                onEmptyEnter={handleSend}
              />
            </div>

            <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
              <span className="whitespace-nowrap">预算量级</span>
              <InlinePicker
                options={BUDGETS}
                value={budget}
                onChange={setBudget}
                placeholder="选择量级"
                show={showBudgetPicker}
                setShow={setShowBudgetPicker}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <ChevronDown
                className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')}
              />
              高级设置 (选填)
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-1 border-t border-border/10">
                <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
                  <span className="whitespace-nowrap text-xs text-muted-foreground mr-2">主攻渠道</span>
                  <div className="flex items-center gap-1.5">
                    {CHANNELS.map((ch) => {
                      const selected = channels.includes(ch);
                      const comingSoon = ch === '邮件';
                      const btn = (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => {
                            if (comingSoon) return;
                            setChannels((prev) =>
                              selected ? prev.filter((c) => c !== ch) : [...prev, ch]
                            );
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] transition-all flex items-center gap-1',
                            selected
                              ? 'bg-accent/10 border border-accent/20 text-accent font-medium'
                              : comingSoon
                                ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed border border-transparent'
                                : 'bg-muted/30 text-muted-foreground/60 hover:bg-foreground/5 border border-transparent'
                          )}
                        >
                          {selected && <Check className="w-3 h-3" />}
                          {ch}
                        </button>
                      );
                      if (comingSoon) {
                        return (
                          <Tooltip key={ch}>
                            <TooltipTrigger asChild>{btn}</TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Coming soon
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return btn;
                    })}
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
                  <span className="whitespace-nowrap text-xs text-muted-foreground mr-2">
                    营销周期
                  </span>
                  <InlinePicker
                    options={CYCLES}
                    value={cycle}
                    onChange={setCycle}
                    placeholder="选择周期"
                    show={showCyclePicker}
                    setShow={setShowCyclePicker}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-border/20">
            <div className="flex items-center gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/8 text-accent/80">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/60 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent/80" />
                </span>
                <span className="text-[11px] font-medium">联网搜索中</span>
              </div>
              <button
                type="button"
                onClick={() => setMemoryDialogOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/30 text-muted-foreground/60 hover:bg-foreground/5 hover:text-muted-foreground transition-colors"
              >
                <Database className="w-3 h-3" />
                <span className="text-[11px]">
                  记忆库{selectedMemoryIds.length > 0 ? ` (${selectedMemoryIds.length})` : ''}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend || disabled}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                canSend && !disabled
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-muted/60 text-muted-foreground/40 cursor-not-allowed'
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl mt-8 relative z-0">
        <CampaignCaseSection />
      </div>

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
