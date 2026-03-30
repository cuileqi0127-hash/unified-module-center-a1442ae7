import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Video,
  Image as ImageIcon,
  FileText,
  Sparkles,
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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uploadVideoFile, uploadMediaFile, createVideoTask, pollTaskUntilComplete } from '@/services/videoReplicationApi';
import { MemoryButtonWithDialog } from '@/components/modules/memory/MemoryButtonWithDialog';
import { EstimatedCreditsHint } from './EstimatedCreditsHint';

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

type ViewState = 'upload' | 'analyzing' | 'prompt' | 'image-upload' | 'generating' | 'result';

export function VideoReplication({ onNavigate }: VideoReplicationProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [viewState, setViewState] = useState<ViewState>('upload');
  const [originalVideo, setOriginalVideo] = useState<UploadedFile | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedFile | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageFileId, setImageFileId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);
  const [sellingPoints, setSellingPoints] = useState<string>('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [dynamicsLevel, setDynamicsLevel] = useState(0.6);
  const [resolution, setResolution] = useState<'720p' | '1080p' | '2k'>('1080p');
  const [ratio, setRatio] = useState<'16:9' | '9:16'>('16:9');

  /** 与 toolbox ReplicateWorkspace 一致的粗略计费展示（样式对齐） */
  const estimatedCost = useMemo(() => {
    let cost = 0;
    if (originalVideo) cost += 8;
    if (referenceImage) cost += 2;
    const spLines = sellingPoints.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean);
    cost += spLines.length;
    cost += selectedMemoryIds.length;
    return Math.max(cost, 0);
  }, [originalVideo, referenceImage, sellingPoints, selectedMemoryIds]);

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
    const url = URL.createObjectURL(file);
        setOriginalVideo({ id: crypto.randomUUID(), type: 'video', name: file.name, url, file });
      toast.success(t('videoReplication.uploadSuccess'));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('videoReplication.uploadVideo'));
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
        const res = await uploadMediaFile(file);
        if (res?.fileId) {
          setImageFileId(res.fileId);
          setReferenceImage({
            id: crypto.randomUUID(),
            type: 'image',
            name: file.name,
            url: URL.createObjectURL(file),
            file,
          });
          toast.success(t('videoReplication.success.imageUploaded'));
        } else throw new Error(t('videoReplication.errors.uploadImage'));
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
      const file = e.target.files?.[0];
      if (file) processImageFile(file);
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

  const handleAnalyzeVideo = useCallback(async () => {
    if (!originalVideo?.file) return;
    setViewState('analyzing');
    setIsGenerating(true);
    try {
      const res = await uploadVideoFile(originalVideo.file);
      if (res?.prompt_text && typeof res.prompt_text === 'string') {
        setSellingPoints(res.prompt_text);
        setViewState('prompt');
      } else throw new Error(t('videoReplication.errors.generatePrompt'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('videoReplication.errors.generatePrompt'));
      setViewState('upload');
    } finally {
      setIsGenerating(false);
    }
  }, [originalVideo, t]);

  const handleStartReplication = useCallback(async () => {
    if (!imageFileId) {
      toast.error(t('videoReplication.errors.uploadImageFirst'));
      return;
    }
    if (!sellingPoints.trim()) {
      toast.error(t('videoReplication.errors.enterSellingPoints'));
      return;
    }
    setViewState('generating');
    setIsReplicating(true);
    setGenerationError(null);
    try {
      const createResponse = await createVideoTask({ prompt: sellingPoints.trim(), fileId: imageFileId });
      if (!createResponse?.task_id) throw new Error(t('videoReplication.errors.createTask'));
      const finalStatus = await pollTaskUntilComplete(createResponse.task_id, () => {});
      if (finalStatus.video_url) {
        setGeneratedVideo(finalStatus.video_url);
        setViewState('result');
        toast.success(t('videoReplication.success.videoGenerated'));
      } else throw new Error(t('videoReplication.errors.noVideoUrl'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('videoReplication.errors.generateVideo');
      setGenerationError(msg);
      toast.error(msg);
      setViewState('image-upload');
    } finally {
      setIsReplicating(false);
    }
  }, [imageFileId, sellingPoints, t]);

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
    setReferenceImage(null);
    setImageFileId('');
    setSellingPoints('');
    setGeneratedVideo(null);
    setGenerationError(null);
  }, []);

  const canSend =
    (!!originalVideo && !!referenceImage && sellingPoints.trim().length > 0) ||
    (!!originalVideo && !sellingPoints.trim()); // can analyze when video only
  const isPrimaryAnalyze = !!originalVideo && !sellingPoints.trim();
  const isPrimaryReplicate = !!sellingPoints.trim() && !!imageFileId;

  const historySheet = (
    <Sheet>
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
          <p className="text-sm text-muted-foreground text-center py-8">{t('videoReplication.noHistory')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );

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

  return (
    <div className="relative h-full">
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

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
                        <LoadingSpinner className="w-5 h-5 text-primary" />
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
                  {referenceImage ? (
                    <div className="relative w-[120px] h-[120px] rounded-xl overflow-hidden border border-border/40 bg-white group">
                      <img src={referenceImage.url} alt="" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => { setReferenceImage(null); setImageFileId(''); }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
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
                        <LoadingSpinner className="w-5 h-5 text-primary" />
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground/60 leading-tight text-center px-1">{t('videoReplication.uploadImageLabel')}</span>
                        </>
                      )}
                    </div>
                  )}
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
                <EstimatedCreditsHint amount={estimatedCost} />
                <button
                  type="button"
                  onClick={() => {
                    if (isPrimaryAnalyze) handleAnalyzeVideo();
                    else if (isPrimaryReplicate) handleStartReplication();
                  }}
                  disabled={
                    (isPrimaryAnalyze && isGenerating) ||
                    (isPrimaryReplicate && isReplicating) ||
                    (!isPrimaryAnalyze && !isPrimaryReplicate)
                  }
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                    (isPrimaryAnalyze || isPrimaryReplicate) && !(isGenerating || isReplicating)
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-muted/60 text-muted-foreground/40 cursor-not-allowed'
                  )}
                >
                  {(isGenerating || isReplicating) ? (
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

      {(viewState === 'analyzing' || viewState === 'generating') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-medium text-foreground">
              {viewState === 'analyzing' ? t('videoReplication.analyzingLabel') : t('videoReplication.generatingLabel')}
            </p>
            <p className="text-sm text-muted-foreground">
              {viewState === 'analyzing' ? t('videoReplication.analyzingVideoHint') : t('videoReplication.generatingVideoHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
