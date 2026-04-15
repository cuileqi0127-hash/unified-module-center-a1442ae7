import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Video,
  Image as ImageIcon,
  FileText,
  Copy,
  Download,
  X,
  ArrowLeft,
  ArrowUp,
  Plus,
  Play,
  History,
  Maximize2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  confirmVideoReplicaPrompt,
  createVideoReplicaTask,
  estimateVideoReplicaCredits,
  getVideoReplicaTasksPage,
  pollVideoReplicaTaskUntilTerminal,
  type VideoReplicaTaskDetail,
  type VideoReplicaTaskListItem,
} from '@/services/videoReplicationApi';
import { MemoryButtonWithDialog } from '@/components/modules/memory/MemoryButtonWithDialog';
import { EstimatedCreditsHint } from './EstimatedCreditsHint';
import { uploadFile } from '@/services/fileUploadApi';

interface VideoReplicationProps {
  onNavigate?: (itemId: string) => void;
}

interface UploadedFile {
  id: string;
  type: 'video' | 'image';
  name: string;
  url: string;
  file?: File;
}

type ViewState = 'upload' | 'result';

export function VideoReplication({ onNavigate }: VideoReplicationProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [viewState, setViewState] = useState<ViewState>('upload');
  const [originalVideo, setOriginalVideo] = useState<UploadedFile | null>(null);
  const [productImages, setProductImages] = useState<UploadedFile[]>([]);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);
  const [sellingPoints, setSellingPoints] = useState<string>('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [estimatedCredits, setEstimatedCredits] = useState<number>(0);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | number | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [isAwaitingPromptConfirmation, setIsAwaitingPromptConfirmation] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<VideoReplicaTaskListItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const sellingPointsLines = useMemo(
    () => sellingPoints.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean),
    [sellingPoints]
  );

  const benchmarkVideoUrl = originalVideo?.url || '';
  const productImageUrls = useMemo(() => productImages.map((x) => x.url).filter(Boolean), [productImages]);
  const memoryEntryIds = useMemo(
    () => selectedMemoryIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
    [selectedMemoryIds]
  );

  const hasRequiredInputs = !!benchmarkVideoUrl && productImageUrls.length > 0 && sellingPointsLines.length > 0;

  useEffect(() => {
    let cancelled = false;

    if (!hasRequiredInputs) {
      setEstimatedCredits(0);
      setEstimateError(null);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await estimateVideoReplicaCredits({
          sellingPoints: sellingPointsLines,
          productImageUrls,
          benchmarkVideoUrl,
          ...(memoryEntryIds.length ? { memoryEntryIds } : {}),
        });
        if (cancelled) return;
        setEstimatedCredits(res.data?.estimatedCredits ?? 0);
        setEstimateError(null);
      } catch (e) {
        if (cancelled) return;
        setEstimatedCredits(0);
        setEstimateError(e instanceof Error ? e.message : t('videoReplication.errors.estimateFailed'));
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [benchmarkVideoUrl, productImageUrls, sellingPointsLines, memoryEntryIds, hasRequiredInputs, t]);

  useEffect(() => {
    const url = sessionStorage.getItem('videoReplicationInitialVideoUrl');
    if (!url) return;
    sessionStorage.removeItem('videoReplicationInitialVideoUrl');
    const id = crypto.randomUUID();

    const applyInitialVideo = (payload: { url: string; file?: File }) => {
      setOriginalVideo({
        id,
        type: 'video',
        name: 'video.mp4',
        url: payload.url,
        file: payload.file,
      });
    };

    setIsVideoUploading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.blob();
      })
      .then((blob) => {
        const file = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });
        applyInitialVideo({ url, file });
        toast.success(t('videoReplication.uploadSuccess'));
      })
      .catch(() => {
        applyInitialVideo({ url });
        toast.error(t('videoReplication.errors.urlToFileFailed'));
      })
      .finally(() => setIsVideoUploading(false));
  }, [t]);

  const processVideoFile = useCallback(
    async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error(t('videoReplication.uploadVideo'));
      return;
    }
      if (file.size > 50 * 1024 * 1024) {
      toast.error(t('videoReplication.errors.videoSizeLimit'));
      return;
    }
    setIsVideoUploading(true);
    try {
        const { url } = await uploadFile(file);
        setOriginalVideo({ id: crypto.randomUUID(), type: 'video', name: file.name, url, file });
        toast.success(t('videoReplication.success.videoUploaded'));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('videoReplication.errors.uploadVideoFailed'));
    } finally {
      setIsVideoUploading(false);
    }
    },
    [t]
  );

  const processImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error(t('videoReplication.uploadVideo'));
        return;
      }
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        toast.error(t('videoReplication.errors.imageFormatLimit'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('videoReplication.errors.imageSizeLimit'));
        return;
      }
      setIsImageUploading(true);
      try {
        const { url } = await uploadFile(file);
        setProductImages((prev) => {
          if (prev.length >= 5) return prev;
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: 'image',
              name: file.name,
              url,
              file,
            },
          ];
        });
        toast.success(t('videoReplication.success.imageUploaded'));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('videoReplication.errors.uploadImage'));
      } finally {
        setIsImageUploading(false);
      }
    },
    [t]
  );

  const handleVideoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processVideoFile(file);
      e.target.value = '';
    },
    [processVideoFile]
  );
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      for (const file of files) {
        void processImageFile(file);
      }
      e.target.value = '';
    },
    [processImageFile]
  );

  const handleVideoDrop = useCallback(
    (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processVideoFile(file);
    },
    [processVideoFile]
  );
  const handleImageDrop = useCallback(
    (e: React.DragEvent) => {
    e.preventDefault();
      setIsImageDragOver(false);
    const file = e.dataTransfer.files?.[0];
      if (file) processImageFile(file);
    },
    [processImageFile]
  );

  const runTaskToResult = useCallback(
    async (taskId: number | string) => {
      setActiveTaskId(taskId);
      setIsReplicating(true);
      setGenerationError(null);

      try {
        // 先轮询到“终态/待确认”
        const detail: VideoReplicaTaskDetail = await pollVideoReplicaTaskUntilTerminal(taskId, () => {});
        if (detail.status === 'awaiting_confirmation') {
          setPendingPrompt(detail.pendingPrompt ?? '');
          setIsAwaitingPromptConfirmation(true);
          return;
        }
        if (detail.status === 'failed') {
          throw new Error(detail.errorMessage || t('videoReplication.errors.generateVideo'));
        }
        if (detail.status === 'completed' && detail.videoUrl) {
          setGeneratedVideo(detail.videoUrl);
          setViewState('result');
          toast.success(t('videoReplication.success.videoGenerated'));
          return;
        }
        throw new Error(t('videoReplication.errors.noVideoUrl'));
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('videoReplication.errors.generateVideo');
        setGenerationError(msg);
        toast.error(msg);
        setViewState('upload');
      } finally {
        setIsReplicating(false);
      }
    },
    [t]
  );

  const handleStartReplication = useCallback(async () => {
    if (!sellingPoints.trim()) {
      toast.error(t('videoReplication.errors.enterSellingPoints'));
      return;
    }
    if (!originalVideo?.url) {
      toast.error(t('videoReplication.errors.uploadBenchmarkVideoFirst'));
      return;
    }
    if (productImageUrls.length === 0) {
      toast.error(t('videoReplication.errors.uploadImageFirst'));
      return;
    }
    setIsReplicating(true);
    setGenerationError(null);
    try {
      const createRes = await createVideoReplicaTask({
        sellingPoints: sellingPointsLines,
        productImageUrls,
        benchmarkVideoUrl,
        ...(memoryEntryIds.length ? { memoryEntryIds } : {}),
      });
      const taskId = createRes.data?.taskId;
      if (!taskId) throw new Error(t('videoReplication.errors.createTask'));
      await runTaskToResult(taskId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('videoReplication.errors.generateVideo');
      setGenerationError(msg);
      toast.error(msg);
      setViewState('upload');
    } finally {
      setIsReplicating(false);
    }
  }, [sellingPoints, originalVideo, productImageUrls, benchmarkVideoUrl, sellingPointsLines, memoryEntryIds, runTaskToResult, t]);

  const handleConfirmPendingPrompt = useCallback(async () => {
    if (!activeTaskId) return;
    const prompt = pendingPrompt.trim();
    if (!prompt) {
      toast.error(t('videoReplication.errors.promptEmpty'));
      return;
    }
    try {
      setIsReplicating(true);
      await confirmVideoReplicaPrompt(activeTaskId, { prompt });
      const detail = await pollVideoReplicaTaskUntilTerminal(activeTaskId, () => {});
      if (detail.status === 'completed' && detail.videoUrl) {
        setGeneratedVideo(detail.videoUrl);
        setViewState('result');
        setIsAwaitingPromptConfirmation(false);
        toast.success(t('videoReplication.success.videoGenerated'));
      } else if (detail.status === 'failed') {
        throw new Error(detail.errorMessage || t('videoReplication.errors.generateVideo'));
      } else if (detail.status === 'awaiting_confirmation') {
        // 理论上不会再次返回，但兜底
        setPendingPrompt(detail.pendingPrompt ?? prompt);
        setIsAwaitingPromptConfirmation(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('videoReplication.errors.generateVideo');
      toast.error(msg);
      setGenerationError(msg);
      setViewState('upload');
    } finally {
      setIsReplicating(false);
    }
  }, [activeTaskId, pendingPrompt, t]);

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(sellingPoints).then(() => toast.success(t('videoReplication.success.promptCopied')));
  }, [sellingPoints, t]);

  const handleDownload = useCallback(() => {
    if (!generatedVideo) return;
    const a = document.createElement('a');
    a.href = generatedVideo;
    a.download = `replicated-${Date.now()}.mp4`;
    a.click();
    toast.success(t('videoReplication.success.videoDownloadStarted'));
  }, [generatedVideo, t]);

  const handleBackToStart = useCallback(() => {
    setViewState('upload');
    setOriginalVideo(null);
    setProductImages([]);
    setSellingPoints('');
    setGeneratedVideo(null);
    setGenerationError(null);
    setEstimatedCredits(0);
    setEstimateError(null);
    setActiveTaskId(null);
    setPendingPrompt('');
    setIsAwaitingPromptConfirmation(false);
  }, []);

  const isPrimaryReplicate = hasRequiredInputs;

  const historySheet = (
    <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-full hover:bg-muted/40"
        >
          <History className="w-3.5 h-3.5" />
          <span>{t('videoReplication.history')}</span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="text-base font-medium">{t('videoReplication.history')}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {isLoadingHistory ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
          ) : historyItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('videoReplication.noHistory')}</p>
          ) : (
            <div className="space-y-2">
              {historyItems.map((item) => (
                <button
                  key={String(item.taskId)}
                  type="button"
                  className="w-full rounded-xl border border-border/30 bg-card/60 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => {
                    setHistoryOpen(false);
                    void runTaskToResult(item.taskId);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">#{String(item.taskId)}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {t(`videoReplication.status.${item.status}`, { defaultValue: item.status })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/80 line-clamp-2">
                    {item.sellingPoints?.slice(0, 3).join('，') || '-'}
                  </p>
                </button>
              ))}
              {historyItems.length < historyTotal && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      if (isLoadingHistory) return;
                      setIsLoadingHistory(true);
                      try {
                        const nextPage = historyPage + 1;
                        const res = await getVideoReplicaTasksPage({ page: nextPage, size: 10 });
                        setHistoryItems((prev) => [...prev, ...(res.data?.list ?? [])]);
                        setHistoryPage(nextPage);
                        setHistoryTotal((prev) => res.data?.total ?? prev);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : t('videoReplication.errors.loadHistoryFailed'));
                      } finally {
                        setIsLoadingHistory(false);
                      }
                    }}
                  >
                    {t('common.loadMore')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  useEffect(() => {
    if (!historyOpen) return;
    let cancelled = false;
    setIsLoadingHistory(true);
    (async () => {
      try {
        const res = await getVideoReplicaTasksPage({ page: 1, size: 10 });
        if (cancelled) return;
        setHistoryItems(res.data?.list ?? []);
        setHistoryTotal(res.data?.total ?? 0);
        setHistoryPage(1);
      } catch (e) {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : t('videoReplication.errors.loadHistoryFailed'));
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyOpen, t]);

  if (viewState === 'result' && generatedVideo) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background">
        <div className="shrink-0 px-6 py-3 border-b border-border/20 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackToStart}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('videoReplication.back')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
            <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-foreground/70">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 flex items-center justify-center text-[10px] text-white">✓</span>
                  <span>{t('videoReplication.replicationComplete')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    {t('videoReplication.download')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoDialogOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Maximize2 className="w-3 h-3" />
                    {t('videoReplication.enlarge')}
                  </button>
                </div>
              </div>
              <div
                className="relative rounded-lg overflow-hidden bg-muted/20 cursor-pointer"
                onClick={() => setVideoDialogOpen(true)}
              >
                <video
                  src={generatedVideo}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full max-h-[400px] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
        <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
          <DialogContent className="max-w-4xl p-2 bg-background/95 backdrop-blur-sm" aria-describedby={undefined}>
            <DialogTitle className="sr-only">{t('videoReplication.previewTitle')}</DialogTitle>
            {generatedVideo && (
              <video src={generatedVideo} autoPlay controls playsInline className="w-full rounded-lg" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isAwaitingPromptConfirmation && activeTaskId) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background">
        <div className="shrink-0 px-6 py-3 border-b border-border/20 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackToStart}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('videoReplication.back')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
            <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-foreground/70">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500/80 flex items-center justify-center text-[10px] text-white">!</span>
                  <span>{t('videoReplication.pendingPromptTitle')}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t('videoReplication.pendingPromptHint')}</p>
              <Textarea
                value={pendingPrompt}
                onChange={(e) => setPendingPrompt(e.target.value)}
                placeholder={t('videoReplication.pendingPromptPlaceholder')}
                className="min-h-[220px] rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20 resize-y"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={handleBackToStart} disabled={isReplicating}>
                  {t('videoReplication.startOver')}
                </Button>
                <Button size="sm" onClick={() => void handleConfirmPendingPrompt()} disabled={isReplicating}>
                  {isReplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('videoReplication.confirmPrompt')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />

      <div className="absolute top-4 right-4 z-20">{historySheet}</div>

      <div className="flex flex-col items-center justify-center p-6 md:p-8 py-[80px]">
        <div className="w-full max-w-2xl animate-fade-in mt-[80px]">
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-normal tracking-tight text-[#3d3d3d]">{t('videoReplication.title')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('videoReplication.pageSubtitle')}</p>
          </div>

          <div className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md">
            <div className="p-5">
              <div className="flex gap-4">
                <div className="shrink-0">
                  {originalVideo ? (
                    <div className="relative w-[120px] h-[120px] rounded-xl overflow-hidden border border-border/40 bg-muted/30 group">
                      <video src={originalVideo.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <button
                        type="button"
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-background transition-colors"
                        onClick={() => setOriginalVideo(null)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[10px] text-white truncate">
                        {originalVideo.name}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'w-[120px] h-[100px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors border-border/40 hover:border-foreground/20 hover:bg-muted/20 cursor-pointer',
                        isDragOver && 'border-primary bg-primary/5'
                      )}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                      onDrop={handleVideoDrop}
                      onClick={() => !isVideoUploading && fileInputRef.current?.click()}
                    >
                      {isVideoUploading ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-5 h-5 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground/60 leading-tight text-center px-1">{t('videoReplication.uploadVideoLabel')}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <div
                    className={cn(
                      'w-[120px] h-[100px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors border-border/40 hover:border-foreground/20 hover:bg-muted/20 cursor-pointer',
                      isImageDragOver && 'border-primary bg-primary/5'
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsImageDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsImageDragOver(false); }}
                    onDrop={handleImageDrop}
                    onClick={() => !isImageUploading && imageInputRef.current?.click()}
                  >
                    {isImageUploading ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 text-muted-foreground/60" />
                        <span className="text-[11px] text-muted-foreground/60 leading-tight text-center px-1">
                          {t('videoReplication.uploadImageLabel')}
                        </span>
                        {productImages.length > 0 && (
                          <span className="text-[10px] text-muted-foreground/60">{productImages.length}/5</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5">{t('videoReplication.productSellingPointsLabel')}</label>
                  <Textarea
                    value={sellingPoints}
                    onChange={(e) => setSellingPoints(e.target.value)}
                    placeholder={t('videoReplication.sellingPointsPlaceholder')}
                    className="min-h-[80px] rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20 resize-y"
                  />
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                    <FileText className="w-3 h-3 shrink-0" />
                    {t('videoReplication.centerTip')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-border/20">
              <div className="flex items-center gap-2 text-[11px]">
                <MemoryButtonWithDialog
                  selectedIds={selectedMemoryIds}
                  onToggle={(id) =>
                    setSelectedMemoryIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    )
                  }
                />
                {sellingPoints.trim() && (
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {t('common.copy')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <EstimatedCreditsHint amount={estimatedCredits} />
                <button
                  type="button"
                  onClick={() => {
                    if (isPrimaryReplicate) void handleStartReplication();
                  }}
                  disabled={
                    (isPrimaryReplicate && isReplicating) ||
                    (!isPrimaryReplicate)
                  }
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                    (isPrimaryReplicate) && !(isReplicating)
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-muted/60 text-muted-foreground/40 cursor-not-allowed'
                  )}
                >
                  {(isReplicating) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {generationError && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2 animate-fade-in">
              <p className="text-sm font-medium text-destructive">{generationError}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setGenerationError(null); setViewState('image-upload'); }}>
                  {t('videoReplication.retry')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleBackToStart}>{t('videoReplication.startOver')}</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {estimateError && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border/30 bg-background/90 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          {estimateError}
        </div>
      )}

      {/* 提交/轮询时不展示全屏 loading，避免打断操作；按钮内会显示 spinner */}
    </div>
  );
}
