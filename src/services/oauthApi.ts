/**
 * OAuth API Service
 * OAuth 认证 API 服务
 */

import { getCookie, setCookie, deleteCookie } from '@/utils/cookies';

// 根据环境变量判断使用代理还是直接访问
// 生产环境也使用相对路径，通过 Nginx 代理转发
const OAUTH_API_BASE_URL = '/api';
const OAUTH_CODE_KEY = 'oauth_code';
const OAUTH_TOKEN_KEY = 'auth_token'; // 改为使用 cookies 中的 auth_token

// 根据环境变量判断登录跳转地址
const LOGIN_REDIRECT_URL = 'https://www.oran.cn/'

// Token 数据接口
export interface TokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Token 响应接口
export interface TokenResponse {
  code: string; // 注意：code 是字符串类型 "0"
  msg: string;
  success: boolean;
  timestamp: number;
  data: TokenData | null;
}

/**
 * 从 URL 参数中获取 oauth_code
 */
export function getOAuthCodeFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('oauth_code');
}

/**
 * 获取缓存的 OAuth Code
 */
export function getCachedOAuthCode(): string | null {
  return localStorage.getItem(OAUTH_CODE_KEY);
}

/**
 * 保存 OAuth Code 到缓存
 */
export function setCachedOAuthCode(code: string): void {
  localStorage.setItem(OAUTH_CODE_KEY, code);
}

/**
 * 获取缓存的 Token（从 cookies 中读取）
 */
export function getCachedToken(): string | null {
  return getCookie(OAUTH_TOKEN_KEY);
}

/**
 * 保存 Token 到 cookies
 */
export function setCachedToken(token: string): void {
  setCookie(OAUTH_TOKEN_KEY, token);
}

/**
 * 清除 OAuth 相关缓存
 */
export function clearOAuthCache(): void {
  localStorage.removeItem(OAUTH_CODE_KEY);
  deleteCookie(OAUTH_TOKEN_KEY);
}

/**
 * 跳转到登录页面
 */
export function redirectToLogin(): void {
  window.location.href = LOGIN_REDIRECT_URL;
}

/**
 * 使用 OAuth Code 获取 Token
 * 
 * @param code OAuth Code
 * @returns Promise<TokenResponse>
 * @throws {Error} 当请求失败时抛出错误
 */
export async function getTokenByCode(code: string): Promise<TokenResponse> {
  try {
    const response = await fetch(`${OAUTH_API_BASE_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        grantType: 'authorization_code',
        clientId: 'portal-a'
      }),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data: TokenResponse = await response.json();
    
    // 检查响应是否成功（code 是字符串 "0"）
    if (!data.success || data.code !== "0") {
      throw new Error(data.msg || 'Token request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred during token request');
  }
}

/**
 * 初始化 OAuth 认证流程
 * 1. 先判断 cookies 有没有 auth_token，如果有就直接进入首页
 * 2. 如果没有就判断 url 上有没有 oauth_code，如果有就调 /oauth2/token 接口
 * 3. 如果 url 上也没有 oauth_code，返回 false，由调用方弹出登录弹窗
 * 
 * @returns Promise<boolean> 返回是否成功初始化（true: 成功，false: 需要弹出登录弹窗）
 */
export async function initOAuth(): Promise<boolean> {
  // 1. 先判断 cookies 有没有 auth_token
  const cachedToken = getCachedToken();
  if (cachedToken) {
    // 清除 URL 中的 oauth_code 参数（避免刷新时重复处理）
    const url = new URL(window.location.href);
    url.searchParams.delete('oauth_code');
    window.history.replaceState({}, '', url.toString());
    // 有 token，直接返回成功，正常展示首页
    return true;
  }

  // 2. cookies 中没有 token，判断 url 上有没有 oauth_code
  const urlCode = getOAuthCodeFromUrl();
  
  if (!urlCode) {
    // URL 上也没有 oauth_code，需要弹出登录弹窗
    return false;
  }

  // 3. URL 上有 oauth_code，保存到缓存并调用接口获取 token
  setCachedOAuthCode(urlCode);
  
  try {
    const tokenResponse = await getTokenByCode(urlCode);
    if (tokenResponse.data?.access_token) {
      setCachedToken(tokenResponse.data.access_token);
      
      // 清除 URL 中的 oauth_code 参数（避免刷新时重复处理）
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth_code');
      window.history.replaceState({}, '', url.toString());
      
      // 接口调用成功，正常展示首页
      return true;
    } else {
      // data 为 null 或没有 access_token，认为 token 获取失败
      clearOAuthCache();
      return false;
    }
  } catch (error) {
    // token 获取失败，清除缓存
    clearOAuthCache();
    return false;
  }
}

/**
 * 检查 token 是否有效
 * 检查 cookies 中是否有 auth_token
 */
export function isTokenValid(): boolean {
  const token = getCachedToken();
  return !!token;
}
