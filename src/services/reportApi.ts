/**
 * 报告相关 API（品牌健康度、TikTok 洞察等）
 * 与 /tools/report/brand-health 使用相同 base、token
 */

import { apiPost, apiGet, type ApiResponse } from './apiClient';

// ---------- 品牌健康度 ----------
export interface BrandHealthTaskRequest {
  brandName: string;
  category?: string;
  competitors?: string[];
  region: string;
}

// ---------- TikTok 洞察 ----------
export interface TiktokInsightTaskRequest {
  category: string;
  sellingPoints: string[];
}

// ---------- 通用响应 ----------
export interface ReportTaskResponse {
  taskId: string | number;
  status: string;
}

export interface ReportTaskStatusResponse {
  taskId: string | number;
  status: string;
  reportUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ReportListItem {
  id: string | number;
  reportType: string;
  status: string;
  externalTaskId?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  createTime: string;
  completedTime?: string | null;
}

export interface ReportListData {
  list: ReportListItem[];
  total: number;
}

/** 获取报告任务列表 GET /tools/report */
export async function getReportList(params: {
  reportType?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}): Promise<ApiResponse<ReportListData>> {
  const search = new URLSearchParams();
  if (params.reportType != null) search.set('reportType', params.reportType);
  if (params.status != null) search.set('status', params.status);
  if (params.page != null) search.set('page', String(params.page));
  if (params.size != null) search.set('size', String(params.size));
  if (params.sort != null) search.set('sort', params.sort);
  const query = search.toString();
  return apiGet<ReportListData>(`/tools/report${query ? `?${query}` : ''}`);
}

/** 提交品牌健康度报告任务 POST /tools/report/brand-health */
export async function submitBrandHealthTask(
  body: BrandHealthTaskRequest
): Promise<ApiResponse<ReportTaskResponse>> {
  return apiPost<ReportTaskResponse>('/tools/report/brand-health', body);
}

/** 提交 TikTok 洞察报告任务 POST /tools/report/tiktok-insight */
export async function submitTiktokInsightTask(
  body: TiktokInsightTaskRequest
): Promise<ApiResponse<ReportTaskResponse>> {
  return apiPost<ReportTaskResponse>('/tools/report/tiktok-insight', body);
}

/** 查询任务状态与结果 GET /tools/report/{taskId} */
export async function getReportTaskStatus(
  taskId: string
): Promise<ApiResponse<ReportTaskStatusResponse>> {
  return apiGet<ReportTaskStatusResponse>(`/tools/report/${encodeURIComponent(taskId)}`);
}

/** 轮询直到报告就绪 */
export async function pollReportUntilReady(
  taskId: string,
  onProgress?: (data: ReportTaskStatusResponse) => void,
  interval: number = 2500,
  maxAttempts: number = 120
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await getReportTaskStatus(taskId);
    const data = res?.data;
    if (!data) throw new Error(res?.msg ?? 'Failed to get task status');
    if (onProgress) onProgress(data);
    if (data.reportUrl) return data.reportUrl;
    if (data.errorCode || data.errorMessage) {
      throw new Error(data.errorMessage || data.errorCode || 'Task failed');
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Report generation timeout');
}
