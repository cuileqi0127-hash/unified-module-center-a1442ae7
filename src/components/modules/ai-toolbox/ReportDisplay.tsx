import { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ReportDisplayProps {
  reportUrl: string;
  reportTitle: string;
  generatingLabel?: string;
  generatingHint?: string;
}

/**
 * 报告展示模块：拉取 reportUrl 的 HTML 内容并展示（srcdoc 或 iframe src）
 */
export function ReportDisplay({
  reportUrl,
  reportTitle,
  generatingLabel = '生成中...',
  generatingHint = '正在生成报告，请稍候…',
}: ReportDisplayProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!reportUrl) return;
    let cancelled = false;
    setReportHtml(null);
    fetch(reportUrl, { mode: 'cors' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.text();
      })
      .then((html) => {
        if (!cancelled) setReportHtml(html);
      })
      .catch(() => {
        if (!cancelled) setReportHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reportUrl]);

  return (
    <div className="flex-1 min-h-0 relative">
      {reportUrl && (
        reportHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={reportHtml}
            title={reportTitle}
            className="w-full h-full border-0 min-h-0"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={reportUrl}
            title={reportTitle}
            className="w-full h-full border-0 min-h-0"
          />
        )
      )}
    </div>
  );
}

interface ReportPollingOverlayProps {
  show: boolean;
  generatingLabel?: string;
  generatingHint?: string;
}

/** 轮询中的全屏 loading 遮罩 */
export function ReportPollingOverlay({
  show,
  generatingLabel = '生成中...',
  generatingHint = '正在生成报告，请稍候…',
}: ReportPollingOverlayProps) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner className="text-primary" />
      <p className="mt-4 font-medium text-foreground">{generatingLabel}</p>
      <p className="mt-1 text-sm text-muted-foreground">{generatingHint}</p>
    </div>
  );
}
