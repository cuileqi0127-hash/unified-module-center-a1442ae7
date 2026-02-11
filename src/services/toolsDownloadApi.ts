/**
 * 工具下载 API（画布下载）
 * 单独封装，不走公共 apiClient；与画布其他接口同源、同 token。
 * POST /api/tools/download，Body: 选中的图层图片/视频 url 数组，最多 6 个；返回文件流。
 * 由后端请求 OSS，避免前端直连 OSS 导致 CORS / net::ERR_FAILED。
 */

import { getAuthHeaders, clearTokenAndRedirectToLogin } from './apiInterceptor';

const API_BASE_URL = '/api';
const DOWNLOAD_ENDPOINT = `${API_BASE_URL}/tools/download`;

const AUTH_ERROR_STATUSES = [401, 400, 404, 500, 501];

/** 下载请求超时（大文件 ZIP 可能较慢） */
const DOWNLOAD_TIMEOUT_MS = 300000; // 5 分钟

/**
 * 调用下载接口：POST /tools/download，Body 为 url 数组，返回文件流（Blob）。
 * 1 个 url 时返回原文件，2 个及以上返回 ZIP。
 * @param urls 选中的图层图片或视频 url，最多 6 个
 * @returns 响应 Blob（原文件或 ZIP）
 */
export async function toolsDownloadByUrls(urls: string[]): Promise<Blob> {
  if (urls.length === 0) {
    throw new Error('No URLs to download');
  }
  const headers = getAuthHeaders();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(DOWNLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        ...(headers as Record<string, string>),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(urls),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Download timeout, please try again with fewer items');
      }
      throw new Error(err.message || 'Network error');
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (AUTH_ERROR_STATUSES.includes(response.status) || response.status === 403) {
    clearTokenAndRedirectToLogin();
    throw new Error('Token expired or invalid, please login again');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Download failed: ${response.status} ${text || response.statusText}`);
  }

  // 使用流式读取构建 Blob，避免大文件时 response.blob() 触发 net::ERR_FAILED 200
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }
  const chunks: Uint8Array[] = [];
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const blob = new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') || 'application/octet-stream' });
  if (totalLength === 0 && blob.size === 0) {
    throw new Error('Download returned empty file');
  }
  return blob;
}
