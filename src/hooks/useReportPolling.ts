import { useState, useEffect } from 'react';
import { pollReportUntilReady } from '@/services/reportApi';

/**
 * 轮询报告任务直到返回 reportUrl
 * @param taskId 任务 ID，空则不同步
 * @param enabled 是否启用轮询（如 view === 'report'）
 */
export function useReportPolling(taskId: string | null, enabled: boolean) {
  const [reportUrl, setReportUrl] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !taskId) return;
    setReportUrl('');
    setError(null);
    let cancelled = false;
    setIsPolling(true);
    pollReportUntilReady(taskId, () => {}, 2500, 120)
      .then((url) => {
        if (!cancelled) setReportUrl(url);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setIsPolling(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, taskId]);

  return { reportUrl, isPolling, error };
}
