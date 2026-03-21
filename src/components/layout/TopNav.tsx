import { Globe, Database, Zap, Sparkles } from 'lucide-react';
import logoDark from '@/assets/logo_dark.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { AccountDialog } from './AccountDialog';
import { useState, useMemo } from 'react';
import { useOAuth } from '@/contexts/OAuthContext';
import { USER_CREDITS, USER_SUBSCRIPTION_CREDITS, USER_TOPUP_CREDITS, USER_PLAN } from '@/constants/user';
import { useMemory } from '@/contexts/MemoryContext';
import { MemorySelectionDialog } from '@/components/modules/memory/MemorySelectionDialog';
import { PORTAL_HOME_URL } from '@/constants/portal';

function getInitialFromNickname(nickname?: string): string {
  if (!nickname || nickname.trim() === '') return 'U';
  const firstChar = nickname.trim()[0];
  return /[\u4e00-\u9fa5]/.test(firstChar) ? firstChar : firstChar.toUpperCase();
}

export function TopNav() {
  const { t, i18n } = useTranslation();
  const { userInfo } = useOAuth();
  const { entries } = useMemory();
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);

  const memoryItems = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        name: e.title,
        desc: e.content.slice(0, 60) + (e.content.length > 60 ? '...' : ''),
        tag: e.category,
        charCount: e.content.length,
      })),
    [entries]
  );

  const toggleMemory = (id: string) => {
    setSelectedMemoryIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const userInitial = getInitialFromNickname(userInfo?.nickname);

  const getAvatarUrl = (avatar?: string): string | undefined => {
    if (!avatar) return undefined;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    return `/api/${avatar}`;
  };
  const avatarUrl = getAvatarUrl(userInfo?.avatar);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <>
      <header className="h-14 border-b border-border/10 bg-background/20 backdrop-blur-xl flex items-center justify-between px-4 top-0 z-50 fixed left-0 w-screen">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <img src={logoDark} alt="Oran Gen" className="w-6 h-6 object-fill" />
          <span className="text-lg font-normal">Oran Gen</span>
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-2">
          {/* Memory Library */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 flex items-center gap-1.5"
            onClick={() => setMemoryDialogOpen(true)}
          >
            <Database className="w-4 h-4" />
            <span className="text-xs font-medium">{t('common.memoryLibrary')}</span>
          </Button>
          <MemorySelectionDialog
            open={memoryDialogOpen}
            onOpenChange={setMemoryDialogOpen}
            items={memoryItems}
            selectedIds={selectedMemoryIds}
            onToggle={toggleMemory}
          />

          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 flex items-center gap-1"
            onClick={toggleLanguage}
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">{i18n.language === 'zh' ? t('topNav.langZh') : t('topNav.langEn')}</span>
          </Button>

          {/* Upgrade + Credits Pill with Hover Card */}
          <HoverCard openDelay={200} closeDelay={300}>
            <HoverCardTrigger asChild>
              <a
                href={PORTAL_HOME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0 text-foreground text-xs font-light overflow-hidden h-8 hover:opacity-90 transition-opacity bg-transparent border-solid border border-[#adadad] rounded-xl"
              >
                <span className="px-3 py-1.5">{t('common.upgrade')}</span>
                <span className="flex items-center gap-1 px-3 py-1.5 border-l border-border font-light bg-transparent">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  {USER_CREDITS}
                </span>
              </a>
            </HoverCardTrigger>
            <HoverCardContent align="end" className="w-80 p-5 rounded-2xl bg-popover/70 backdrop-blur-xl border-border/50 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-light text-foreground">{USER_PLAN}</span>
                  <Button size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-light px-4" asChild>
                    <a href={PORTAL_HOME_URL} target="_blank" rel="noopener noreferrer" className="font-light">
                      {t('common.upgrade')}
                    </a>
                  </Button>
                </div>
                <div className="border-t border-border" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="w-4 h-4" />
                      {t('common.credits')}
                    </div>
                    <span className="text-sm font-light text-foreground">{USER_CREDITS}</span>
                  </div>
                  <div className="flex items-center justify-between pl-6">
                    <span className="text-xs text-muted-foreground">{t('common.subscriptionCredits')}</span>
                    <span className="text-xs font-light text-foreground">{USER_SUBSCRIPTION_CREDITS}</span>
                  </div>
                  <div className="flex items-center justify-between pl-6">
                    <span className="text-xs text-muted-foreground">{t('common.topupCredits')}</span>
                    <span className="text-xs font-light text-foreground">{USER_TOPUP_CREDITS}</span>
                  </div>
                </div>
                <button
                  onClick={() => setAccountOpen(true)}
                  className="flex items-center gap-1 text-sm font-light text-foreground hover:text-primary transition-colors"
                >
                  {t('common.usageDetails')} <span>›</span>
                </button>
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Avatar with Hover Card */}
          <HoverCard openDelay={200} closeDelay={300}>
            <HoverCardTrigger asChild>
              <button className="rounded-full focus:outline-none" type="button">
                <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userInfo?.nickname || 'User'} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-light">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </HoverCardTrigger>
            <HoverCardContent align="end" className="w-72 p-4 rounded-2xl bg-popover/70 backdrop-blur-xl border-border/50 shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-14 h-14">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userInfo?.nickname || 'User'} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-light">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-sm font-light text-foreground">{userInfo?.nickname || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{userInfo?.email || userInfo?.mobile || '—'}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-light px-5"
                  asChild
                >
                  <a href={PORTAL_HOME_URL} target="_blank" rel="noopener noreferrer" className="font-light">
                    {t('common.upgrade')}
                  </a>
                </Button>
                <div className="w-full flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">{t('common.credits')}</span>
                  <button
                    onClick={() => setAccountOpen(true)}
                    className="flex items-center gap-1 text-sm font-light text-foreground hover:text-primary transition-colors"
                  >
                    {USER_CREDITS} <span className="text-muted-foreground">→</span>
                  </button>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </header>

      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}
