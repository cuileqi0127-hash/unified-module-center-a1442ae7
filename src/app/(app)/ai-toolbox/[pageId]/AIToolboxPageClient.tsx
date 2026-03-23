"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AIToolboxModule } from "@/components/modules/ai-toolbox/AIToolboxModule";
import { useActiveModuleOnMount } from "@/hooks/useActiveModuleOnMount";

export function AIToolboxPageClient({ pageId }: { pageId: string }) {
  const router = useRouter();
  useActiveModuleOnMount("ai-toolbox");

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
