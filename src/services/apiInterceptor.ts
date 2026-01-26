/**
 * API Interceptor
 * API 拦截器 - 处理 token 失效等情况
 */

import { getCachedToken, clearOAuthCache } from './oauthApi';

// 全局登录弹窗显示函数（由 OAuthContext 提供）
let showLoginDialogFn: (() => void) | null = null;

/**
 * 设置登录弹窗显示函数
 */
export function setShowLoginDialog(fn: () => void) {
  showLoginDialogFn = fn;
}

/**
 * 获取带 token 的请求头
 */
export function getAuthHeaders(): HeadersInit {
  const token = getCachedToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * 处理 API 响应，检查 token 是否失效
 * oauth_token 请求头的接口如果请求失败就弹窗提示请重新登录
 */
export async function handleApiResponse(response: Response): Promise<Response> {
  // 如果响应状态是 401 未授权或 403 禁止访问，说明 token 失效或无效
  if (response.status === 401 || response.status === 403) {
    // 清除缓存的 token
    clearOAuthCache();
    
    // 显示登录弹窗提示请重新登录
    if (showLoginDialogFn) {
      showLoginDialogFn();
    }
    
    throw new Error('Token expired or invalid, please login again');
  }
  
  return response;
}

/**
 * 封装的 fetch 函数，自动添加 token 和处理 token 失效
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return handleApiResponse(response);
}
