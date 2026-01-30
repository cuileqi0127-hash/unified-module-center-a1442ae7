import { Bell, Settings, ChevronDown, BarChart3, MessageSquare, Wand2, Globe } from 'lucide-react';
import { useModule } from '@/contexts/ModuleContext';
import { MODULES, ModuleType } from '@/types/modules';
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
import { useNavigate } from 'react-router-dom';
import { useOAuth } from '@/contexts/OAuthContext';

const moduleIcons: Record<ModuleType, React.ReactNode> = {
  'geo-insights': <BarChart3 className="w-4 h-4" />,
  'llm-console': <MessageSquare className="w-4 h-4" />,
  'ai-toolbox': <Wand2 className="w-4 h-4" />,
};

const moduleKeys: Record<ModuleType, string> = {
  'geo-insights': 'geoInsights',
  'llm-console': 'llmConsole',
  'ai-toolbox': 'aiToolbox',
};

// 模块默认页面映射
const moduleDefaultPages: Record<ModuleType, string> = {
  'ai-toolbox': 'app-plaza',
  'llm-console': 'playground',
  'geo-insights': 'dashboard',
};

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
  const { activeModule, setActiveModule } = useModule();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userInfo } = useOAuth();
  
  // 获取用户头像首字母
  const userInitial = getInitialFromNickname(userInfo?.nickname);
  
  // 处理头像 URL：如果是相对路径，拼接 API 基础 URL
  const getAvatarUrl = (avatar?: string): string | undefined => {
    if (!avatar) return undefined;
    // 如果已经是完整 URL，直接返回
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    // 如果是相对路径，拼接 API 基础 URL
    return `/api/${avatar}`;
  };
  
  const avatarUrl = getAvatarUrl(userInfo?.avatar);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const handleModuleSwitch = (moduleId: ModuleType) => {
    // 导航到对应模块的默认页面
    const defaultPage = moduleDefaultPages[moduleId];
    navigate(`/${moduleId}/${defaultPage}`);
    // 更新模块状态（导航后会自动更新，但这里确保同步）
    setActiveModule(moduleId);
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 top-0 z-50 fixed left-0 w-screen">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
          <span className="text-background font-bold text-sm">S</span>
        </div>
        <span className="font-semibold text-lg">Oran Gen</span>
      </div>

      {/* Center: Module Switcher */}
      {/* <nav className="flex items-center gap-1 bg-muted p-1 rounded-lg">
        {MODULES.map((module) => (
          <button
            key={module.id}
            onClick={() => handleModuleSwitch(module.id)}
            className={`module-nav-item flex items-center gap-2 ${
              activeModule === module.id ? 'active' : ''
            }`}
          >
            {moduleIcons[module.id]}
            <span className="hidden sm:inline">{t(`modules.${moduleKeys[module.id]}`)}</span>
          </button>
        ))}
      </nav> */}

      {/* Right: User Actions */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={toggleLanguage}
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium">{i18n.language === 'zh' ? '中文' : 'EN'}</span>
        </Button>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-1">
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
            <DropdownMenuItem>{t('common.logout')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
