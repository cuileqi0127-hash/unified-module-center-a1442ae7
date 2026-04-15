/**
 * 记忆库 API（与 report / billing 等一致：/api base + 公共 token）
 * GET / POST /tools/memory/entries — 分页查询 / 创建记忆条目
 */

import { apiGet, apiPost, type ApiResponse } from './apiClient';

export interface ToolsMemoryEntryPageResp {
  id: string | number;
  title?: string;
  contentPreview?: string;
  /** 接口返回的正文 UTF-8 字节长度（若有则优先使用） */
  contentLength?: number;
  createTime?: string;
  updateTime?: string;
}

export interface MemoryEntriesPageData {
  list: ToolsMemoryEntryPageResp[];
  total: number;
}

function extractPagePayload(data: unknown): { list: ToolsMemoryEntryPageResp[]; total: number } | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.list)) {
    return { list: d.list as ToolsMemoryEntryPageResp[], total: Number(d.total) || 0 };
  }
  const inner = d.data;
  if (inner && typeof inner === 'object') {
    const i = inner as Record<string, unknown>;
    if (Array.isArray(i.list)) {
      return { list: i.list as ToolsMemoryEntryPageResp[], total: Number(i.total) || 0 };
    }
  }
  return null;
}

/** 分页查询记忆条目 GET /tools/memory/entries */
export async function getMemoryEntriesPage(params: {
  keyword?: string;
  page?: number;
  size?: number;
  sort?: string;
} = {}): Promise<ApiResponse<MemoryEntriesPageData>> {
  const search = new URLSearchParams();
  if (params.keyword != null && params.keyword !== '') search.set('keyword', params.keyword);
  if (params.page != null) search.set('page', String(params.page));
  if (params.size != null) search.set('size', String(params.size));
  if (params.sort != null && params.sort !== '') search.set('sort', params.sort);
  const query = search.toString();
  const res = await apiGet<unknown>(`/tools/memory/entries${query ? `?${query}` : ''}`);
  const page = extractPagePayload(res.data);
  const normalized: MemoryEntriesPageData = page ?? { list: [], total: 0 };
  return { ...res, data: normalized };
}

export interface CreateMemoryEntryRequest {
  title: string;
  contentMd: string;
}

export interface MemoryEntryCreateData {
  entryId: string | number;
}

function extractCreateResult(data: unknown): MemoryEntryCreateData | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const pick = (o: Record<string, unknown>): MemoryEntryCreateData | null =>
    o.entryId != null && o.entryId !== '' ? { entryId: o.entryId as string | number } : null;

  const a = pick(d);
  if (a) return a;
  const inner = d.data;
  if (inner && typeof inner === 'object') {
    const i = inner as Record<string, unknown>;
    const b = pick(i);
    if (b) return b;
    const inner2 = i.data;
    if (inner2 && typeof inner2 === 'object') {
      return pick(inner2 as Record<string, unknown>);
    }
  }
  return null;
}

/** 创建记忆条目 POST /tools/memory/entries */
export async function createMemoryEntry(
  body: CreateMemoryEntryRequest
): Promise<ApiResponse<MemoryEntryCreateData>> {
  const res = await apiPost<unknown>('/tools/memory/entries', body);
  const parsed = extractCreateResult(res.data);
  return {
    ...res,
    data: parsed ?? { entryId: '' },
  };
}
