"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LLMConsoleModule } from "@/components/modules/llm-console/LLMConsoleModule";
import { useModule } from "@/contexts/ModuleContext";

export function LLMConsolePageClient({ pageId }: { pageId: string }) {
  const { setActiveModule } = useModule();

  useEffect(() => {
    setActiveModule("llm-console");
  }, [setActiveModule]);

  return (
    <AppShell>
      {() => <LLMConsoleModule activeItem={pageId} />}
    </AppShell>
  );
}
