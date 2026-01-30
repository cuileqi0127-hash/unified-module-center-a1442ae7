import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initOAuth, isTokenValid } from '@/services/oauthApi';
import { setShowLoginDialog, setClearUserState } from '@/services/apiInterceptor';
import { LoginDialog } from '@/components/LoginDialog';

interface OAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  showLoginDialog: () => void;
}

const OAuthContext = createContext<OAuthContextType | undefined>(undefined);

export function useOAuth() {
  const context = useContext(OAuthContext);
  if (!context) {
    throw new Error('useOAuth must be used within OAuthProvider');
  }
  return context;
}

interface OAuthProviderProps {
  children: ReactNode;
}

export function OAuthProvider({ children }: OAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // 初始化 OAuth
  useEffect(() => {
    const initializeOAuth = async () => {
      try {
        const success = await initOAuth();
        if (success) {
          // 初始化成功，正常展示首页
          setIsAuthenticated(true);
        } else {
          // 初始化失败（没有 token 且没有 oauth_code），弹出登录弹窗
          setShowLoginDialog(true);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('OAuth initialization error:', error);
        // 发生错误，弹出登录弹窗
        setShowLoginDialog(true);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeOAuth();
  }, []);

  // 显示登录弹窗（用于token失效时）
  const handleShowLoginDialog = () => {
    setShowLoginDialog(true);
  };

  // 清除用户状态（用于token失效时）
  const handleClearUserState = () => {
    setIsAuthenticated(false);
  };

  // 注册登录弹窗显示函数和清除用户状态函数到 API 拦截器
  useEffect(() => {
    setShowLoginDialog(handleShowLoginDialog);
    setClearUserState(handleClearUserState);
  }, []);

  // 检查token有效性
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const checkToken = () => {
        if (!isTokenValid()) {
          setIsAuthenticated(false);
          handleShowLoginDialog();
        }
      };

      // 定期检查token有效性（可选）
      // const interval = setInterval(checkToken, 60000); // 每分钟检查一次
      // return () => clearInterval(interval);
    }
  }, [isLoading, isAuthenticated]);

  // 如果正在加载，不渲染内容
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">正在初始化...</p>
        </div>
      </div>
    );
  }

  // 如果未认证且不在加载中，显示登录弹窗，但仍然渲染内容（弹窗会覆盖）
  return (
    <OAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        showLoginDialog: handleShowLoginDialog,
      }}
    >
      {children}
      <LoginDialog open={showLoginDialog} />
    </OAuthContext.Provider>
  );
}
