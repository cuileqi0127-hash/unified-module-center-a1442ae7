/**
 * Video Replication API Service
 * 视频复刻 API 服务
 * 
 * 提供视频复刻相关的接口封装
 */

// 根据环境判断使用代理还是直接访问
const API_URL = import.meta.env.DEV 
  ? "/api/process/upload"  // 开发环境使用代理
  : "http://183.87.33.181:8001/api/process/upload";  // 生产环境直接访问
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    });

    const res = await response.json();
    console.log('Upload response:', res);
    
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    });

    const res = await response.json();
    console.log('Upload response:', res);
    
    if (!response.ok) {
      throw new Error(res.message || `Upload failed with status ${response.status}`);
    }

    return res;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}
