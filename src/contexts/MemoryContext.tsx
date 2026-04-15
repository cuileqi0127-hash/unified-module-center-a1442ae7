import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useOAuth } from '@/contexts/OAuthContext';
import { getMemoryEntriesPage, type ToolsMemoryEntryPageResp } from '@/services/memoryApi';
import { utf8ByteLength } from '@/lib/utf8ByteLength';

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** 正文 UTF-8 字节长度（列表接口拉取时写入；选择记忆库时累加此项） */
  contentLength: number;
}

interface MemoryContextValue {
  entries: MemoryEntry[];
  addEntry: (entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'contentLength'>) => void;
  updateEntry: (entry: MemoryEntry) => void;
  deleteEntry: (id: string) => void;
  importEntries: (data: MemoryEntry[]) => void;
  /** 重新拉取服务端记忆列表（与登录后首次加载逻辑一致，会保留本地 UUID 条目） */
  refreshMemoryEntries: () => Promise<void>;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const MemoryContext = createContext<MemoryContextValue | null>(null);

function resolveContentLength(item: ToolsMemoryEntryPageResp, content: string): number {
  const n = item.contentLength;
  if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return Math.floor(n);
  return utf8ByteLength(content);
}

function mapPageItemToMemoryEntry(item: ToolsMemoryEntryPageResp): MemoryEntry {
  const id = String(item.id);
  const dateFrom = (s?: string) => {
    if (!s) return '';
    const day = s.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : s;
  };
  const content = item.contentPreview ?? '';
  return {
    id,
    title: item.title ?? '',
    content,
    category: '',
    tags: [],
    createdAt: dateFrom(item.createTime),
    updatedAt: dateFrom(item.updateTime),
    contentLength: resolveContentLength(item, content),
  };
}

/** 纯数字 id 视为服务端条目；本地 addEntry 使用 UUID，刷新后仍可与服务端列表合并 */
function isServerSideMemoryId(id: string): boolean {
  return /^\d+$/.test(id);
}

export function MemoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: oauthLoading } = useOAuth();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const fetchAggregatedServerEntries = useCallback(async (): Promise<MemoryEntry[]> => {
    const pageSize = 100;
    let page = 1;
    const aggregated: MemoryEntry[] = [];
    let total = 0;
    for (;;) {
      const res = await getMemoryEntriesPage({
        page,
        size: pageSize,
        sort: 'createTime,desc',
      });
      if (!res?.success) break;
      const { list, total: t } = res.data;
      total = t;
      for (const item of list) {
        aggregated.push(mapPageItemToMemoryEntry(item));
      }
      if (aggregated.length >= total || list.length < pageSize) break;
      page += 1;
      if (page > 100) break;
    }
    return aggregated;
  }, []);

  const mergeServerWithLocal = useCallback((server: MemoryEntry[], prev: MemoryEntry[]) => {
    const localOnly = prev.filter((e) => !isServerSideMemoryId(e.id));
    return [...server, ...localOnly];
  }, []);

  const refreshMemoryEntries = useCallback(async () => {
    if (!isAuthenticatedRef.current) return;
    try {
      const aggregated = await fetchAggregatedServerEntries();
      setEntries((prev) => mergeServerWithLocal(aggregated, prev));
    } catch {
      setEntries((prev) => prev.filter((e) => !isServerSideMemoryId(e.id)));
    }
  }, [fetchAggregatedServerEntries, mergeServerWithLocal]);

  useEffect(() => {
    if (oauthLoading) return;
    if (!isAuthenticated) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const aggregated = await fetchAggregatedServerEntries();
        if (cancelled) return;
        setEntries((prev) => mergeServerWithLocal(aggregated, prev));
      } catch {
        if (!cancelled) {
          setEntries((prev) => prev.filter((e) => !isServerSideMemoryId(e.id)));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, oauthLoading, fetchAggregatedServerEntries, mergeServerWithLocal]);

  const addEntry = useCallback((entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'contentLength'>) => {
    const now = new Date().toISOString().slice(0, 10);
    setEntries((prev) => [
      ...prev,
      {
        ...entry,
        contentLength: utf8ByteLength(entry.content),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    toast.success('已添加到记忆库');
  }, []);

  const updateEntry = useCallback((entry: MemoryEntry) => {
    const now = new Date().toISOString().slice(0, 10);
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id ? { ...entry, contentLength: utf8ByteLength(entry.content), updatedAt: now } : e
      )
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const importEntries = useCallback((data: MemoryEntry[]) => {
    setEntries((prev) => [
      ...prev,
      ...data.map((d) => ({
        ...d,
        id: crypto.randomUUID(),
        contentLength: d.contentLength ?? utf8ByteLength(d.content),
      })),
    ]);
  }, []);

  return (
    <MemoryContext.Provider
      value={{
        entries,
        addEntry,
        updateEntry,
        deleteEntry,
        importEntries,
        refreshMemoryEntries,
        drawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error('useMemory must be used within MemoryProvider');
  return ctx;
}
