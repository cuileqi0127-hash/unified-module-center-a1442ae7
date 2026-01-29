import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';
import { DynamicSidebar } from './DynamicSidebar';
import { useModule } from '@/contexts/ModuleContext';
import { ModuleType } from '@/types/modules';

interface AppShellProps {
  children: (activeItem: string, onNavigate: (itemId: string) => void) => ReactNode;
}

const defaultItems: Record<ModuleType, string> = {
  'llm-console': 'playground',
  'geo-insights': 'dashboard',
  'ai-toolbox': 'app-plaza',
};

// Items that should trigger auto-collapse (tool/canvas views)
const toolItems = [
  'text-to-image',
  'ecommerce-assets',
  'reference-to-image',
  'text-to-video',
  'reference-to-video',
  'digital-human',
];

// Items that should trigger auto-expand (home/dashboard views)
const homeItems = [
  'app-plaza',
  'dashboard',
  'playground',
];

export function AppShell({ children }: AppShellProps) {
  const { activeModule, sidebarCollapsed, setSidebarCollapsed } = useModule();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 从路由路径中提取页面ID
  const getPageIdFromPath = (): string => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[1]; // 例如 /ai-toolbox/text-to-image -> text-to-image
    }
    return defaultItems[activeModule];
  };

  const [activeItem, setActiveItem] = useState(getPageIdFromPath());

  // 当路由变化时，更新 activeItem
  useEffect(() => {
    const pageId = getPageIdFromPath();
    setActiveItem(pageId);
  }, [location.pathname, activeModule]);

  // 当 activeModule 变化时，检查是否需要导航到对应的默认页面
  // 注意：这个 useEffect 主要用于从外部（如直接访问 URL）同步 activeModule
  // TopNav 的切换会直接导航，不需要这里再次导航
  useEffect(() => {
    const defaultItem = defaultItems[activeModule];
    const currentPageId = getPageIdFromPath();
    const modulePath = `/${activeModule}`;
    
    // 如果当前路径不属于当前模块，且不是根路径，则导航到默认页面
    if (location.pathname !== '/' && !location.pathname.startsWith(modulePath)) {
      navigate(`/${activeModule}/${defaultItem}`);
    }
  }, [activeModule, location.pathname, navigate]);

  // Auto-collapse/expand based on active item
  useEffect(() => {
    if (toolItems.includes(activeItem)) {
      setSidebarCollapsed(true);
    } else if (homeItems.includes(activeItem)) {
      setSidebarCollapsed(false);
    }
  }, [activeItem, setSidebarCollapsed]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <DynamicSidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <main className={`flex-1 overflow-auto pt-14 transition-all duration-500 ${sidebarCollapsed ? 'pl-[64px]' : 'pl-64'}`}>
          {children(activeItem, setActiveItem)}
        </main>
      </div>
    </div>
  );
}
