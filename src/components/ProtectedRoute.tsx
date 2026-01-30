import { ReactNode } from 'react';
import { useOAuth } from '@/contexts/OAuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 路由守卫组件
 * 使用 OAuthContext 的认证状态
 * OAuthContext 已经管理了登录弹窗的显示，这里不需要重复显示
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // 使用 OAuthContext 的认证状态
  // OAuthContext 已经处理了登录弹窗的显示逻辑
  const { isAuthenticated, isLoading } = useOAuth();

  // 如果正在加载，不渲染内容（OAuthContext 会显示加载状态）
  // 如果未认证，OAuthContext 会显示登录弹窗
  // 这里只需要渲染子组件即可
  return <>{children}</>;
}
