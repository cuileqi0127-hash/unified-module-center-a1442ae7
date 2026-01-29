/**
 * API Client
 * 统一的 API 客户端封装
 * 
 * 提供统一的请求方法，自动处理：
 * - Token 认证
 * - 错误处理
 * - 响应解析
 * - Token 过期处理
 */

import { authenticatedFetch, getAuthHeaders } from './apiInterceptor';

// 根据环境变量判断使用代理还是直接访问
const API_BASE_URL = import.meta.env.DEV 
  ? '/api'  // 开发环境使用代理
  : 'http://192.168.112.253:8000';  // 生产环境使用完整 URL

// 统一 API 响应格式
export interface ApiResponse<T = any> {
  code: number | string;
  msg: string;
  success: boolean;
  timestamp?: number;
  data: T;
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
}

// 请求配置
export interface RequestConfig extends RequestInit {
  // 是否使用认证（默认 true）
  useAuth?: boolean;
  // 是否自动解析 JSON（默认 true）
  parseJson?: boolean;
  // 自定义 base URL
  baseURL?: string;
}

/**
 * 统一的 GET 请求
 */
export async function apiGet<T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = baseURL ? `${baseURL}${endpoint}` : `${API_BASE_URL}${endpoint}`;

  const response = useAuth
    ? await authenticatedFetch(url, {
        method: 'GET',
        ...restConfig,
      })
    : await fetch(url, {
        method: 'GET',
        ...restConfig,
      });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    return await response.json();
  }

  return response as any;
}

/**
 * 统一的 POST 请求
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = baseURL ? `${baseURL}${endpoint}` : `${API_BASE_URL}${endpoint}`;

  // 判断是否为 FormData
  const isFormData = data instanceof FormData;
  
  const headers: HeadersInit = {};
  
  if (useAuth) {
    const authHeaders = getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  // 如果不是 FormData，设置 JSON Content-Type
  if (!isFormData && data) {
    headers['Content-Type'] = 'application/json';
  }

  // 合并自定义 headers
  if (restConfig.headers) {
    Object.assign(headers, restConfig.headers);
  }

  const body = isFormData ? data : (data ? JSON.stringify(data) : undefined);

  const response = useAuth
    ? await authenticatedFetch(url, {
        method: 'POST',
        headers,
        body,
        ...restConfig,
      })
    : await fetch(url, {
        method: 'POST',
        headers,
        body,
        ...restConfig,
      });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    return await response.json();
  }

  return response as any;
}

/**
 * 统一的 PATCH 请求
 */
export async function apiPatch<T = any>(
  endpoint: string,
  data?: any,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = baseURL ? `${baseURL}${endpoint}` : `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {};
  
  if (useAuth) {
    const authHeaders = getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  if (restConfig.headers) {
    Object.assign(headers, restConfig.headers);
  }

  const response = useAuth
    ? await authenticatedFetch(url, {
        method: 'PATCH',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        ...restConfig,
      })
    : await fetch(url, {
        method: 'PATCH',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        ...restConfig,
      });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    return await response.json();
  }

  return response as any;
}

/**
 * 统一的 DELETE 请求
 * @param endpoint API 端点
 * @param data 请求体数据（可选）
 * @param config 请求配置
 */
export async function apiDelete<T = any>(
  endpoint: string,
  data?: any,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = baseURL ? `${baseURL}${endpoint}` : `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {};
  
  if (useAuth) {
    const authHeaders = getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  // 如果提供了 data，设置 Content-Type
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  if (restConfig.headers) {
    Object.assign(headers, restConfig.headers);
  }

  const response = useAuth
    ? await authenticatedFetch(url, {
        method: 'DELETE',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        ...restConfig,
      })
    : await fetch(url, {
        method: 'DELETE',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        ...restConfig,
      });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    return await response.json();
  }

  return response as any;
}

/**
 * 统一的 PUT 请求
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = baseURL ? `${baseURL}${endpoint}` : `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {};
  
  if (useAuth) {
    const authHeaders = getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  if (restConfig.headers) {
    Object.assign(headers, restConfig.headers);
  }

  const response = useAuth
    ? await authenticatedFetch(url, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        ...restConfig,
      })
    : await fetch(url, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        ...restConfig,
      });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    return await response.json();
  }

  return response as any;
}
