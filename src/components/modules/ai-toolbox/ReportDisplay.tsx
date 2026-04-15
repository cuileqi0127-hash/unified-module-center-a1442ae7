import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ReportDisplayProps {
  reportUrl: string;
  reportTitle: string;
  generatingLabel?: string;
  generatingHint?: string;
  /** 报告 iframe 挂载后回调，用于父组件获取 iframe 引用（如导出 PDF） */
  onIframeRef?: (iframe: HTMLIFrameElement | null) => void;
}

/** 注入到报告 HTML 的兜底脚本：当报告内引用 lucide/tailwind 等 CDN 加载失败时避免报错导致白屏 */
const REPORT_FALLBACK_SCRIPT =
  '<script>(function(){if(typeof window.lucide==="undefined"){window.lucide={createIcons:function(){}};}if(typeof window.tailwind==="undefined"){window.tailwind={config:function(){},plugin:function(){return this;}};}})();</script>';

/**
 * 报告展示模块：仅通过 fetch 拉取 HTML 后用 srcDoc 展示，避免 iframe src 直连导致触发浏览器下载（如服务端返回 Content-Disposition: attachment）
 * 会对拉取到的 HTML 注入兜底脚本，避免报告内依赖的 CDN（如 lucide、tailwind）加载失败时出现 ReferenceError 导致页面无法展示。
 */
export function ReportDisplay({
  reportUrl,
  reportTitle,
  generatingLabel,
  generatingHint,
  onIframeRef,
}: ReportDisplayProps) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!reportHtml) {
      onIframeRef?.(null);
      return;
    }
    const timer = setTimeout(() => onIframeRef?.(iframeRef.current ?? null), 150);
    return () => clearTimeout(timer);
  }, [reportHtml, onIframeRef]);

  useEffect(() => {
    if (!reportUrl) return;
    let cancelled = false;
    setReportHtml(null);
    setFetchError(false);
    fetch(reportUrl, { mode: 'cors' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.text();
      })
      .then((html) => {
        if (cancelled) return;
        const injected =
          html.indexOf('</head>') !== -1
            ? html.replace('</head>', REPORT_FALLBACK_SCRIPT + '</head>')
            : html.replace(/<body(\s[^>]*)?>/i, (m) => m + REPORT_FALLBACK_SCRIPT);
        setReportHtml(injected);
      })
      .catch(() => {
        if (!cancelled) {
          setReportHtml(null);
          setFetchError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reportUrl]);

  return (
    <div className="w-full h-full min-h-0 relative">
      {reportUrl && (
        reportHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={reportHtml}
            title={reportTitle}
            className="w-full h-full border-0 min-h-0"
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30">
            {fetchError ? (
              <p className="text-sm text-muted-foreground">{t('reportDisplay.loadFailed')}</p>
            ) : (
              <>
                <LoadingSpinner className="text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">{generatingHint ?? t('reportDisplay.generatingHint')}</p>
              </>
            )}
          </div>
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
  generatingLabel,
  generatingHint,
}: ReportPollingOverlayProps) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner className="text-primary" />
      <p className="mt-4 font-medium text-foreground">{generatingLabel ?? t('reportDisplay.generatingLabel')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{generatingHint ?? t('reportDisplay.generatingHint')}</p>
    </div>
  );
}
