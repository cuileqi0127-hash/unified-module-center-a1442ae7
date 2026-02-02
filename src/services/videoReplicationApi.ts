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
const VOD_BASE_URL = '/vod';  // 使用相对路径，通过 Nginx 代理到 /vod
const AIGC_BASE_URL = '/aigc';  // 使用相对路径，通过 Nginx 代理到 /aigc

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

// 图片上传响应
export interface MediaUploadResponse {
  fileId: string; // 上传后返回的 fileId
  mediaUrl?: string; // 媒体文件 URL
  coverUrl?: string; // 封面 URL
  [key: string]: any; // 允许其他字段
}

/**
 * 上传媒体文件（图片）到 VOD
 * @param file 图片文件
 * @param region 区域，默认 'ap-guangzhou'
 * @param subAppId 子应用ID，默认 '1320866336'
 */
export async function uploadMediaFile(
  file: File,
  region: string = 'ap-guangzhou',
  subAppId: string = '1320866336'
): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append('region', region);
  formData.append('sub_app_id', subAppId);
  formData.append('media', file);
  formData.append('cover', '');

  const response = await apiPost<MediaUploadResponse>('/upload', formData, {
    baseURL: VOD_BASE_URL,
    useAuth: false, // VOD 上传接口不使用用户认证
  });

  return response.data || response as MediaUploadResponse;
}

// /aigc/create 接口返回格式
export interface AigcCreateResponse {
  Response: {
    TaskId: string;
    RequestId: string;
  };
}

// /aigc/task 接口返回格式
export interface AigcTaskResponse {
  TaskType: string;
  Status: string;
  CreateTime: string;
  BeginProcessTime: string;
  FinishTime: string;
  AigcVideoTask: {
    TaskId: string;
    Status: string; // PROCESSING, SUCCESS, FAILED 等
    ErrCode: number;
    Message: string;
    Progress: number; // 0-100
    Input: {
      ModelName: string;
      ModelVersion: string;
      Prompt: string;
      [key: string]: any;
    };
    Output: {
      FileInfos: Array<{
        FileId?: string;
        Url?: string;
        FileUrl?: string; // 视频文件的完整 URL（完成时使用）
        StorageMode?: string;
        MediaName?: string;
        ExpireTime?: string;
        [key: string]: any;
      }>;
    };
    [key: string]: any;
  } | null;
  [key: string]: any;
}

// 视频生成任务响应（统一格式）
export interface VideoTaskResponse {
  task_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  video_url?: string;
  error_message?: string; // 错误信息（如果有）
  error_code?: number; // 错误码（如果有）
  [key: string]: any; // 允许其他字段
}

/**
 * 创建视频生成任务
 */
export async function createVideoTask(request: {
  prompt: string;
  fileId: string;
}): Promise<VideoTaskResponse> {
  const requestBody: any = {
    model_name: 'OS',
    prompt: request.prompt,
    model_version: '2.0',
    file_id: request.fileId,
  };

  const response = await apiPost<AigcCreateResponse>('/create', requestBody, {
    baseURL: AIGC_BASE_URL,
    useAuth: false, // AIGC 接口不使用用户认证
  });

  // 转换为统一格式
  const taskResponse: VideoTaskResponse = {
    task_id: response.data?.Response?.TaskId || (response as any).Response?.TaskId,
    status: 'queued', // 创建任务时默认为排队状态
  };
  
  return taskResponse;
}

/**
 * 查询任务状态
 */
export async function getTaskStatus(taskId: string): Promise<VideoTaskResponse> {
  const response = await apiPost<AigcTaskResponse>('/task', {
    task_id: taskId,
  }, {
    baseURL: AIGC_BASE_URL,
    useAuth: false, // AIGC 接口不使用用户认证
  });

  // 转换为统一格式
  const aigcTask = response.data?.AigcVideoTask || (response as any).AigcVideoTask;
  const status = aigcTask?.Status || response.data?.Status || (response as any).Status;
  
  let unifiedStatus: 'queued' | 'processing' | 'completed' | 'failed' = 'queued';
  const statusUpper = status?.toUpperCase();
  
  if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED' || statusUpper === 'FINISH') {
    unifiedStatus = 'completed';
  } else if (statusUpper === 'FAILED' || statusUpper === 'ERROR') {
    unifiedStatus = 'failed';
  } else if (statusUpper === 'PROCESSING' || statusUpper === 'RUNNING') {
    unifiedStatus = 'processing';
  }

  const taskResponse: VideoTaskResponse = {
    task_id: taskId,
    status: unifiedStatus,
    progress: aigcTask?.Progress,
    video_url: aigcTask?.Output?.FileInfos?.[0]?.FileUrl || aigcTask?.Output?.FileInfos?.[0]?.Url,
    error_message: aigcTask?.Message || response.data?.Message || (response as any).Message,
    error_code: aigcTask?.ErrCode || response.data?.ErrCode || (response as any).ErrCode,
  };
  
  return taskResponse;
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
    const status = await getTaskStatus(taskId);
    
    if (onProgress) {
      onProgress(status);
    }
    
    if (status.status === 'completed') {
      return status;
    }
    
    if (status.status === 'failed') {
      throw new Error(status.error_message || 'Task failed');
    }
    
    // 等待指定间隔后继续轮询
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }
  
  throw new Error('Task polling timeout');
}
