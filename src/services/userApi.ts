/**
 * User API Service
 * 用户信息 API 服务
 */

import { apiGet, type ApiResponse } from './apiClient';
import { getAuthHeaders } from './apiInterceptor';

// 用户信息缓存键
const USER_INFO_CACHE_KEY = 'user_info_cache';

// 用户信息接口
export interface UserInfo {
  id?: string;
  username?: string;
  nickname?: string;
  gender?: number;
  email?: string;
  phone?: string | null;
  avatar?: string;
  description?: string | null;
  pwdResetTime?: string | null;
  pwdExpired?: boolean;
  registrationDate?: string;
  deptId?: string | null;
  deptName?: string | null;
  permissions?: any[];
  roles?: any[];
  roleNames?: string | null;
  [key: string]: any; // 允许其他字段
}

/**
 * 从缓存获取用户信息
 * @returns 缓存的用户信息，如果不存在则返回 null
 */
export function getUserInfoFromCache(): UserInfo | null {
  try {
    const cached = localStorage.getItem(USER_INFO_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as UserInfo;
    }
  } catch (error) {
    console.error('Failed to get user info from cache:', error);
  }
  return null;
}

/**
 * 保存用户信息到缓存
 * @param userInfo 用户信息
 */
export function saveUserInfoToCache(userInfo: UserInfo): void {
  try {
    localStorage.setItem(USER_INFO_CACHE_KEY, JSON.stringify(userInfo));
  } catch (error) {
    console.error('Failed to save user info to cache:', error);
  }
}

/**
 * 清除用户信息缓存
 */
export function clearUserInfoCache(): void {
  try {
    localStorage.removeItem(USER_INFO_CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear user info cache:', error);
  }
}

/**
 * 获取用户信息
 * @param suppress401Error 是否抑制 401 错误（不触发全局登录弹窗），默认 false
 * @returns 用户信息
 */
export async function getUserInfo(suppress401Error: boolean = false): Promise<ApiResponse<UserInfo>> {
  const API_BASE_URL = '/api';
  const url = `${API_BASE_URL}/auth/user/info`;
  
  try {
    // 如果 suppress401Error 为 true，直接使用 fetch 而不是 apiGet，避免触发全局 401 处理
    if (suppress401Error) {
      const headers = getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      const data: ApiResponse<UserInfo> = await response.json();
      console.log('User info response:', data);
      
      // 如果获取成功，保存到缓存
      if (data.success && data.data) {
        saveUserInfoToCache(data.data);
      }
      
      return data;
    } else {
      // 使用 apiGet，会触发全局 401 处理
      const response = await apiGet<UserInfo>('/auth/user/info');
      console.log('User info response:', response);
      
      // 如果获取成功，保存到缓存
      if (response.success && response.data) {
        saveUserInfoToCache(response.data);
      }
      
      return response;
    }
  } catch (error) {
    // 如果 suppress401Error 为 true，且是 401 错误，返回一个失败的响应而不是抛出错误
    if (suppress401Error && error instanceof Error && 
        (error.message.includes('401') || error.message.includes('Token expired'))) {
      console.warn('User info API returned 401, but suppressing error');
      return {
        code: '401',
        msg: 'Unauthorized',
        success: false,
        data: null as any,
      };
    }
    // 其他错误正常抛出
    throw error;
  }
}
