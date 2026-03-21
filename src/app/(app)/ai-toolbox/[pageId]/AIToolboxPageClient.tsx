"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AIToolboxModule } from "@/components/modules/ai-toolbox/AIToolboxModule";
import { useModule } from "@/contexts/ModuleContext";

export function AIToolboxPageClient({ pageId }: { pageId: string }) {
  const router = useRouter();
  const { setActiveModule } = useModule();

  useEffect(() => {
    setActiveModule("ai-toolbox");
  }, [setActiveModule]);

  return (
    <AppShell>
      {() => {
        const handleNavigate = (itemId: string) => {
          router.push(`/ai-toolbox/${itemId}`);
        };
        return <AIToolboxModule activeItem={pageId} onNavigate={handleNavigate} />;
      }}
    </AppShell>
  );
}
