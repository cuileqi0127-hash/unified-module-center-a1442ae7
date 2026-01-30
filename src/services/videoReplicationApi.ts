/**
 * Video Replication API Service
 * 视频复刻 API 服务
 * 
 * 提供视频复刻相关的接口封装
 */

import { handleApiResponse } from './apiInterceptor';

// 使用相对路径，通过 Nginx 代理转发
// 开发环境使用 Vite 代理，生产环境使用 Nginx 代理
const API_URL = "/api/process/upload";
const API_KEY = "F92sG7kP1rX5b1";

/**
 * 上传视频文件
 * @param file 视频文件
 * @returns 上传响应
 */
export async function uploadVideoFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    let response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    });

    // 检查 401 错误
    response = await handleApiResponse(response);

    const res = await response.json();
    console.log('Upload response:', res);
    
    // 检查响应 JSON 中的 code 字段是否为 401
    const code = res?.code;
    const isCode401 = (typeof code === 'number' && code === 401) || 
                     (typeof code === 'string' && code === '401');
    if (isCode401) {
      throw new Error('Token expired or invalid, please login again');
    }
    
    if (!response.ok) {
      throw new Error(res.message || `Upload failed with status ${response.status}`);
    }

    return res;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * 上传图片文件
 * @param file 图片文件
 * @returns 上传响应
 */
export async function uploadImageFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    let response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    });

    // 检查 401 错误
    response = await handleApiResponse(response);

    const res = await response.json();
    console.log('Upload response:', res);
    
    // 检查响应 JSON 中的 code 字段是否为 401
    const code = res?.code;
    const isCode401 = (typeof code === 'number' && code === 401) || 
                     (typeof code === 'string' && code === '401');
    if (isCode401) {
      throw new Error('Token expired or invalid, please login again');
    }
    
    if (!response.ok) {
      throw new Error(res.message || `Upload failed with status ${response.status}`);
    }

    return res;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}
