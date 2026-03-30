'use client';

import { useTranslation } from 'react-i18next';

interface EstimatedCreditsHintProps {
  /** 预计消耗的积分数量（可与 toolbox 复刻页一致为动态值） */
  amount: number | string;
}

/** 与 toolbox-no-skills 底部工具栏「预计消耗」样式一致 */
export function EstimatedCreditsHint({ amount }: EstimatedCreditsHintProps) {
  const { t } = useTranslation();
  return (
    <span className="text-xs text-muted-foreground/70 tabular-nums">
      {t('common.estimatedCostPrefix')}{' '}
      <span className="text-foreground/80 font-medium">{amount}</span>
      {' '}
      {t('common.credits')}
    </span>
  );
}
