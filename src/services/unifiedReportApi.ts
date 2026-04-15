import { apiGet, apiPost, type ApiResponse } from './apiClient';

export type UnifiedReportType = 'MARKET_INSIGHT' | 'STRATEGY_CASE';
export type UnifiedReportStatus = 'queued' | 'processing' | 'completed' | 'failed' | (string & {});

export interface UnifiedReportTaskRequest {
  reportType: UnifiedReportType;
  reportInput: {
    scenarioInput: Record<string, unknown>;
  };
  memoryEntryIds?: string[];
}

export interface UnifiedEstimateResp {
  estimatedAmountRmb: string | number;
  estimatedCredits: number;
}

export interface UnifiedCreateResp {
  taskId: string | number;
  status: UnifiedReportStatus;
}

export interface UnifiedReportListItem {
  taskId: string | number;
  reportType: string;
  status: UnifiedReportStatus;
  title: string;
  subtitle: string | null;
  tags: string[];
  createTime: string;
  completedTime: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface UnifiedReportListData {
  list: UnifiedReportListItem[];
  total: number;
}

export interface UnifiedReportDetailData {
  taskId: string | number;
  status: UnifiedReportStatus;
  reportType: string;
  reportUrl: string | null;
  requestSnapshot?: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
}

/** 统一预估积分 POST /tools/report/tasks/estimate */
export async function estimateUnifiedReportTask(
  body: UnifiedReportTaskRequest
): Promise<ApiResponse<UnifiedEstimateResp> & { bizCode?: string }> {
  // 注意：失败时也可能返回 bizCode（如积分不足），前端可继续展示 estimatedCredits（若有）
  return apiPost<UnifiedEstimateResp>('/tools/report/tasks/estimate', body) as any;
}

/** 统一发起任务 POST /tools/report/tasks */
export async function createUnifiedReportTask(
  body: UnifiedReportTaskRequest
): Promise<ApiResponse<UnifiedCreateResp> & { bizCode?: string }> {
  return apiPost<UnifiedCreateResp>('/tools/report/tasks', body) as any;
}

/** 查询报告列表 GET /tools/report（统一新报告 + 兼容旧 reportType） */
export async function getUnifiedReportList(params: {
  reportType?: string;
  status?: string;
  page?: number;
  size?: number;
} = {}): Promise<ApiResponse<UnifiedReportListData>> {
  const search = new URLSearchParams();
  if (params.reportType != null && params.reportType !== '') search.set('reportType', params.reportType);
  if (params.status != null && params.status !== '') search.set('status', params.status);
  if (params.page != null) search.set('page', String(params.page));
  if (params.size != null) search.set('size', String(params.size));
  const query = search.toString();
  return apiGet<UnifiedReportListData>(`/tools/report${query ? `?${query}` : ''}`);
}

/** 查询任务详情 GET /tools/report/{taskId} */
export async function getUnifiedReportDetail(taskId: string): Promise<ApiResponse<UnifiedReportDetailData>> {
  return apiGet<UnifiedReportDetailData>(`/tools/report/${encodeURIComponent(taskId)}`);
}

