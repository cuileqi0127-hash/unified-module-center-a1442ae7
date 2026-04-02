import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useParams,
} from "react-router-dom";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isBlockedToolboxPage } from "@/constants/comingSoon";
import { AIToolboxPage } from "@/pages/AIToolboxPage";
import { LLMConsolePage } from "@/pages/LLMConsolePage";
import { GEOInsightsPage } from "@/pages/GEOInsightsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const PAGE_ID_REDIRECTS: Record<string, string> = {
  "campaign-planner": "app-plaza",
  "brand-health": "market-insights",
};

function AppSectionLayout() {
  return (
    <ModuleProvider>
      <ProtectedRoute>
        <Outlet />
      </ProtectedRoute>
    </ModuleProvider>
  );
}

function AIToolboxPageRoute() {
  const { pageId } = useParams<{ pageId: string }>();
  if (!pageId) {
    return <Navigate to="/ai-toolbox/app-plaza" replace />;
  }
  const redirectTo = PAGE_ID_REDIRECTS[pageId];
  if (redirectTo) {
    return <Navigate to={`/ai-toolbox/${redirectTo}`} replace />;
  }
  if (isBlockedToolboxPage(pageId)) {
    return <Navigate to="/ai-toolbox/app-plaza" replace />;
  }
  return <AIToolboxPage pageId={pageId} />;
}

function LLMConsolePageRoute() {
  const { pageId } = useParams<{ pageId: string }>();
  if (!pageId) {
    return <Navigate to="/llm-console/playground" replace />;
  }
  return <LLMConsolePage pageId={pageId} />;
}

function GEOInsightsPageRoute() {
  const { pageId } = useParams<{ pageId: string }>();
  if (!pageId) {
    return <Navigate to="/geo-insights/dashboard" replace />;
  }
  return <GEOInsightsPage pageId={pageId} />;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppSectionLayout />}>
        <Route
          path="/"
          element={<Navigate to="/ai-toolbox/app-plaza" replace />}
        />
        <Route
          path="/ai-toolbox"
          element={<Navigate to="/ai-toolbox/app-plaza" replace />}
        />
        <Route path="/ai-toolbox/:pageId" element={<AIToolboxPageRoute />} />
        <Route
          path="/llm-console"
          element={<Navigate to="/llm-console/playground" replace />}
        />
        <Route
          path="/llm-console/:pageId"
          element={<LLMConsolePageRoute />}
        />
        <Route
          path="/geo-insights"
          element={<Navigate to="/geo-insights/dashboard" replace />}
        />
        <Route
          path="/geo-insights/:pageId"
          element={<GEOInsightsPageRoute />}
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
