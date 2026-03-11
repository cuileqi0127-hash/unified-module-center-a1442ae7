import { useModule } from '@/contexts/ModuleContext';
import { ModuleType } from '@/types/modules';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PenTool,
  History,
  Users,
  Settings,
  MessageSquare,
  Key,
  FileText,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wallet,
  User,
  TrendingUp,
  Megaphone,
  ImageIcon,
  Video,
  Film,
  ShoppingBag,
  Layers,
  ChevronDown,
  LayoutGrid,
  PanelLeftClose,
  PanelLeft,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMING_SOON_ITEMS } from '@/constants/comingSoon';

interface SidebarItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

interface SidebarSubgroup {
  titleKey: string;
  items: SidebarItem[];
}

interface SidebarSection {
  titleKey: string;
  items?: SidebarItem[];
  subgroups?: SidebarSubgroup[];
  defaultOpen?: boolean;
  isGroupHeader?: boolean;
}

const sidebarConfig: Record<ModuleType, SidebarSection[]> = {
  'geo-insights': [
    {
      titleKey: '',
      items: [
        { id: 'dashboard', labelKey: 'geoInsights.dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'write-article', labelKey: 'geoInsights.writeArticle', icon: <PenTool className="w-4 h-4" /> },
        { id: 'my-articles', labelKey: 'geoInsights.myArticles', icon: <FileText className="w-4 h-4" /> },
        { id: 'audit-history', labelKey: 'geoInsights.auditHistory', icon: <History className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'competitor', labelKey: 'geoInsights.competitor', icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'settings', labelKey: 'geoInsights.settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ],
  'llm-console': [
    {
      titleKey: '',
      items: [
        { id: 'playground', labelKey: 'llmConsole.playground', icon: <MessageSquare className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'dashboard', labelKey: 'llmConsole.dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'tokens', labelKey: 'llmConsole.tokens', icon: <Key className="w-4 h-4" /> },
        { id: 'usage', labelKey: 'llmConsole.usage', icon: <BarChart3 className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'wallet', labelKey: 'llmConsole.wallet', icon: <Wallet className="w-4 h-4" /> },
        { id: 'profile', labelKey: 'llmConsole.profile', icon: <User className="w-4 h-4" /> },
      ],
    },
  ],
  'ai-toolbox': [
    {
      titleKey: '',
      items: [
        { id: 'app-plaza', labelKey: 'sidebar.appPlaza', icon: <LayoutGrid className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'market-insights', labelKey: 'sidebar.marketInsights', icon: <TrendingUp className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'planning-solutions', labelKey: 'sidebar.planningSolutions', icon: <Megaphone className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: 'sidebar.materialGeneration',
      isGroupHeader: true,
      defaultOpen: true,
      subgroups: [
        {
          titleKey: 'sidebar.imageGeneration',
          items: [
            { id: 'text-to-image', labelKey: 'sidebar.imageGeneration', icon: <ImageIcon className="w-4 h-4" /> },
          ],
        },
        {
          titleKey: 'sidebar.videoGeneration',
          items: [
            { id: 'text-to-video', labelKey: 'sidebar.videoGeneration', icon: <Video className="w-4 h-4" /> },
          ],
        },
        {
          titleKey: 'sidebar.videoReplication',
          items: [
            { id: 'reference-to-video', labelKey: 'sidebar.videoReplication', icon: <Copy className="w-4 h-4" /> },
          ],
        },
      ],
    },
    {
      titleKey: 'sidebar.toolbox',
      isGroupHeader: true,
      defaultOpen: true,
      subgroups: [
        {
          titleKey: '',
          items: [
            { id: 'tiktok-viral-video-matching', labelKey: 'sidebar.tiktokViralVideoMatching', icon: <Film className="w-4 h-4" /> },
          ],
        },
      ],
    },
  ],
};

interface DynamicSidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

export function DynamicSidebar({ activeItem, onItemClick }: DynamicSidebarProps) {
  const { activeModule, sidebarCollapsed, setSidebarCollapsed } = useModule();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const sections = sidebarConfig[activeModule];
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((section) => {
      if (section.defaultOpen) {
        initial[section.titleKey] = true;
      }
    });
    return initial;
  });

  // 根据模块类型和页面ID生成路由路径
  const getRoutePath = (itemId: string) => {
    switch (activeModule) {
      case 'ai-toolbox':
        return `/ai-toolbox/${itemId}`;
      case 'llm-console':
        return `/llm-console/${itemId}`;
      case 'geo-insights':
        return `/geo-insights/${itemId}`;
      default:
        return `/ai-toolbox/${itemId}`;
    }
  };

  // 处理侧边栏项点击，使用路由导航
  const handleItemClick = (itemId: string) => {
    const routePath = getRoutePath(itemId);
    navigate(routePath);
    // 同时调用原有的回调函数以保持兼容性
    onItemClick(itemId);
  };

  const toggleSection = (titleKey: string) => {
    setOpenSections((prev) => ({ ...prev, [titleKey]: !prev[titleKey] }));
  };

  const renderItem = (item: SidebarItem) => {
    const isComingSoon = COMING_SOON_ITEMS.includes(item.id);
    
    const button = (
      <button
        key={item.id}
        onClick={() => !isComingSoon && handleItemClick(item.id)}
        disabled={isComingSoon}
        className={cn(
          'sidebar-menu-item w-full',
          activeItem === item.id && 'active',
          sidebarCollapsed && 'justify-center px-2',
          isComingSoon && 'opacity-50 cursor-not-allowed'
        )}
      >
        {item.icon}
        {!sidebarCollapsed && <span className="text-left">{t(item.labelKey)}</span>}
      </button>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {isComingSoon ? 'Coming Soon' : t(item.labelKey)}
          </TooltipContent>
        </Tooltip>
      );
    }

    // 非折叠状态下，为 Coming Soon 项添加 Tooltip
    if (isComingSoon) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            Coming Soon
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'bg-sidebar/20 backdrop-blur-xl border-r border-sidebar-border/15 flex flex-col transition-all duration-300 ease-in-out fixed h-screen top-0 pt-14 box-border z-40',
          sidebarCollapsed ? 'w-[68px]' : 'w-64 shadow-soft-xl'
        )}
      >
        <div className="flex-1 py-4 overflow-y-auto">
          {sections.map((section, idx) => (
            <div key={section.titleKey || idx} className={cn(idx > 0 && section.isGroupHeader ? 'mt-2' : idx > 0 && 'mt-3')}>
              {section.subgroups ? (
                // Collapsible section with subgroups
                <Collapsible
                  open={sidebarCollapsed ? true : openSections[section.titleKey]}
                  onOpenChange={() => !sidebarCollapsed && toggleSection(section.titleKey)}
                >
                  <CollapsibleTrigger className="w-full">
                    {!sidebarCollapsed && (
                      <div className="flex items-center justify-between px-4 py-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors cursor-pointer">
                        <span>{t(section.titleKey)}</span>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform',
                            openSections[section.titleKey] && 'rotate-180'
                          )}
                        />
                      </div>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                    <div className={cn('space-y-2', sidebarCollapsed ? 'px-1.5' : 'px-2')}>
                      {section.subgroups.map((subgroup) => (
                        <div key={subgroup.titleKey}>
                          {!sidebarCollapsed && (
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              {t(subgroup.titleKey)}
                            </div>
                          )}
                          <nav className="space-y-0.5">
                            {subgroup.items.map(renderItem)}
                          </nav>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // Regular section
                <>
                  {!sidebarCollapsed && section.titleKey && (
                    <div className="px-4 py-2 text-sm font-semibold text-foreground text-left">
                      {t(section.titleKey)}
                    </div>
                  )}
                  <nav className={cn('space-y-0.5', sidebarCollapsed ? 'px-1.5' : 'px-2')}>
                    {section.items?.map(renderItem)}
                  </nav>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-sidebar-border/30">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all rounded-xl',
                  sidebarCollapsed ? 'justify-center' : 'justify-start'
                )}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="w-4 h-4" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4" />
                    <span>{t('common.collapse')}</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">
                {t('common.expand')}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
