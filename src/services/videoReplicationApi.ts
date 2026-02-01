/**
 * Video Replication API Service
 * 视频复刻 API 服务
 * 
 * 提供视频复刻相关的接口封装
 */

import { apiPost, type ApiResponse } from './apiClient';

// 使用相对路径，通过 Nginx 代理转发
// 开发环境使用 Vite 代理，生产环境使用 Nginx 代理
const API_ENDPOINT = "/process/upload";
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
    const response = await apiPost<any>(API_ENDPOINT, formData, {
      headers: {
        'X-API-Key': API_KEY,
      },
      useAuth: false, // 视频复刻接口不使用用户认证
    });
    
    console.log('Upload response:', response);
    return response.data || response;
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
    const response = await apiPost<any>(API_ENDPOINT, formData, {
      headers: {
        'X-API-Key': API_KEY,
      },
      useAuth: false, // 视频复刻接口不使用用户认证
    });
    
    console.log('Upload response:', response);
    return response.data || response;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}
