import { Routes, Route, useParams, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ModuleProvider, useModule } from '@/contexts/ModuleContext';
import { AIToolboxModule } from '@/components/modules/ai-toolbox/AIToolboxModule';
import { LLMConsoleModule } from '@/components/modules/llm-console/LLMConsoleModule';
import { GEOInsightsModule } from '@/components/modules/geo-insights/GEOInsightsModule';

/**
 * AI Toolbox 路由包装组件
 */
function AIToolboxRoute() {
  const { pageId = 'app-plaza' } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const { setActiveModule } = useModule();

  useEffect(() => {
    setActiveModule('ai-toolbox');
  }, [setActiveModule]);

  return (
    <AppShell>
      {(activeItem, onNavigate) => {
        // 使用路由导航替代回调函数
        const handleNavigate = (itemId: string) => {
          navigate(`/ai-toolbox/${itemId}`);
        };
        
        return <AIToolboxModule activeItem={pageId} onNavigate={handleNavigate} />;
      }}
    </AppShell>
  );
}

/**
 * LLM Console 路由包装组件
 */
function LLMConsoleRoute() {
  const { pageId = 'playground' } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const { setActiveModule } = useModule();

  useEffect(() => {
    setActiveModule('llm-console');
  }, [setActiveModule]);

  return (
    <AppShell>
      {(activeItem, onNavigate) => {
        const handleNavigate = (itemId: string) => {
          navigate(`/llm-console/${itemId}`);
        };
        
        return <LLMConsoleModule activeItem={pageId} />;
      }}
    </AppShell>
  );
}

/**
 * GEO Insights 路由包装组件
 */
function GEOInsightsRoute() {
  const { pageId = 'dashboard' } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const { setActiveModule } = useModule();

  useEffect(() => {
    setActiveModule('geo-insights');
  }, [setActiveModule]);

  return (
    <AppShell>
      {(activeItem, onNavigate) => {
        const handleNavigate = (itemId: string) => {
          navigate(`/geo-insights/${itemId}`);
        };
        
        return <GEOInsightsModule activeItem={pageId} />;
      }}
    </AppShell>
  );
}

/**
 * 应用路由配置
 * 所有路由都使用 ProtectedRoute 包裹，进行 token 验证
 * ProtectedRoute 会检查 cookies 中的 auth_token，如果没有则显示登录弹窗
 */
export function AppRoutes() {
  return (
    <ModuleProvider>
      <Routes>
      {/* 默认路由，重定向到 AI Toolbox 首页 */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Navigate to="/ai-toolbox/app-plaza" replace />
          </ProtectedRoute>
        } 
      />
      
      {/* AI Toolbox 路由 */}
      <Route 
        path="/ai-toolbox" 
        element={
          <ProtectedRoute>
            <Navigate to="/ai-toolbox/app-plaza" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ai-toolbox/:pageId" 
        element={
          <ProtectedRoute>
            <AIToolboxRoute />
          </ProtectedRoute>
        } 
      />
      
      {/* LLM Console 路由 */}
      <Route 
        path="/llm-console" 
        element={
          <ProtectedRoute>
            <Navigate to="/llm-console/playground" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/llm-console/:pageId" 
        element={
          <ProtectedRoute>
            <LLMConsoleRoute />
          </ProtectedRoute>
        } 
      />
      
      {/* GEO Insights 路由 */}
      <Route 
        path="/geo-insights" 
        element={
          <ProtectedRoute>
            <Navigate to="/geo-insights/dashboard" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/geo-insights/:pageId" 
        element={
          <ProtectedRoute>
            <GEOInsightsRoute />
          </ProtectedRoute>
        } 
      />
      </Routes>
    </ModuleProvider>
  );
}
