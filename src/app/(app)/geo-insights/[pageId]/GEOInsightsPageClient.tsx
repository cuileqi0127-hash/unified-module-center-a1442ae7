"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GEOInsightsModule } from "@/components/modules/geo-insights/GEOInsightsModule";
import { useModule } from "@/contexts/ModuleContext";

export function GEOInsightsPageClient({ pageId }: { pageId: string }) {
  const { setActiveModule } = useModule();

  useEffect(() => {
    setActiveModule("geo-insights");
  }, [setActiveModule]);

  return (
    <AppShell>
      {() => <GEOInsightsModule activeItem={pageId} />}
    </AppShell>
  );
}
