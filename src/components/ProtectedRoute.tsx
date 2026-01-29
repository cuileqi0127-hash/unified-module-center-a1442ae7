import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getCookie } from '@/utils/cookies';
import { LoginDialog } from '@/components/LoginDialog';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 路由守卫组件
 * 检查 cookies 中是否有 auth_token
 * 如果没有 token，显示登录弹窗
 * 每次路由切换时都会重新检查 token
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const location = useLocation();

  // 检查 token 的函数
  const checkToken = () => {
    const token = getCookie('auth_token');
    if (!token) {
      // 没有 token，显示登录弹窗
      setShowLoginDialog(true);
    } else {
      // 有 token，隐藏登录弹窗
      setShowLoginDialog(false);
    }
  };

  // 组件挂载时检查 token
  useEffect(() => {
    checkToken();
  }, []);

  // 路由变化时重新检查 token
  useEffect(() => {
    checkToken();
  }, [location.pathname]);

  // 定期检查 token（用于检测 token 被删除的情况）
  useEffect(() => {
    const interval = setInterval(checkToken, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {children}
      <LoginDialog open={showLoginDialog} />
    </>
  );
}
