import { apiGet, apiPost, type ApiResponse, type PaginatedResponse } from './apiClient';

export type TikTokSolutionTaskStatus =
  | 'queued'
  | 'processing'
  | 'awaiting_selection'
  | 'awaiting_confirmation'
  | 'completed'
  | 'closed_timeout'
  | 'failed';

export interface TikTokSolutionTaskRequest {
  sellingPoints: string[];
  productImageUrls: string[];
  searchKeyword: string;
  candidateCount?: number;
  aspectRatio?: string; // e.g. 9:16
  duration?: number; // seconds
  lang?: string; // zh/en
  memoryEntryIds?: number[];
}

export interface TikTokSolutionEstimateData {
  featureCode: string;
  featureName: string;
  estimatedAmountRmb: number;
  estimatedCredits: number;
}

export interface TikTokSolutionTaskRef {
  taskId: string | number;
  status: TikTokSolutionTaskStatus;
}

export interface TikTokSolutionTaskListItem {
  taskId: string | number;
  status: TikTokSolutionTaskStatus;
  category: string | null;
  sellingPoints: string[];
  errorCode: string | null;
  errorMessage: string | null;
  createTime: string;
  completedTime: string | null;
}

export type TikTokSolutionTaskPageData = PaginatedResponse<TikTokSolutionTaskListItem>;

export interface TikTokSolutionCandidateVideo {
  candidateKey: string;
  rankNo: number;
  sourceVideoUrl: string;
  ossKey: string;
  url: string;
  // dynamic extra fields from provider
  [key: string]: unknown;
}

export interface TikTokSolutionTaskDetail {
  taskId: string | number;
  status: TikTokSolutionTaskStatus;
  candidateVideos: TikTokSolutionCandidateVideo[];
  selectedVideoUrl: string | null;
  pendingPrompt: string | null;
  confirmedPrompt: string | null;
  videoUrl: string | null;
  agents: Array<Record<string, unknown>>;
  agentVersion: number;
  latestEventSeq: number;
  closedReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

const BASE_PATH = '/tools/tiktok-solution';

export async function estimateTikTokSolutionCredits(
  request: TikTokSolutionTaskRequest
): Promise<ApiResponse<TikTokSolutionEstimateData>> {
  return await apiPost<TikTokSolutionEstimateData>(`${BASE_PATH}/tasks/estimate`, request);
}

export async function createTikTokSolutionTask(
  request: TikTokSolutionTaskRequest
): Promise<ApiResponse<TikTokSolutionTaskRef>> {
  return await apiPost<TikTokSolutionTaskRef>(`${BASE_PATH}/tasks`, request);
}

export async function getTikTokSolutionTasksPage(params: {
  page: number;
  size: number;
  status?: TikTokSolutionTaskStatus;
}): Promise<ApiResponse<TikTokSolutionTaskPageData>> {
  const qs = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
    ...(params.status ? { status: params.status } : {}),
  });
  return await apiGet<TikTokSolutionTaskPageData>(`${BASE_PATH}/tasks/page?${qs.toString()}`);
}

export async function getTikTokSolutionTaskDetail(
  taskId: string | number
): Promise<ApiResponse<TikTokSolutionTaskDetail>> {
  return await apiGet<TikTokSolutionTaskDetail>(`${BASE_PATH}/tasks/${String(taskId)}`);
}

export async function selectTikTokSolutionCandidateVideo(
  taskId: string | number,
  payload: { url: string }
): Promise<ApiResponse<TikTokSolutionTaskRef>> {
  return await apiPost<TikTokSolutionTaskRef>(`${BASE_PATH}/tasks/${String(taskId)}/select`, payload);
}

export async function confirmTikTokSolutionPrompt(
  taskId: string | number,
  payload: { prompt: string }
): Promise<ApiResponse<TikTokSolutionTaskRef>> {
  return await apiPost<TikTokSolutionTaskRef>(`${BASE_PATH}/tasks/${String(taskId)}/confirm`, payload);
}

export async function pollTikTokSolutionUntilBreak(
  taskId: string | number,
  onUpdate?: (detail: TikTokSolutionTaskDetail) => void,
  intervalMs: number = 3000,
  maxAttempts: number = 400
): Promise<TikTokSolutionTaskDetail> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const res = await getTikTokSolutionTaskDetail(taskId);
    const detail = res.data;
    onUpdate?.(detail);

    if (
      detail.status === 'awaiting_selection' ||
      detail.status === 'awaiting_confirmation' ||
      detail.status === 'completed' ||
      detail.status === 'failed' ||
      detail.status === 'closed_timeout'
    ) {
      return detail;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
    attempts++;
  }
  throw new Error('Task polling timeout');
}

