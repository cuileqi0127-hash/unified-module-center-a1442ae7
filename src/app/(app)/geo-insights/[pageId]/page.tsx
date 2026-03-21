import { GEOInsightsPageClient } from "./GEOInsightsPageClient";

export default function GEOInsightsPage({
  params,
}: {
  params: { pageId: string };
}) {
  return <GEOInsightsPageClient pageId={params.pageId} />;
}
