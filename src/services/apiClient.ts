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

import {
  authenticatedFetch,
  getAuthHeaders,
  handleApiResponse,
  handle401Error,
  isAuthErrorCode,
} from "./apiInterceptor";

const API_BASE_URL = "/api";

export interface ApiResponse<T = unknown> {
  code: number | string;
  msg: string;
  success: boolean;
  timestamp?: number;
  data: T;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
}

export interface RequestConfig extends RequestInit {
  useAuth?: boolean;
  parseJson?: boolean;
  baseURL?: string;
}

function resolveUrl(endpoint: string, baseURL?: string): string {
  return baseURL ? `${baseURL}${endpoint}` : `${API_BASE_URL}${endpoint}`;
}

async function parseApiResponse<T = unknown>(
  response: Response,
  parseJson: boolean
): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }
  if (!parseJson) {
    return response as unknown as ApiResponse<T>;
  }
  const data = await response.json();
  if (isAuthErrorCode(data?.code)) {
    handle401Error();
    throw new Error("Token expired or invalid, please login again");
  }
  return data;
}

async function fetchWithAuth(
  url: string,
  init: RequestInit,
  useAuth: boolean
): Promise<Response> {
  if (useAuth) {
    return authenticatedFetch(url, init);
  }
  const response = await fetch(url, init);
  return handleApiResponse(response);
}

export async function apiGet<T = unknown>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = resolveUrl(endpoint, baseURL);
  const response = await fetchWithAuth(
    url,
    { method: "GET", ...restConfig },
    useAuth
  );
  return parseApiResponse<T>(response, parseJson);
}

export async function apiPost<T = unknown>(
  endpoint: string,
  data?: unknown,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = resolveUrl(endpoint, baseURL);
  const isFormData = data instanceof FormData;

  const headers: HeadersInit = {};
  if (useAuth) {
    Object.assign(headers, getAuthHeaders());
  }
  if (!isFormData && data) {
    headers["Content-Type"] = "application/json";
  }
  if (restConfig.headers) {
    Object.assign(headers, restConfig.headers);
  }

  const body = isFormData ? data : data ? JSON.stringify(data) : undefined;
  const response = await fetchWithAuth(
    url,
    { method: "POST", headers, body, ...restConfig },
    useAuth
  );
  return parseApiResponse<T>(response, parseJson);
}

export async function apiPatch<T = unknown>(
  endpoint: string,
  data?: unknown,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = resolveUrl(endpoint, baseURL);

  const headers: HeadersInit = {};
  if (useAuth) {
    Object.assign(headers, getAuthHeaders());
  }
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (restConfig.headers) {
    Object.assign(headers, restConfig.headers);
  }

  const response = await fetchWithAuth(
    url,
    {
      method: "PATCH",
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    },
    useAuth
  );
  return parseApiResponse<T>(response, parseJson);
}

export async function apiDelete<T = unknown>(
  endpoint: string,
  data?: unknown,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = resolveUrl(endpoint, baseURL);

  const headers: HeadersInit = {};
  if (useAuth) {
    Object.assign(headers, getAuthHeaders());
  }
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (restConfig.headers) {
    Object.assign(headers, restConfig.headers);
  }

  const response = await fetchWithAuth(
    url,
    {
      method: "DELETE",
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    },
    useAuth
  );
  return parseApiResponse<T>(response, parseJson);
}

export async function apiPut<T = unknown>(
  endpoint: string,
  data?: unknown,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { useAuth = true, parseJson = true, baseURL, ...restConfig } = config;
  const url = resolveUrl(endpoint, baseURL);

  const headers: HeadersInit = {};
  if (useAuth) {
    Object.assign(headers, getAuthHeaders());
  }
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (restConfig.headers) {
    Object.assign(headers, restConfig.headers);
  }

  const response = await fetchWithAuth(
    url,
    {
      method: "PUT",
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...restConfig,
    },
    useAuth
  );
  return parseApiResponse<T>(response, parseJson);
}
