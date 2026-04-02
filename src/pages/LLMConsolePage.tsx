import { AppShell } from "@/components/layout/AppShell";
import { LLMConsoleModule } from "@/components/modules/llm-console/LLMConsoleModule";
import { useActiveModuleOnMount } from "@/hooks/useActiveModuleOnMount";

export function LLMConsolePage({ pageId }: { pageId: string }) {
  useActiveModuleOnMount("llm-console");

  return (
    <AppShell>
      {() => <LLMConsoleModule activeItem={pageId} />}
    </AppShell>
  );
}
