'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOAuth } from '@/contexts/OAuthContext';
import { clearOAuthCache, redirectToLogin } from '@/services/oauthApi';
import { clearUserInfoCache } from '@/services/userApi';
import { formatMembershipPlan } from '@/lib/membershipPlan';
import { getBillingJournals, getBillingMeSummary, type BillingMeSummaryResp } from '@/services/billingApi';

/** 与 toolbox AccountDialog「使用」页表格行一致，后续可对接积分流水 API */
export interface UsageDetailRecord {
  id: string;
  label: string;
  amount: number;
  /** yyyy-MM-dd HH:mm:ss（后端返回） */
  date: string;
  status: 'consumed' | 'earned' | 'refunded';
}

function getInitialFromNickname(nickname?: string): string {
  if (!nickname || nickname.trim() === '') return 'U';
  const firstChar = nickname.trim()[0];
  return /[\u4e00-\u9fa5]/.test(firstChar) ? firstChar : firstChar.toUpperCase();
}

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 打开弹窗时切换到的标签（如从顶栏「使用明细」进入「使用」页） */
  openToTab?: 'account' | 'usage' | 'invoices';
}

export function AccountDialog({ open, onOpenChange, openToTab }: AccountDialogProps) {
  const { t, i18n } = useTranslation();
  const { userInfo } = useOAuth();
  const [activeTab, setActiveTab] = useState('account');
  const userInitial = getInitialFromNickname(userInfo?.nickname);
  const [billingSummary, setBillingSummary] = useState<BillingMeSummaryResp | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageDetailRecord[]>([]);

  /** 对接 API 前为空；结构对齐 toolbox-no-skills CreditsContext.usageHistory */
  const usageHistory = useMemo<UsageDetailRecord[]>(() => usageRecords, [usageRecords]);

  useEffect(() => {
    if (open && openToTab) setActiveTab(openToTab);
  }, [open, openToTab]);

  const formatUsageDate = (s: string) => {
    // 后端返回的是 yyyy-MM-dd HH:mm:ss；这里仅做本地化输出时的兜底解析
    const normalized = s.includes('T') ? s : s.replace(' ', 'T');
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString(i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getAvatarUrl = (avatar?: string): string | undefined => {
    if (!avatar) return undefined;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    return `/api/${avatar}`;
  };
  const avatarUrl = getAvatarUrl(userInfo?.avatar);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open || !userInfo) {
        setBillingSummary(null);
        return;
      }
      try {
        const res = await getBillingMeSummary();
        if (!cancelled && res?.success) setBillingSummary(res.data);
      } catch {
        if (!cancelled) setBillingSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userInfo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open || !userInfo || activeTab !== 'usage') return;
      setUsageLoading(true);
      setUsageError(null);
      try {
        const res = await getBillingJournals({ page: 1, size: 10 });
        if (cancelled) return;
        if (!res?.success) {
          setUsageError(res?.msg || 'Request failed');
          setUsageRecords([]);
          return;
        }
        const mapped: UsageDetailRecord[] = (res.data?.list ?? []).map((j) => ({
          id: String(j.id),
          label: j.title,
          amount: j.credits,
          date: j.occurredTime,
          status: j.direction === 'DECREASE' ? 'consumed' : 'earned',
        }));
        setUsageRecords(mapped);
      } catch (e) {
        if (!cancelled) {
          setUsageError(e instanceof Error ? e.message : 'Request failed');
          setUsageRecords([]);
        }
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userInfo, activeTab]);

  const handleLogout = () => {
    clearOAuthCache();
    clearUserInfoCache();
    redirectToLogin();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[90vw] h-[80vh] p-0 gap-0 overflow-hidden bg-background/70 backdrop-blur-xl border-border/50" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t('common.accountManagement')}</DialogTitle>
        <div className="p-6 pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-6 px-0 h-auto pb-0">
              <TabsTrigger
                value="account"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-base font-normal"
              >
                {t('common.accountManagement')}
              </TabsTrigger>
              <TabsTrigger
                value="usage"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-base font-normal text-muted-foreground"
              >
                {t('common.usage')}
              </TabsTrigger>
              <TabsTrigger
                value="invoices"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-base font-normal text-muted-foreground"
              >
                {t('common.invoices')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-6 space-y-6">
              <div className="border border-border rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={userInfo?.nickname || 'User'} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold text-foreground">{userInfo?.nickname || '—'}</p>
                    <p className="text-sm text-muted-foreground font-light">{userInfo?.email || userInfo?.mobile || '—'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5 rounded-full" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  {t('common.logout')}
                </Button>
              </div>

              <div className="border border-border rounded-xl p-6">
                <div className="flex gap-8 mb-6">
                  <span className="text-base text-foreground border-b-2 border-foreground pb-2 font-light">
                    {t('common.accountManagement')}
                  </span>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center">
                    <span className="text-muted-foreground w-40 font-thin">{t('common.currentPlan')}</span>
                    <span className="text-foreground font-light">
                      {formatMembershipPlan(billingSummary?.membershipPlan, t)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-muted-foreground w-40 font-light">{t('common.availableCredits')}</span>
                    <span className="text-foreground font-normal">{billingSummary?.totalCredits ?? '—'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-muted-foreground w-40 font-light pl-4">{t('common.subscriptionCredits')}</span>
                    <span className="text-foreground font-light">{billingSummary?.subscriptionCredits ?? '—'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-muted-foreground w-40 font-light pl-4">{t('common.topupCredits')}</span>
                    <span className="text-foreground font-light">{billingSummary?.packCredits ?? '—'}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="usage" className="mt-6">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-muted/50 px-6 py-3 flex items-center text-sm font-medium text-muted-foreground gap-[120px]">
                  <span className="flex-1 mx-0 mr-[150px]">{t('common.usageDetails')}</span>
                  <span className="w-48 text-center">{t('common.date')}</span>
                  <span className="w-32 text-right">{t('common.credits')}</span>
                </div>
                {usageHistory.map((record) => (
                  <div
                    key={record.id}
                    className="px-6 py-4 flex items-center text-sm border-t border-border gap-[120px]"
                  >
                    <span className="flex-1 text-foreground mr-[150px]">{record.label}</span>
                    <span className="w-48 text-center text-muted-foreground">{formatUsageDate(record.date)}</span>
                    <span
                      className={cn(
                        'w-32 text-right tabular-nums font-medium',
                        record.status === 'consumed' ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {record.status === 'consumed' ? '-' : '+'}
                      {record.amount}
                    </span>
                  </div>
                ))}
                {usageHistory.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    {usageLoading ? t('common.loading') : usageError ? usageError : t('common.noMoreData')}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="mt-6">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-muted/50 px-6 py-3 flex items-center text-sm font-medium text-muted-foreground">
                  <span className="flex-1">{t('common.date')}</span>
                  <span className="w-32 text-center">{t('common.category')}</span>
                  <span className="w-32 text-center">{t('common.amount')}</span>
                  <span className="w-32 text-center">{t('common.status')}</span>
                  <span className="w-32 text-right">{t('common.invoice')}</span>
                </div>
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-16 h-16 mb-4 rounded-lg bg-muted/50 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10" />
                    </svg>
                  </div>
                  <span className="text-sm">{t('common.noData')}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
