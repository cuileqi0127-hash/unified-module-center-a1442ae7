/**
 * API Interceptor
 * API 拦截器 - 处理 token 失效等情况
 * 统一：401/400/404/500/501（HTTP 状态或 body.code）时清空缓存与 token，并跳转登录
 */

import { getCachedToken, clearOAuthCache, redirectToLogin } from './oauthApi';

/** 触发清空 token 并跳转登录的 code 或 HTTP 状态 */
const AUTH_ERROR_CODES = [401, 400, 404, 500, 501];

/** 判断响应 code 是否需清 token 并跳转登录 */
export function isAuthErrorCode(code: number | string | undefined): boolean {
  if (code === undefined || code === null) return false;
  const n = typeof code === 'string' ? parseInt(code, 10) : code;
  return AUTH_ERROR_CODES.includes(n);
}

// 全局清除用户状态函数（由 OAuthContext 提供）
let clearUserStateFn: (() => void) | null = null;

/**
 * 设置清除用户状态函数
 */
export function setClearUserState(fn: () => void) {
  clearUserStateFn = fn;
}

/** @deprecated 仅兼容旧调用，行为与 clearTokenAndRedirectToLogin 一致 */
export function setShowLoginDialog(_fn: () => void) {
  // 已统一为 redirectToLogin，不再使用弹窗
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
 * 清空 token/缓存并跳转登录（401/400/404/500/501 时统一调用）
 */
export function clearTokenAndRedirectToLogin() {
  clearOAuthCache();
  if (clearUserStateFn) clearUserStateFn();
  redirectToLogin();
}

/**
 * 处理认证/错误码：清除用户状态并跳转登录
 * 导出为公共函数，供其他模块使用
 */
export function handle401Error() {
  clearTokenAndRedirectToLogin();
}

export async function handleApiResponse(response: Response): Promise<Response> {
  // HTTP 状态码 401/400/404/500/501：清空 token 并跳转登录
  if (AUTH_ERROR_CODES.includes(response.status) || response.status === 403) {
    clearTokenAndRedirectToLogin();
    throw new Error('Token expired or invalid, please login again');
  }

  // HTTP 200 时检查响应体中的 code 字段（401/400/404/500/501 同样处理）
  if (response.status === 200) {
    try {
      const clonedResponse = response.clone();
      const contentType = clonedResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await clonedResponse.json();
        if (data && isAuthErrorCode(data.code)) {
          clearTokenAndRedirectToLogin();
          throw new Error('Token expired or invalid, please login again');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Token expired or invalid, please login again') {
        throw error;
      }
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
