'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface EstimatedCreditsHintProps {
  /** 预计消耗的积分数量（可与 toolbox 复刻页一致为动态值） */
  amount: number | string;
  /** 接口返回的业务码，如余额不足时仍可展示预估积分 */
  bizCode?: string | null;
  /** 额外 class */
  className?: string;
}

/** 与 toolbox-no-skills 底部工具栏「预计消耗」样式一致 */
export function EstimatedCreditsHint({ amount, bizCode, className }: EstimatedCreditsHintProps) {
  const { t } = useTranslation();
  const insufficient = bizCode === 'BILLING_CREDITS_NOT_ENOUGH';
  return (
    <span
      className={cn(
        'text-xs text-muted-foreground/70 tabular-nums w-[max-content]',
        insufficient && 'text-amber-700/90 dark:text-amber-400/85',
        className
      )}
    >
      {t('common.estimatedCostPrefix')}{' '}
      <span
        className={cn(
          'font-medium',
          insufficient ? 'text-amber-900 dark:text-amber-200' : 'text-foreground/80'
        )}
      >
        {amount}
      </span>
      {' '}
      {t('common.credits')}
    </span>
  );
}
