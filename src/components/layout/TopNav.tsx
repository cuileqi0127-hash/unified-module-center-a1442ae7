import { ChevronDown, Globe, Database } from 'lucide-react';
import logoDark from '@/assets/logo_dark.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useOAuth } from '@/contexts/OAuthContext';
import { clearOAuthCache, redirectToLogin } from '@/services/oauthApi';
import { clearUserInfoCache } from '@/services/userApi';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * 获取用户昵称的首字母
 * 中文显示第一个字符，英文显示第一个字母（大写）
 */
function getInitialFromNickname(nickname?: string): string {
  if (!nickname || nickname.trim() === '') {
    return 'U'; // 默认显示 U
  }
  
  const trimmed = nickname.trim();
  const firstChar = trimmed[0];
  
  // 判断是否为中文字符（Unicode 范围：\u4e00-\u9fa5）
  if (/[\u4e00-\u9fa5]/.test(firstChar)) {
    return firstChar; // 中文返回第一个字符
  } else {
    // 英文返回第一个字母（大写）
    return firstChar.toUpperCase();
  }
}

export function TopNav() {
  const { t, i18n } = useTranslation();
  const { userInfo } = useOAuth();
  const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);

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

  const handleLogout = () => {
    clearOAuthCache();
    clearUserInfoCache();
    redirectToLogin();
  };

  return (
    <>
      <header className="h-14 border-b border-border/10 bg-background/20 backdrop-blur-xl flex items-center justify-between px-4 top-0 z-50 fixed left-0 w-screen">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <img src={logoDark} alt="Logo" className="w-6 h-6 object-fill" />
          <span className="text-lg font-normal">{t('topNav.appName')}</span>
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 flex items-center gap-1.5"
            onClick={() => setMemoryDrawerOpen(true)}
          >
            <Database className="w-4 h-4" />
            <span className="text-xs font-medium">{t('common.memoryLibrary')}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 flex items-center gap-1"
            onClick={toggleLanguage}
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">{i18n.language === 'zh' ? t('topNav.langZh') : t('topNav.langEn')}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-1 hover:bg-foreground/10">
                <Avatar className="w-7 h-7">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={userInfo?.nickname || 'User'} />
                  )}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>{t('common.profile')}</DropdownMenuItem>
            <DropdownMenuItem>{t('common.billing')}</DropdownMenuItem>
            <DropdownMenuItem>{t('common.team')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>{t('common.logout')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      <Sheet open={memoryDrawerOpen} onOpenChange={setMemoryDrawerOpen}>
        <SheetContent className="w-80 sm:w-96">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border space-y-0">
            <SheetTitle className="text-base font-medium">{t('common.memoryLibrary')}</SheetTitle>
          </SheetHeader>
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t('common.noMemoryYet')}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
