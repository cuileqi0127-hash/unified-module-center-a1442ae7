/**
 * Video Generation API Service
 * 视频生成 API 服务
 * 
 * 提供视频生成接口封装，包括任务创建和状态轮询
 */

import { handleApiResponse } from './apiInterceptor';

const API_BASE_URL = 'https://api.tu-zi.com/v1';
const API_KEY = 'sk-5ZmMmOyDZ8uyPjCHe8yFlrhwQwYUpGb8M0wrTOdonYe8GpMr';

// 支持的模型类型
export type VideoModel = 'sora-2' | 'sora-2-pro' | 'veo3.1' | 'veo3.1-pro' | 'veo3.1-4k' | 'veo3.1-pro-4k';

// 支持的视频时长
export type VideoSeconds = '4' | '8' | '10' | '12' | '15' | '25';

// 支持的视频尺寸
export type VideoSize = '1280x720' | '720x1280' | '1024x1792' | '1792x1024';

// 视频生成请求参数
export interface VideoGenerationRequest {
  model: VideoModel;
  prompt: string;
  seconds?: VideoSeconds;
  input_reference?: File | string | string[]; // 图片文件、URL或URL数组
  size?: VideoSize;
  watermark?: boolean; // 水印选项
}

// 视频生成任务响应
export interface VideoTaskResponse {
  id: string;
  object: 'video';
  model: VideoModel;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: number;
  seconds?: string;
  video_url?: string;
  size?: string;
}

/**
 * 创建视频生成任务
 */
export async function createVideoTask(request: VideoGenerationRequest): Promise<VideoTaskResponse> {
  const formData = new FormData();
  formData.append('model', request.model);
  formData.append('prompt', request.prompt);
  
  if (request.seconds) {
    formData.append('seconds', request.seconds);
  }
  
  if (request.input_reference) {
    if (request.input_reference instanceof File) {
      formData.append('input_reference', request.input_reference);
    } else if (Array.isArray(request.input_reference)) {
      // 如果是数组，将每个URL添加到FormData
      request.input_reference.forEach((url, index) => {
        formData.append(`input_reference[${index}]`, url);
      });
    } else {
      // 如果是单个URL字符串
      formData.append('input_reference', request.input_reference);
    }
  }
  
  if (request.size) {
    formData.append('size', request.size);
  }
  
  if (request.watermark !== undefined) {
    formData.append('watermark', request.watermark.toString());
  }

  const response = await fetch(`${API_BASE_URL}/videos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      // 不要设置 Content-Type，让浏览器自动设置 multipart/form-data 边界
    },
    body: formData,
  });

  const handledResponse = await handleApiResponse(response);
  
  if (!handledResponse.ok) {
    const errorText = await handledResponse.text();
    throw new Error(`Video generation failed: ${handledResponse.status} - ${errorText}`);
  }

  const data: VideoTaskResponse = await handledResponse.json();
  return data;
}

/**
 * 轮询任务状态
 */
export async function pollTaskStatus(taskId: string): Promise<VideoTaskResponse> {
  const response = await fetch(`${API_BASE_URL}/videos/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  const handledResponse = await handleApiResponse(response);
  
  if (!handledResponse.ok) {
    const errorText = await handledResponse.text();
    throw new Error(`Task status check failed: ${handledResponse.status} - ${errorText}`);
  }

  const data: VideoTaskResponse = await handledResponse.json();
  return data;
}

/**
 * 轮询任务直到完成
 * @param taskId 任务ID
 * @param onProgress 进度回调
 * @param interval 轮询间隔（毫秒），默认2000ms
 * @param maxAttempts 最大尝试次数，默认300次（10分钟）
 */
export async function pollTaskUntilComplete(
  taskId: string,
  onProgress?: (status: VideoTaskResponse) => void,
  interval: number = 2000,
  maxAttempts: number = 300
): Promise<VideoTaskResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const status = await pollTaskStatus(taskId);
    
    if (onProgress) {
      onProgress(status);
    }
    
    if (status.status === 'completed') {
      return status;
    }
    
    if (status.status === 'failed') {
      throw new Error('Video generation failed');
    }
    
    // 等待指定间隔后继续轮询
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }
  
  throw new Error('Task polling timeout');
}
