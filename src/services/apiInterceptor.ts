/**
 * API Interceptor
 * API 拦截器 - 处理 token 失效等情况
 */

import { getCachedToken, clearOAuthCache } from './oauthApi';

// 全局登录弹窗显示函数（由 OAuthContext 提供）
let showLoginDialogFn: (() => void) | null = null;
// 全局清除用户状态函数（由 OAuthContext 提供）
let clearUserStateFn: (() => void) | null = null;

/**
 * 设置登录弹窗显示函数
 */
export function setShowLoginDialog(fn: () => void) {
  showLoginDialogFn = fn;
}

/**
 * 设置清除用户状态函数
 */
export function setClearUserState(fn: () => void) {
  clearUserStateFn = fn;
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
 * 1. 检查 HTTP 状态码（401/403）
 * 2. 检查响应 JSON 中的 code 字段（401 表示 token 过期）
 * oauth_token 请求头的接口如果请求失败就弹窗提示请重新登录
 */
/**
 * 处理 401 错误：清除用户状态并显示登录弹窗
 * 导出为公共函数，供其他模块使用
 */
export function handle401Error() {
  // 清除缓存的 token
  clearOAuthCache();
  
  // 清除用户状态
  if (clearUserStateFn) {
    clearUserStateFn();
  }
  
  // 显示登录弹窗提示请重新登录
  if (showLoginDialogFn) {
    showLoginDialogFn();
  }
}

export async function handleApiResponse(response: Response): Promise<Response> {
  // 如果响应状态是 401 未授权或 403 禁止访问 500 网路异常，说明 token 失效或无效
  if (response.status === 401 || response.status === 403 || response.status === 500) {
    handle401Error();
    throw new Error('Token expired or invalid, please login again');
  }

  // 如果 HTTP 状态码是 200，还需要检查响应 JSON 中的 code 字段
  // 某些接口可能返回 HTTP 200，但 JSON 中的 code 为 401 表示 token 过期
  if (response.status === 200) {
    try {
      // 克隆响应对象，避免影响调用方读取响应体
      const clonedResponse = response.clone();
      const contentType = clonedResponse.headers.get('content-type');
      
      // 只检查 JSON 响应
      if (contentType && contentType.includes('application/json')) {
        const data = await clonedResponse.json();
        console.log(data,'data');
        
        // 检查 code 字段是否为 401（token 过期）
        // 兼容 code 为数字或字符串的情况
        const code = data.code;
        const isCode401 = (typeof code === 'number' && code === 401) || 
                         (typeof code === 'string' && code === '401');
        
        if (data && isCode401) {
          handle401Error();
          throw new Error('Token expired or invalid, please login again');
        }
      }
    } catch (error) {
      // 如果解析 JSON 失败或已经抛出错误，直接抛出
      if (error instanceof Error && error.message === 'Token expired or invalid, please login again') {
        throw error;
      }
      // 其他错误（如 JSON 解析失败）忽略，继续返回原始响应
    }
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
