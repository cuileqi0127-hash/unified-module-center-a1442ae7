import { AppShell } from "@/components/layout/AppShell";
import { GEOInsightsModule } from "@/components/modules/geo-insights/GEOInsightsModule";
import { useActiveModuleOnMount } from "@/hooks/useActiveModuleOnMount";

export function GEOInsightsPage({ pageId }: { pageId: string }) {
  useActiveModuleOnMount("geo-insights");

  return (
    <AppShell>
      {() => <GEOInsightsModule activeItem={pageId} />}
    </AppShell>
  );
}
