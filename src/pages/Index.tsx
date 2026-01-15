import { AppShell } from '@/components/layout/AppShell';
import { ModuleProvider, useModule } from '@/contexts/ModuleContext';
import { LLMConsoleModule } from '@/components/modules/llm-console/LLMConsoleModule';
import { GEOInsightsModule } from '@/components/modules/geo-insights/GEOInsightsModule';
import { AIToolboxModule } from '@/components/modules/ai-toolbox/AIToolboxModule';

function ModuleRenderer({ activeItem, onNavigate }: { activeItem: string; onNavigate: (itemId: string) => void }) {
  const { activeModule } = useModule();

  switch (activeModule) {
    case 'llm-console':
      return <LLMConsoleModule activeItem={activeItem} />;
    case 'geo-insights':
      return <GEOInsightsModule activeItem={activeItem} />;
    case 'ai-toolbox':
      return <AIToolboxModule activeItem={activeItem} onNavigate={onNavigate} />;
    default:
      return <LLMConsoleModule activeItem={activeItem} />;
  }
}

const Index = () => {
  return (
    <ModuleProvider>
      <AppShell>
        {(activeItem, onNavigate) => <ModuleRenderer activeItem={activeItem} onNavigate={onNavigate} />}
      </AppShell>
    </ModuleProvider>
  );
};

export default Index;
