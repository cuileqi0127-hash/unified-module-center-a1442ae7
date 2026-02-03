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

import { authenticatedFetch, getAuthHeaders, handleApiResponse, handle401Error } from './apiInterceptor';

// 根据环境变量判断使用代理还是直接访问
// 生产环境也使用相对路径，通过 Nginx 代理转发
const API_BASE_URL = '/api';

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

  let response: Response;
  
  if (useAuth) {
    response = await authenticatedFetch(url, {
      method: 'GET',
      ...restConfig,
    });
  } else {
    response = await fetch(url, {
      method: 'GET',
      ...restConfig,
    });
    // 即使不使用认证，也要检查 401 错误
    response = await handleApiResponse(response);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    const data = await response.json();
    // 检查 JSON 响应中的 code 字段是否为 401
    const code = data?.code;
    const isCode401 = (typeof code === 'number' && code === 401) || 
                     (typeof code === 'string' && code === '401');
    if (isCode401) {
      // 处理 401 错误：清除用户状态并显示登录弹窗
      handle401Error();
      throw new Error('Token expired or invalid, please login again');
    }
    return data;
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

  let response: Response;
  
  if (useAuth) {
    response = await authenticatedFetch(url, {
      method: 'POST',
      headers,
      body,
      ...restConfig,
    });
  } else {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      ...restConfig,
    });
    // 即使不使用认证，也要检查 401 错误
    response = await handleApiResponse(response);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    const data = await response.json();
    // 检查 JSON 响应中的 code 字段是否为 401
    const code = data?.code;
    const isCode401 = (typeof code === 'number' && code === 401) || 
                     (typeof code === 'string' && code === '401');
    if (isCode401) {
      // 处理 401 错误：清除用户状态并显示登录弹窗
      handle401Error();
      throw new Error('Token expired or invalid, please login again');
    }
    return data;
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

  let response: Response;
  
  if (useAuth) {
    response = await authenticatedFetch(url, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    });
  } else {
    response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    });
    // 即使不使用认证，也要检查 401 错误
    response = await handleApiResponse(response);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    const data = await response.json();
    // 检查 JSON 响应中的 code 字段是否为 401
    const code = data?.code;
    const isCode401 = (typeof code === 'number' && code === 401) || 
                     (typeof code === 'string' && code === '401');
    if (isCode401) {
      // 处理 401 错误：清除用户状态并显示登录弹窗
      handle401Error();
      throw new Error('Token expired or invalid, please login again');
    }
    return data;
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

  let response: Response;
  
  if (useAuth) {
    response = await authenticatedFetch(url, {
      method: 'DELETE',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    });
  } else {
    response = await fetch(url, {
      method: 'DELETE',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    });
    // 即使不使用认证，也要检查 401 错误
    response = await handleApiResponse(response);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    const data = await response.json();
    // 检查 JSON 响应中的 code 字段是否为 401
    const code = data?.code;
    const isCode401 = (typeof code === 'number' && code === 401) || 
                     (typeof code === 'string' && code === '401');
    if (isCode401) {
      // 处理 401 错误：清除用户状态并显示登录弹窗
      handle401Error();
      throw new Error('Token expired or invalid, please login again');
    }
    return data;
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

  let response: Response;
  
  if (useAuth) {
    response = await authenticatedFetch(url, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    });
  } else {
    response = await fetch(url, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    });
    // 即使不使用认证，也要检查 401 错误
    response = await handleApiResponse(response);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (parseJson) {
    const data = await response.json();
    // 检查 JSON 响应中的 code 字段是否为 401
    const code = data?.code;
    const isCode401 = (typeof code === 'number' && code === 401) || 
                     (typeof code === 'string' && code === '401');
    if (isCode401) {
      // 处理 401 错误：清除用户状态并显示登录弹窗
      handle401Error();
      throw new Error('Token expired or invalid, please login again');
    }
    return data;
  }

  return response as any;
}
