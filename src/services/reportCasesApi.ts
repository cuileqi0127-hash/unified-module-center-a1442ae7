import { apiGet, type ApiResponse, type PaginatedResponse } from './apiClient';

const BASE_PATH = '/tools/report/cases';

/** 与接口文档一致的 reportType 筛选值 */
export type ReportCaseReportTypeFilter =
  | 'brand_health'
  | 'tiktok_insight'
  | 'MARKET_INSIGHT'
  | 'STRATEGY_CASE';

export interface ReportCaseListItem {
  id: number | string;
  title: string;
  intro: string;
  reportType: string;
  publishTime: string;
  /** 列表若返回封面则使用，否则前端占位 */
  coverUrl?: string | null;
}

export interface ReportCaseDetail {
  id: number | string;
  title: string;
  intro: string;
  reportType: string;
  reportUrl: string;
  publishTime: string;
}

function extractPaginatedList<T>(raw: unknown): PaginatedResponse<T> {
  if (raw == null || typeof raw !== 'object') return { list: [], total: 0 };
  const r = raw as Record<string, unknown>;
  const totalNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v)) || 0;
  if (Array.isArray(r.list) && (typeof r.total === 'number' || typeof r.total === 'string')) {
    return { list: r.list as T[], total: totalNum(r.total) };
  }
  const mid = r.data;
  if (mid != null && typeof mid === 'object') {
    const d = mid as Record<string, unknown>;
    if (Array.isArray(d.list) && (typeof d.total === 'number' || typeof d.total === 'string')) {
      return { list: d.list as T[], total: totalNum(d.total) };
    }
    const inner = d.data;
    if (inner != null && typeof inner === 'object') {
      const dd = inner as Record<string, unknown>;
      if (Array.isArray(dd.list) && (typeof dd.total === 'number' || typeof dd.total === 'string')) {
        return { list: dd.list as T[], total: totalNum(dd.total) };
      }
    }
  }
  return { list: [], total: 0 };
}

function extractCaseDetail(raw: unknown): ReportCaseDetail | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.reportUrl === 'string' && r.id != null) {
    return r as unknown as ReportCaseDetail;
  }
  const mid = r.data;
  if (mid != null && typeof mid === 'object') {
    const d = mid as Record<string, unknown>;
    if (typeof d.reportUrl === 'string' && d.id != null) {
      return d as unknown as ReportCaseDetail;
    }
    const inner = d.data;
    if (inner != null && typeof inner === 'object') {
      const dd = inner as Record<string, unknown>;
      if (typeof dd.reportUrl === 'string' && dd.id != null) {
        return dd as unknown as ReportCaseDetail;
      }
    }
  }
  return null;
}

/** GET /tools/report/cases/page — 使用项目统一 /api + Bearer。列表场景：市场洞察传 MARKET_INSIGHT，策划方案传 STRATEGY_CASE。 */
export async function getReportCasesPage(params: {
  title?: string;
  reportType?: ReportCaseReportTypeFilter;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<ReportCaseListItem>> {
  const qs = new URLSearchParams();
  if (params.title != null && params.title.trim() !== '') qs.set('title', params.title.trim());
  if (params.reportType != null) qs.set('reportType', params.reportType);
  qs.set('page', String(params.page ?? 1));
  qs.set('size', String(params.size ?? 16));
  const res: ApiResponse<unknown> = await apiGet<unknown>(`${BASE_PATH}/page?${qs.toString()}`);
  if (!res.success) {
    throw new Error(res.msg || 'Request failed');
  }
  return extractPaginatedList<ReportCaseListItem>(res.data);
}

/** GET /tools/report/cases/{id} — 使用项目统一 /api + Bearer */
export async function getReportCaseDetail(id: string | number): Promise<ReportCaseDetail> {
  const res: ApiResponse<unknown> = await apiGet<unknown>(`${BASE_PATH}/${encodeURIComponent(String(id))}`);
  if (!res.success) {
    throw new Error(res.msg || 'Request failed');
  }
  const detail = extractCaseDetail(res.data);
  if (!detail?.reportUrl) {
    throw new Error('Invalid case detail');
  }
  return detail;
}
