import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AIToolboxModule } from "@/components/modules/ai-toolbox/AIToolboxModule";
import { useActiveModuleOnMount } from "@/hooks/useActiveModuleOnMount";

export function AIToolboxPage({ pageId }: { pageId: string }) {
  const navigate = useNavigate();
  useActiveModuleOnMount("ai-toolbox");

  return (
    <AppShell>
      {() => {
        const handleNavigate = (itemId: string) => {
          navigate(`/ai-toolbox/${itemId}`);
        };
        return (
          <AIToolboxModule activeItem={pageId} onNavigate={handleNavigate} />
        );
      }}
    </AppShell>
  );
}
