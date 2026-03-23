'use client';

import { ReactNode, useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MemoryProvider } from '@/contexts/MemoryContext';
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
  'tiktok-solution',
];

export function AppShell({ children }: AppShellProps) {
  const { activeModule, sidebarCollapsed, setSidebarCollapsed } = useModule();
  const pathname = usePathname();
  const router = useRouter();

  const pageIdFromPath = useMemo(() => {
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[1];
    }
    return defaultItems[activeModule];
  }, [pathname, activeModule]);

  const [activeItem, setActiveItem] = useState(pageIdFromPath);

  useEffect(() => {
    setActiveItem(pageIdFromPath);
  }, [pageIdFromPath]);

  // 当 activeModule 变化时，检查是否需要导航到对应的默认页面
  // 注意：这个 useEffect 主要用于从外部（如直接访问 URL）同步 activeModule
  // TopNav 的切换会直接导航，不需要这里再次导航
  useEffect(() => {
    const defaultItem = defaultItems[activeModule];
    const modulePath = `/${activeModule}`;

    if (pathname !== '/' && !pathname.startsWith(modulePath)) {
      router.push(`/${activeModule}/${defaultItem}`);
    }
  }, [activeModule, pathname, router]);

  // Auto-collapse/expand based on active item
  useEffect(() => {
    if (toolItems.includes(activeItem)) {
      setSidebarCollapsed(true);
    } else if (homeItems.includes(activeItem)) {
      setSidebarCollapsed(false);
    }
  }, [activeItem, setSidebarCollapsed]);

  const isAppPlaza = activeModule === 'ai-toolbox' && activeItem === 'app-plaza';

  return (
    <MemoryProvider>
      <div
        className="min-h-screen flex flex-col"
        style={isAppPlaza
          ? {
              background:
                'radial-gradient(ellipse at 20% 20%, hsla(25, 100%, 92%, 0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, hsla(340, 80%, 92%, 0.5) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, hsla(0, 0%, 100%, 1) 0%, transparent 60%), hsl(0, 0%, 100%)',
            }
          : { background: 'hsl(var(--background))' }}
      >
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
          <DynamicSidebar activeItem={activeItem} onItemClick={setActiveItem} />
          <main className={`flex-1 overflow-auto pt-14 transition-all duration-300 ${sidebarCollapsed ? 'pl-[68px]' : 'pl-64'}`}>
            {children(activeItem, setActiveItem)}
          </main>
        </div>
      </div>
    </MemoryProvider>
  );
}
