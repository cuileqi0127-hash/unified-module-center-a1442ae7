import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import { InlinePicker } from '@/components/ui/inline-picker';
import { MemoryButtonWithDialog } from '@/components/modules/memory/MemoryButtonWithDialog';
import { EstimatedCreditsHint } from './EstimatedCreditsHint';
import { ReportCasesShowcaseGrid } from './ReportCasesShowcaseGrid';

/* ─── Types ─── */
export interface CampaignPayload {
  brandName: string;
  /** 后端枚举：marketingGoal */
  goal: string;
  audience: string[];
  sellingPoints: string[];
  /** 后端枚举：budgetLevel */
  budget: string;
  /** 后端枚举：primaryChannels */
  channels: string[];
  /** 后端枚举：marketingPeriod */
  cycle: string;
  /** 记忆库选中的条目 id 列表（用于提交 report tasks） */
  memoryEntryIds?: string[];
}

/* ─── Constants ─── */
const GOALS = [
  { value: 'BRAND_UPGRADE', label: '品牌升级' },
  { value: 'SALES_GROWTH', label: '销量增长' },
  { value: 'NEW_PRODUCT_LAUNCH', label: '新品上市' },
  { value: 'KOL_COLLABORATION', label: 'KOL合作' },
];
const BUDGETS = [
  { value: 'S_LEVEL_FULL_CAMPAIGN', label: 'S级全域战役' },
  { value: 'A_LEVEL_REGIONAL_CAMPAIGN', label: 'A级区域战役' },
  { value: 'B_LEVEL_LOCAL_CAMPAIGN', label: 'B级局部战役' },
  { value: 'C_LEVEL_MICRO_CAMPAIGN', label: 'C级迷你战役' },
];
const CHANNELS = [
  { value: 'DOUYIN', label: '抖音' },
  { value: 'XIAOHONGSHU', label: '小红书' },
];
const CYCLES = [
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4', label: 'Q4' },
  { value: 'FULL_YEAR', label: '全年' },
];

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
          <button
            type="button"
            onClick={() => onRemove(t)}
            className="hover:text-accent/70 transition-colors">
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
        placeholder={placeholder}
        className="h-6 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none min-w-[120px] flex-1"
      />
    </div>
  );
}

interface CampaignPlannerComposerProps {
  onSubmit: (payload: CampaignPayload) => void;
  disabled?: boolean;
  initialData?: CampaignPayload;
  estimatedCredits?: number | string;
  estimateCreditsBizCode?: string | null;
}

export function CampaignPlannerComposer({
  onSubmit,
  disabled,
  initialData,
  estimatedCredits = 0,
  estimateCreditsBizCode,
}: CampaignPlannerComposerProps) {
  const { t } = useTranslation();
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [brandName, setBrandName] = useState(initialData?.brandName || '');
  const [goal, setGoal] = useState(initialData?.goal || '');
  const [audience, setAudience] = useState<string[]>(initialData?.audience || []);
  const [audienceInput, setAudienceInput] = useState('');
  const [sellingPoints, setSellingPoints] = useState<string[]>(initialData?.sellingPoints || []);
  const [spInput, setSpInput] = useState('');
  const [budget, setBudget] = useState(initialData?.budget || '');
  const [channels, setChannels] = useState<string[]>(initialData?.channels || ['DOUYIN', 'XIAOHONGSHU']);
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
      memoryEntryIds: selectedMemoryIds,
    });
  }, [canSend, disabled, brandName, goal, audience, sellingPoints, budget, channels, cycle, onSubmit]);

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
            {t('campaignPlanner.pageTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('campaignPlanner.pageSubtitle')}
          </p>
        </div>

        <div className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md">
          <div className="p-5 space-y-3">
            <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
              <span className="whitespace-nowrap">{t('campaignPlanner.forLabel')}</span>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={t('campaignPlanner.brandNamePlaceholder')}
                className="mx-1.5 px-2.5 h-7 bg-muted/20 border border-border/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20 transition-colors w-[100px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <span className="whitespace-nowrap">{t('campaignPlanner.planLabel')}</span>
              <InlinePicker
                options={GOALS}
                value={goal}
                onChange={setGoal}
                placeholder={t('campaignPlanner.goalPlaceholder')}
                show={showGoalPicker}
                setShow={setShowGoalPicker}
              />
              <span className="whitespace-nowrap">{t('campaignPlanner.schemeLabel')}</span>
            </div>

            <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
              <span className="whitespace-nowrap">{t('campaignPlanner.targetAudience')}</span>
              <TagInput
                tags={audience}
                input={audienceInput}
                setInput={setAudienceInput}
                onAdd={(v) => addTag(v, audience, setAudience, setAudienceInput)}
                onRemove={(v) => removeTag(v, setAudience)}
                placeholder={audience.length === 0 ? t('campaignPlanner.audiencePlaceholder') : t('campaignPlanner.addMore')}
                inputRef={audienceRef}
                onEmptyEnter={handleSend}
              />
              <span className="whitespace-nowrap">，{t('campaignPlanner.sellingPoints')}</span>
              <TagInput
                tags={sellingPoints}
                input={spInput}
                setInput={setSpInput}
                onAdd={(v) => addTag(v, sellingPoints, setSellingPoints, setSpInput)}
                onRemove={(v) => removeTag(v, setSellingPoints)}
                placeholder={sellingPoints.length === 0 ? t('campaignPlanner.sellingPointsPlaceholder') : t('campaignPlanner.addMore')}
                inputRef={spRef}
                onEmptyEnter={handleSend}
              />
            </div>

            <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
              <span className="whitespace-nowrap">{t('campaignPlanner.budgetLevel')}</span>
              <InlinePicker
                options={BUDGETS}
                value={budget}
                onChange={setBudget}
                placeholder={t('campaignPlanner.budgetPlaceholder')}
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
              {t('campaignPlanner.advancedSettings')}
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-1 border-t border-border/10">
                <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
                  <span className="whitespace-nowrap text-xs text-muted-foreground mr-2">{t('campaignPlanner.mainChannels')}</span>
                  <div className="flex items-center gap-1.5">
                    {CHANNELS.map((ch) => {
                      const selected = channels.includes(ch.value);
                      return (
                        <button
                          key={ch.value}
                          type="button"
                          onClick={() => {
                            setChannels((prev) =>
                              selected ? prev.filter((c) => c !== ch.value) : [...prev, ch.value]
                            );
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] transition-all flex items-center gap-1',
                            selected
                              ? 'bg-accent/10 border border-accent/20 text-accent font-medium'
                              : 'bg-muted/30 text-muted-foreground/60 hover:bg-foreground/5 border border-transparent'
                          )}
                        >
                          {selected && <Check className="w-3 h-3" />}
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-y-2 text-sm text-foreground/70 leading-relaxed">
                  <span className="whitespace-nowrap text-xs text-muted-foreground mr-2">
                    {t('campaignPlanner.cycleLabel')}
                  </span>
                  <InlinePicker
                    options={CYCLES}
                    value={cycle}
                    onChange={setCycle}
                    placeholder={t('campaignPlanner.cyclePlaceholder')}
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
                <span className="text-[11px] font-medium">{t('campaignPlanner.searchingOnline')}</span>
              </div>
              <MemoryButtonWithDialog
                selectedIds={selectedMemoryIds}
                onToggle={(id) =>
                  setSelectedMemoryIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                  )
                }
              />
            </div>

            <div className="flex items-center gap-3">
              <EstimatedCreditsHint amount={estimatedCredits || 0} bizCode={estimateCreditsBizCode} />
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
      </div>

      <div className="w-full max-w-5xl mt-8 relative z-0">
        <div className="mt-8 w-full">
          <ReportCasesShowcaseGrid reportType="STRATEGY_CASE" pageSize={16} />
        </div>
      </div>
    </div>
  );
}
