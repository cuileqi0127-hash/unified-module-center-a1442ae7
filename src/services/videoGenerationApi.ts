/**
 * Video Generation API Service
 * 视频生成 API 服务
 * 
 * 提供视频生成接口封装，包括任务创建和状态轮询
 */

import { apiPost, type ApiResponse } from './apiClient';

// 根据环境变量判断使用代理还是直接访问
// 注意：vod/upload 使用端口 8000，aigc 接口使用端口 8001
// 生产环境也使用相对路径，通过 Nginx 代理转发
const VOD_BASE_URL = '/vod';  // 使用相对路径，通过 Nginx 代理到 /vod
const AIGC_BASE_URL = '/aigc';  // 使用相对路径，通过 Nginx 代理到 /aigc

// 支持的模型类型（Sora 2 / Google veo 3.1 / 海螺 / 可灵 / 即梦 / Vidu）
export type VideoModel = 'OS' | 'GV' | 'Hailuo' | 'Kling' | 'Jimeng' | 'Vidu';

// 支持的视频时长（秒）
export type VideoSeconds = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '12';

// 支持的视频尺寸（宽高比）
export type VideoSize = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9' | '2:3';

// 支持的分辨率
export type VideoResolution = '720P' | '768P' | '1080P';

/**
 * 将尺寸比例转换为 API 需要的像素格式
 * @param size 尺寸比例 '16:9'、'9:16' 或 '1:1'
 * @returns 像素格式 '1280x720'、'720x1280' 或 '1024x1024'
 */
export function mapSizeToApiFormat(size: VideoSize): string {
  const sizeMap: Record<VideoSize, string> = {
    '16:9': '1280x720',
    '9:16': '720x1280',
    '1:1': '1024x1024',
    '4:3': '1024x768',
    '3:4': '768x1024',
    '21:9': '2560x1080',
    '2:3': '720x1080',
  };
  return sizeMap[size] || '1280x720';
}

/**
 * 确保为 video-tasks 接口的 aspectRatio 枚举（比例格式）
 * 若传入的是分辨率如 1280x720，则转为 16:9；接口只接受 16:9 | 9:16 | 1:1
 */
const RATIO_VALUES: VideoSize[] = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '2:3'];

export function ensureAspectRatioEnum(sizeOrResolution: string): VideoSize {
  const resolutionToRatio: Record<string, VideoSize> = {
    '1280x720': '16:9',
    '720x1280': '9:16',
    '1024x1024': '1:1',
  };
  if (resolutionToRatio[sizeOrResolution]) return resolutionToRatio[sizeOrResolution];
  if (RATIO_VALUES.includes(sizeOrResolution as VideoSize)) return sizeOrResolution as VideoSize;
  return '16:9';
}

// 视频生成请求参数
export interface VideoGenerationRequest {
  model: VideoModel;
  prompt: string;
  seconds?: VideoSeconds;
  fileId?: string; // 上传图片后返回的 fileId
  size?: VideoSize;
  watermark?: boolean; // 水印选项
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

// 图片上传响应
export interface MediaUploadResponse {
  fileId: string; // 上传后返回的 fileId
  mediaUrl?: string; // 媒体文件 URL
  coverUrl?: string; // 封面 URL
  [key: string]: any; // 允许其他字段
}

/**
 * 上传媒体文件（图片）
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

/**
 * 创建视频生成任务
 */
export async function createVideoTask(request: VideoGenerationRequest): Promise<VideoTaskResponse> {
  console.log(request, 'request');
  const requestBody: any = {
    model_name: request.model,
    prompt: request.prompt,
    model_version: '2.0',
  };

  if (request.seconds) {
    requestBody.duration = request.seconds;
  }

  if (request.fileId) {
    requestBody.file_id = request.fileId;
  }

  if (request.size) {
    requestBody.aspect_ratio = mapSizeToApiFormat(request.size);
  }

  // if (request.watermark !== undefined) {
  //   requestBody.watermark = request.watermark;
  // }

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
 * 将 API 状态映射到统一状态格式
 */
function mapStatusToUnifiedStatus(apiStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
  const statusUpper = apiStatus.toUpperCase();
  if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED' || statusUpper === 'FINISH') {
    return 'completed';
  }
  if (statusUpper === 'FAILED' || statusUpper === 'ERROR') {
    return 'failed';
  }
  if (statusUpper === 'PROCESSING' || statusUpper === 'RUNNING') {
    return 'processing';
  }
  // 默认返回排队状态
  return 'queued';
}

/**
 * 轮询任务状态
 */
export async function pollTaskStatus(taskId: string): Promise<VideoTaskResponse> {
  const response = await apiPost<AigcTaskResponse>('/task', {
    task_id: taskId,
  }, {
    baseURL: AIGC_BASE_URL,
    useAuth: false, // AIGC 接口不使用用户认证
  });

  // 解析返回数据
  const data = response.data || response as AigcTaskResponse;
  
  // 提取 AigcVideoTask 信息
  const aigcTask = data.AigcVideoTask;
  if (!aigcTask) {
    // 如果 AigcVideoTask 为 null，可能任务还未开始或已过期
    // 根据顶层 Status 判断
    const topLevelStatus = mapStatusToUnifiedStatus(data.Status);
    return {
      task_id: taskId,
      status: topLevelStatus,
      progress: 0,
    };
  }
  
  // 检查错误码
  if (aigcTask.ErrCode !== 0 && aigcTask.ErrCode !== undefined) {
    const errorMessage = aigcTask.Message || `Task failed with error code: ${aigcTask.ErrCode}`;
    throw new Error(errorMessage);
  }
  
  // 获取视频 URL（从 Output.FileInfos 中提取第一个文件的 URL）
  // 当进度为 100% 时，优先使用 FileUrl（完成时的视频地址）
  let videoUrl: string | undefined;
  if (aigcTask.Output?.FileInfos && aigcTask.Output.FileInfos.length > 0) {
    const firstFile = aigcTask.Output.FileInfos[0];
    // 优先级：FileUrl > Url > FileId
    // FileUrl 是任务完成时的视频文件完整 URL
    videoUrl = firstFile.FileUrl || firstFile.Url || (firstFile.FileId ? `file://${firstFile.FileId}` : undefined);
  }
  
  // 转换为统一格式
  const taskResponse: VideoTaskResponse = {
    task_id: aigcTask.TaskId || taskId,
    status: mapStatusToUnifiedStatus(aigcTask.Status),
    progress: aigcTask.Progress ?? 0, // 如果 Progress 为 undefined，默认为 0
    video_url: videoUrl,
    // 保存原始错误信息（如果有）
    error_message: aigcTask.Message,
    error_code: aigcTask.ErrCode,
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
  TaskId: string,
  onProgress?: (status: VideoTaskResponse) => void,
  interval: number = 2000,
  maxAttempts: number = 300
): Promise<VideoTaskResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const status = await pollTaskStatus(TaskId);
    
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
