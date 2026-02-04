/**
 * File Upload API
 * 文件上传服务 - 处理文件上传到OSS
 */

import i18n from '@/i18n';
import { getCachedToken } from './oauthApi';

// 接口响应类型
export interface UploadResponse {
  code: number | string;
  msg: string;
  success: boolean;
  timestamp: number;
  data: {
    ossKey: string;
    url: string;
  };
}

/**
 * 上传文件到OSS（单独封装的接口，不使用 authenticatedFetch）
 * @param file 要上传的文件
 * @param onProgress 上传进度回调函数
 * @returns 上传结果，包含ossKey和url
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ ossKey: string; url: string }> {
  try {
    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);

    // 创建上传控制器，用于取消上传
    const controller = new AbortController();

    // 监听上传进度
    let reader: FileReader | null = null;
    if (onProgress) {
      reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    // 获取token
    const token = getCachedToken();

    // 构建请求头
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // 注意：不要设置Content-Type头，让浏览器自动设置正确的multipart/form-data头

    // 直接使用fetch API调用上传接口
    const response = await fetch('/common/oss/upload?type=1', {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 解析响应
    const data: UploadResponse = await response.json();

    // 检查响应状态
    if (!data.success || (typeof data.code === 'number' && data.code !== 0) || (typeof data.code === 'string' && data.code !== '0')) {
      throw new Error(data.msg || i18n.t('errors.uploadFailed'));
    }

    // 返回ossKey和url
    return data.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * 验证文件格式
 * @param file 要验证的文件
 * @param allowedTypes 允许的文件类型数组
 * @returns 是否验证通过
 */
export function validateFileFormat(
  file: File,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some(type => file.type === type || file.name.endsWith(`.${type}`));
}

/**
 * 验证文件大小
 * @param file 要验证的文件
 * @param maxSize 最大文件大小（字节）
 * @returns 是否验证通过
 */
export function validateFileSize(
  file: File,
  maxSize: number
): boolean {
  return file.size <= maxSize;
}
