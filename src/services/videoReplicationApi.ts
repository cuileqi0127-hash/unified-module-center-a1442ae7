/**
 * Video Replica API Service
 * 复刻视频 API 服务（与项目其他接口保持一致：/api + Bearer token）
 *
 * 对应文档：tools-video-replica-frontend-api.md
 */

import { apiGet, apiPost, type ApiResponse, type PaginatedResponse } from './apiClient';

export type VideoReplicaTaskStatus =
  | 'queued'
  | 'processing'
  | 'awaiting_confirmation'
  | 'completed'
  | 'failed';

export interface VideoReplicaEstimateRequest {
  sellingPoints: string[];
  productImageUrls: string[];
  benchmarkVideoUrl: string;
  memoryEntryIds?: number[];
}

export interface VideoReplicaEstimateData {
  estimatedCredits: number;
}

export interface VideoReplicaCreateData {
  taskId: number | string;
  status: VideoReplicaTaskStatus;
}

export interface VideoReplicaTaskListItem {
  taskId: number | string;
  status: VideoReplicaTaskStatus;
  sellingPoints: string[];
}

export type VideoReplicaTaskPageData = PaginatedResponse<VideoReplicaTaskListItem>;

export interface VideoReplicaTaskDetail {
  taskId: number | string;
  status: VideoReplicaTaskStatus;
  pendingPrompt: string | null;
  confirmedPrompt: string | null;
  videoUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface VideoReplicaConfirmPromptRequest {
  prompt: string;
}

const BASE_PATH = '/tools/video-replica';

export async function estimateVideoReplicaCredits(
  request: VideoReplicaEstimateRequest
): Promise<ApiResponse<VideoReplicaEstimateData>> {
  return await apiPost<VideoReplicaEstimateData>(`${BASE_PATH}/tasks/estimate`, request);
}

export async function createVideoReplicaTask(
  request: VideoReplicaEstimateRequest
): Promise<ApiResponse<VideoReplicaCreateData>> {
  return await apiPost<VideoReplicaCreateData>(`${BASE_PATH}/tasks`, request);
}

export async function getVideoReplicaTasksPage(params: {
  page: number;
  size: number;
  status?: VideoReplicaTaskStatus;
}): Promise<ApiResponse<VideoReplicaTaskPageData>> {
  const qs = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
    ...(params.status ? { status: params.status } : {}),
  });
  return await apiGet<VideoReplicaTaskPageData>(`${BASE_PATH}/tasks/page?${qs.toString()}`);
}

export async function getVideoReplicaTaskDetail(
  taskId: number | string
): Promise<ApiResponse<VideoReplicaTaskDetail>> {
  return await apiGet<VideoReplicaTaskDetail>(`${BASE_PATH}/tasks/${String(taskId)}`);
}

export async function confirmVideoReplicaPrompt(
  taskId: number | string,
  request: VideoReplicaConfirmPromptRequest
): Promise<ApiResponse<VideoReplicaCreateData>> {
  return await apiPost<VideoReplicaCreateData>(`${BASE_PATH}/tasks/${String(taskId)}/confirm`, request);
}

export async function pollVideoReplicaTaskUntilTerminal(
  taskId: number | string,
  onProgress?: (detail: VideoReplicaTaskDetail) => void,
  intervalMs: number = 2000,
  maxAttempts: number = 300
): Promise<VideoReplicaTaskDetail> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const res = await getVideoReplicaTaskDetail(taskId);
    const detail = res.data;
    onProgress?.(detail);

    if (detail.status === 'completed' || detail.status === 'failed' || detail.status === 'awaiting_confirmation') {
      return detail;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
    attempts++;
  }
  throw new Error('Task polling timeout');
}
