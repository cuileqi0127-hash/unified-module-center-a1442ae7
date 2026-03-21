import { LLMConsolePageClient } from "./LLMConsolePageClient";

export default function LLMConsolePage({
  params,
}: {
  params: { pageId: string };
}) {
  return <LLMConsolePageClient pageId={params.pageId} />;
}
