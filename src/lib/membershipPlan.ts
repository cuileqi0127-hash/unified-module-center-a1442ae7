import type { TFunction } from 'i18next';

/**
 * 将 billing `/billing/me/summary` 返回的 `membershipPlan` 映射为 i18n 展示文案。
 * 兼容：`free`、`starter` / `starter_*`、`pro` / `pro_*`（与商品 planCode 命名一致）。
 */
export function formatMembershipPlan(plan: string | undefined | null, t: TFunction): string {
  if (plan == null || plan.trim() === '') return '—';
  const n = plan.trim().toLowerCase();
  if (n === 'free') return t('common.planFree');
  if (n === 'starter' || n.startsWith('starter_')) return t('common.planStarter');
  if (n === 'pro' || n.startsWith('pro_')) return t('common.planPro');
  return plan;
}
