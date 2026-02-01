import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initOAuth, isTokenValid } from '@/services/oauthApi';
import { setShowLoginDialog, setClearUserState } from '@/services/apiInterceptor';
import { LoginDialog } from '@/components/LoginDialog';
import { getUserInfo, getUserInfoFromCache, clearUserInfoCache, type UserInfo } from '@/services/userApi';

interface OAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  showLoginDialog: () => void;
  userInfo: UserInfo | null;
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
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // 初始化时从缓存加载用户信息
  useEffect(() => {
    const cachedUserInfo = getUserInfoFromCache();
    if (cachedUserInfo) {
      setUserInfo(cachedUserInfo);
    }
  }, []);

  // 初始化 OAuth 和获取用户信息
  useEffect(() => {
    const initializeOAuth = async () => {
      try {
        const success = await initOAuth();
        if (success) {
          // 初始化成功，正常展示首页
          setIsAuthenticated(true);
          // 确保登录弹窗关闭
          setShowLoginDialog(false);
          
          // 获取用户信息（抑制 401 错误，避免触发全局登录弹窗）
          // 如果 token 有效但用户信息接口返回 401，可能是接口权限问题，不应该显示登录弹窗
          try {
            const userInfoResponse = await getUserInfo(true); // suppress401Error = true
            if (userInfoResponse.success && userInfoResponse.data) {
              setUserInfo(userInfoResponse.data);
              console.log('User info:', userInfoResponse.data);
            } else {
              // 如果 API 获取失败（包括 401），检查是否是 token 真的无效
              if (userInfoResponse.code === '401' || userInfoResponse.code === 401) {
                // 用户信息接口返回 401，检查 token 是否真的存在
                if (!isTokenValid()) {
                  // token 确实不存在，需要登录
                  setShowLoginDialog(true);
                  setIsAuthenticated(false);
                  clearUserInfoCache();
                  setUserInfo(null);
                  return; // 提前返回，不继续执行
                } else {
                  // token 存在但接口返回 401，可能是接口权限问题或接口暂时不可用
                  // 不显示登录弹窗，使用缓存
                  console.warn('User info API returned 401 but token exists, using cache');
                }
              }
              
              // 尝试使用缓存
              const cachedUserInfo = getUserInfoFromCache();
              if (cachedUserInfo) {
                setUserInfo(cachedUserInfo);
              }
            }
          } catch (userInfoError) {
            console.error('Failed to get user info:', userInfoError);
            // 获取用户信息失败，尝试使用缓存
            const cachedUserInfo = getUserInfoFromCache();
            if (cachedUserInfo) {
              setUserInfo(cachedUserInfo);
            }
          }
        } else {
          // 初始化失败（没有 token 且没有 oauth_code），弹出登录弹窗
          setShowLoginDialog(true);
          setIsAuthenticated(false);
          // 清除用户信息缓存
          clearUserInfoCache();
          setUserInfo(null);
        }
      } catch (error) {
        console.error('OAuth initialization error:', error);
        // 发生错误，弹出登录弹窗
        setShowLoginDialog(true);
        setIsAuthenticated(false);
        // 清除用户信息缓存
        clearUserInfoCache();
        setUserInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeOAuth();
  }, []);

  // 显示登录弹窗（用于token失效时）
  const handleShowLoginDialog = () => {
    console.log('4')
    setShowLoginDialog(true);
  };

  // 清除用户状态（用于token失效时）
  const handleClearUserState = () => {
    setIsAuthenticated(false);
    clearUserInfoCache();
    setUserInfo(null);
  };

  // 注册登录弹窗显示函数和清除用户状态函数到 API 拦截器
  // useEffect(() => {
  //   setShowLoginDialog(handleShowLoginDialog);
  //   setClearUserState(handleClearUserState);
  // }, []);

  // 检查token有效性
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const checkToken = () => {
        if (!isTokenValid()) {
          setIsAuthenticated(false);
          handleShowLoginDialog();
        }
      };
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
        userInfo,
      }}
    >
      {children}
      <LoginDialog open={showLoginDialog} />
    </OAuthContext.Provider>
  );
}
