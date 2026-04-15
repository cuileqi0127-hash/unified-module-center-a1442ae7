import { apiGet, type ApiResponse, type PaginatedResponse } from './apiClient';

/**
 * AI Inspiration（灵感库）— 视频素材广场接口
 * - base: /api（由 apiClient 自动拼接）
 * - auth: Bearer（与项目其他接口一致）
 */

export interface MaterialSquareItem {
  id: number | string;
  createUserString?: string | null;
  createTime?: string;
  title: string;
  mediaType?: string;
  category?: string;
  tags?: string[];
  sourceUrl: string;
  previewUrl?: string | null;
  publisher?: string;
  publishTime?: string;
  viewCount?: number;
  likeCount?: number;
  collectCount?: number;
  commentCount?: number;
  shareCount?: number;
}

export interface MaterialSquareDetail extends MaterialSquareItem {
  purpose?: string | null;
  targetAudience?: string | null;
  aiTech?: string | null;
  status?: number | string | null;
}

export async function getInspirationVideosPage(params: {
  page?: number;
  size?: number;
  title?: string;
  category?: string;
  mediaType?: string;
  status?: string;
  sort?: string;
  signal?: AbortSignal;
}): Promise<PaginatedResponse<MaterialSquareItem>> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  qs.set('size', String(params.size ?? 10));
  if (params.title != null && params.title.trim() !== '') qs.set('title', params.title.trim());
  if (params.category != null && params.category !== '' && params.category !== 'all') qs.set('category', params.category);
  if (params.mediaType != null && params.mediaType !== '') qs.set('mediaType', params.mediaType);
  if (params.status != null && params.status !== '') qs.set('status', params.status);
  if (params.sort != null && params.sort !== '') qs.set('sort', params.sort);

  const res: ApiResponse<unknown> = await apiGet<unknown>(
    `/api/app/material-square/page?${qs.toString()}`,
    params.signal ? { signal: params.signal } : {}
  );
  if (!res.success) throw new Error(res.msg || 'Request failed');
  const data = res.data as any;
  const list = Array.isArray(data?.list) ? (data.list as MaterialSquareItem[]) : [];
  const totalRaw = data?.total;
  const total = typeof totalRaw === 'number' ? totalRaw : Number(totalRaw) || 0;
  return { list, total };
}

export async function getInspirationVideoDetail(
  id: string | number,
  signal?: AbortSignal
): Promise<MaterialSquareDetail> {
  const res: ApiResponse<unknown> = await apiGet<unknown>(
    `/api/app/material-square/${encodeURIComponent(String(id))}`,
    signal ? { signal } : {}
  );
  if (!res.success) throw new Error(res.msg || 'Request failed');
  const data = res.data as any;
  if (!data || data.id == null || !data.sourceUrl) throw new Error('Invalid detail');
  return data as MaterialSquareDetail;
}

