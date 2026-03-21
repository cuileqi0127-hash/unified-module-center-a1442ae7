import { redirect } from "next/navigation";
import { isBlockedToolboxPage } from "@/constants/comingSoon";
import { AIToolboxPageClient } from "./AIToolboxPageClient";

const PAGE_ID_REDIRECTS: Record<string, string> = {
  "campaign-planner": "app-plaza",
  "brand-health": "market-insights",
};

export default function AIToolboxPage({
  params,
}: {
  params: { pageId: string };
}) {
  const { pageId } = params;
  const redirectTo = PAGE_ID_REDIRECTS[pageId];
  if (redirectTo) {
    redirect(`/ai-toolbox/${redirectTo}`);
  }
  if (isBlockedToolboxPage(pageId)) {
    redirect("/ai-toolbox/app-plaza");
  }
  return <AIToolboxPageClient pageId={pageId} />;
}
