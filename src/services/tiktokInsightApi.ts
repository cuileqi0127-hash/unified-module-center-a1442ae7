/**
 * TikTok 洞察 API
 * - 分页查询任务 GET /tools/tiktok-insight/jobs
 * - 提交洞察任务 POST /tools/tiktok-insight/jobs
 * - 查询任务状态 GET /tools/tiktok-insight/jobs/{jobId}
 * - 查询任务结果 GET /tools/tiktok-insight/jobs/{jobId}/result
 */

import { apiPost, apiGet, type ApiResponse } from './apiClient';
import i18n from '@/i18n';

export interface TiktokInsightJobPageItem {
  id: string | number;
  keyword?: string;
  status?: string;
  externalJobId?: string;
  errorCode?: string;
  errorMessage?: string;
  createTime?: string;
  completedTime?: string;
}

export interface TiktokInsightJobListData {
  list: TiktokInsightJobPageItem[];
  total: number;
}

export interface TiktokInsightJobCreateRequest {
  keyword: string;
  sellingPoints: string[];
}

export interface TiktokInsightJobCreateData {
  jobId: string | number;
  status: string;
}

export interface TiktokInsightJobStatusData {
  jobId: string | number;
  keyword?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  externalJobId?: string;
  errorCode?: string;
  errorMessage?: string;
  startedTime?: string;
  completedTime?: string;
}

export interface TiktokInsightVideoItem {
  rank?: number;
  videoId?: string | number;
  url?: string;
  title?: string;
  hashtags?: string;
  strategy?: string;
  views?: number;
  likes?: number;
  sales?: number;
  conversionRate?: number;
  sellingPointMatch?: number;
  duration?: string;
  ossKey?: string;
  downloadUrl?: string;
}

export interface TiktokInsightJobResultData {
  jobId?: string | number;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  meta?: Record<string, unknown>;
  videos?: TiktokInsightVideoItem[];
}

/** 分页查询任务 GET /tools/tiktok-insight/jobs */
export async function getTiktokInsightJobList(params: {
  keyword?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
} = {}): Promise<ApiResponse<TiktokInsightJobListData>> {
  const search = new URLSearchParams();
  if (params.keyword != null && params.keyword !== '') search.set('keyword', params.keyword);
  if (params.status != null && params.status !== '') search.set('status', params.status);
  if (params.page != null) search.set('page', String(params.page));
  if (params.size != null) search.set('size', String(params.size));
  if (params.sort != null) search.set('sort', params.sort);
  const query = search.toString();
  return apiGet<TiktokInsightJobListData>(`/tools/tiktok-insight/jobs${query ? `?${query}` : ''}`);
}

/** 提交洞察任务 POST /tools/tiktok-insight/jobs */
export async function submitTiktokInsightJob(
  body: TiktokInsightJobCreateRequest
): Promise<ApiResponse<TiktokInsightJobCreateData>> {
  return apiPost<TiktokInsightJobCreateData>('/tools/tiktok-insight/jobs', body);
}

/** 查询任务状态 GET /tools/tiktok-insight/jobs/{jobId} */
export async function getTiktokInsightJobStatus(
  jobId: string | number
): Promise<ApiResponse<TiktokInsightJobStatusData>> {
  const id = String(jobId);
  return apiGet<TiktokInsightJobStatusData>(`/tools/tiktok-insight/jobs/${encodeURIComponent(id)}`);
}

/** 查询任务结果 GET /tools/tiktok-insight/jobs/{jobId}/result */
export async function getTiktokInsightJobResult(
  jobId: string | number
): Promise<ApiResponse<TiktokInsightJobResultData>> {
  const id = String(jobId);
  return apiGet<TiktokInsightJobResultData>(`/tools/tiktok-insight/jobs/${encodeURIComponent(id)}/result`);
}

const DEFAULT_POLL_INTERVAL = 2500;
const DEFAULT_MAX_ATTEMPTS = 120;

/** 轮询任务状态直到 completed 或 failed，返回最终状态数据 */
export async function pollTiktokInsightJobStatus(
  jobId: string | number,
  onProgress?: (data: TiktokInsightJobStatusData) => void,
  interval: number = DEFAULT_POLL_INTERVAL,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS
): Promise<TiktokInsightJobStatusData> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await getTiktokInsightJobStatus(jobId);
    const data = res?.data;
    if (!data) throw new Error(res?.msg ?? i18n.t('errors.taskStatusFailed'));
    if (onProgress) onProgress(data);
    if (data.status === 'completed' || data.status === 'failed') return data;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(i18n.t('errors.taskTimeoutRetry'));
}
