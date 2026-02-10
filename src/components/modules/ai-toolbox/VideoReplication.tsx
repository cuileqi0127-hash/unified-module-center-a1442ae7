import { useState, useRef, useCallback } from 'react';
import { 
  Video,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Loader2,
  Copy, 
  Download,
  X,
  Clock,
  Upload,
  ListOrdered,
  Settings,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uploadVideoFile, uploadMediaFile, createVideoTask, pollTaskUntilComplete } from '@/services/videoReplicationApi';

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

const cardGlass = cn(
  'rounded-2xl border-0 overflow-hidden',
  'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl',
  'shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.06)]',
  'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.3)]',
  'transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5'
);

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
  const [dynamicsLevel, setDynamicsLevel] = useState(0.6);
  const [resolution, setResolution] = useState<'720p' | '1080p' | '2k'>('1080p');
  const [ratio, setRatio] = useState<'16:9' | '9:16'>('16:9');

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

  const renderUploadZone = (
    type: 'video' | 'image',
    step: number,
    stepLabel: string,
    title: string,
    hint: string,
    formatHint: string,
    hasFile: boolean,
    filePreview: UploadedFile | null,
    isUploading: boolean,
    isDrag: boolean,
    onDragOver: (e: React.DragEvent) => void,
    onDragLeave: (e: React.DragEvent) => void,
    onDrop: (e: React.DragEvent) => void,
    onSelect: () => void,
    onClear: () => void,
    onReversePrompt?: () => void,
    isReversePromptLoading?: boolean
  ) => (
    <div className={cn(cardGlass, 'p-5 h-full flex flex-col min-h-0')}>
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-1 shrink-0">
        STEP {step}: {stepLabel}
      </p>
      {!hasFile ? (
        <div
          className={cn(
            'rounded-xl border-2 border-dashed flex-1 min-h-[140px] flex flex-col items-center justify-center gap-3 p-6 cursor-pointer transition-colors',
            isDrag ? 'border-primary bg-primary/5' : 'border-border/80 hover:border-primary/40 hover:bg-muted/30'
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isUploading && (type === 'video' ? fileInputRef.current?.click() : imageInputRef.current?.click())}
        >
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : type === 'video' ? (
            <Video className="w-12 h-12 text-muted-foreground/70 shrink-0" />
          ) : (
            <ImageIcon className="w-12 h-12 text-muted-foreground/70 shrink-0" />
          )}
          <span className="font-medium text-sm text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground text-center">{hint}</span>
          <span className="text-[11px] text-muted-foreground/80">{formatHint}</span>
          <Button variant="outline" size="sm" className="rounded-lg shrink-0" onClick={(e) => { e.stopPropagation(); onSelect(); }} disabled={isUploading}>
            {type === 'video' ? t('videoReplication.selectVideo') : t('videoReplication.selectImage')}
          </Button>
        </div>
      ) : filePreview && (
        <div className="rounded-xl border border-border/80 bg-black/[0.02] dark:bg-white/[0.04] overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between p-2 border-b border-border/50 shrink-0">
            <span className="text-sm font-medium truncate">{filePreview.name}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClear}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center bg-black/5">
            {type === 'video' ? (
              <video src={filePreview.url} className="w-full h-full object-contain bg-black" controls />
            ) : (
              <img src={filePreview.url} alt="" className="max-w-full max-h-full object-contain" />
            )}
          </div>
          {type === 'video' && onReversePrompt && (
            <div className="pt-3 shrink-0">
              <Button
                className="w-full rounded-xl gap-2 bg-primary hover:bg-primary/90"
                disabled={isReversePromptLoading}
                onClick={(e) => { e.stopPropagation(); onReversePrompt(); }}
              >
                {isReversePromptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {t('videoReplication.reversePrompt')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (viewState === 'result' && generatedVideo) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/20 opacity-0 animate-page-enter">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">{t('videoReplication.title')}</h1>
            <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">SMART CLONE</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={handleBackToStart}>
              {t('videoReplication.createAnother')}
            </Button>
            <Button size="sm" className="rounded-xl gap-2 bg-primary hover:bg-primary/90" onClick={handleDownload}>
              <Upload className="w-4 h-4" />
              {t('videoReplication.exportWork')}
            </Button>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('videoReplication.generatedVideo')}</h2>
            <div className={cn(cardGlass, 'overflow-hidden')}>
              <video src={generatedVideo} className="w-full aspect-video bg-black" controls autoPlay muted />
            </div>
                </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/20 overflow-hidden opacity-0 animate-page-enter">
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">{t('videoReplication.title')}</h1>
            <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">SMART CLONE</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">VIDEO ANALYSIS & SYNTHESIS STUDIO</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-xl gap-2 text-muted-foreground" disabled>
            <Clock className="w-4 h-4" />
            {t('videoReplication.historyVersion')}
                          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0">
            {renderUploadZone(
              'video',
              1,
              t('videoReplication.step1Label'),
              t('videoReplication.uploadVideoSection'),
              t('videoReplication.uploadVideoHint'),
              t('videoReplication.formats.video'),
              !!originalVideo,
              originalVideo,
              isVideoUploading,
              isDragOver,
              (e) => { e.preventDefault(); setIsDragOver(true); },
              (e) => { e.preventDefault(); setIsDragOver(false); },
              handleVideoDrop,
              () => fileInputRef.current?.click(),
              () => setOriginalVideo(null),
              handleAnalyzeVideo,
              isGenerating
            )}
            {renderUploadZone(
              'image',
              2,
              t('videoReplication.step2Label'),
              t('videoReplication.referenceImageSection'),
              t('videoReplication.referenceImageHint'),
              t('videoReplication.formats.image'),
              !!referenceImage,
              referenceImage,
              isImageUploading,
              isImageDragOver,
              (e) => { e.preventDefault(); setIsImageDragOver(true); },
              (e) => { e.preventDefault(); setIsImageDragOver(false); },
              handleImageDrop,
              () => imageInputRef.current?.click(),
              () => { setReferenceImage(null); setImageFileId(''); }
            )}

            <div className={cn(cardGlass, 'p-5 h-full flex flex-col min-h-0')}>
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-4 shrink-0">{t('videoReplication.dynamicsLabel')}</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">STILL</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={dynamicsLevel}
                  onChange={(e) => setDynamicsLevel(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-muted accent-primary"
                />
                <span className="text-xs text-muted-foreground">HIGH MOTION</span>
              </div>
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mt-5 mb-3">{t('videoReplication.resolutionLabel')}</p>
              <div className="flex gap-2">
                {(['720p', '1080p', '2k'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResolution(r)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-medium transition-colors',
                      resolution === r ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {r === '2k' ? '2K HDR' : r}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mt-5 mb-3">{t('videoReplication.ratioLabel')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRatio('16:9')}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5',
                    ratio === '16:9' ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <span className="inline-block w-6 h-3.5 border border-current rounded-sm" /> 16:9
                </button>
                <button
                  type="button"
                  onClick={() => setRatio('9:16')}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5',
                    ratio === '9:16' ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <span className="inline-block w-3.5 h-6 border border-current rounded-sm" /> 9:16
                </button>
              </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
            <div className="lg:col-span-2 h-full min-h-0 flex flex-col">
              <div className={cn(cardGlass, 'p-5 h-full flex flex-col min-h-0')}>
                <div className="flex items-center gap-2 mb-3 shrink-0">
                  <ListOrdered className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold tracking-wider text-primary uppercase">{t('videoReplication.aiPromptLabel')}</span>
              </div>
              <Textarea
                value={sellingPoints}
                onChange={(e) => setSellingPoints(e.target.value)}
                    placeholder={t('videoReplication.sellingPointsPlaceholder')}
                  className="flex-1 min-h-[100px] rounded-xl border-border/80 bg-black/[0.02] dark:bg-white/[0.04] resize-none text-sm"
              />
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground shrink-0">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  {t('videoReplication.centerTip')}
                </div>
                <div className="flex items-center justify-between mt-4 shrink-0">
                  <Button variant="ghost" size="sm" className="rounded-lg gap-1.5" onClick={handleCopyPrompt} disabled={!sellingPoints.trim()}>
                    <Copy className="w-4 h-4" />
                    {t('videoReplication.copy')}
              </Button>
                  {!sellingPoints.trim() && originalVideo ? (
            <Button 
                      className="rounded-xl gap-2 bg-primary hover:bg-primary/90"
                      disabled={isGenerating}
                      onClick={handleAnalyzeVideo}
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {t('videoReplication.generatePrompt')}
                        </Button>
                  ) : (
                      <Button 
                      className="rounded-xl gap-2 bg-primary hover:bg-primary/90"
                      disabled={!sellingPoints.trim() || !imageFileId || isReplicating}
                      onClick={handleStartReplication}
                    >
                      {isReplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {t('videoReplication.startReplication')}
            </Button>
                )}
                </div>
              </div>
                </div>
            <div className={cn(cardGlass, 'p-5 h-full flex flex-col min-h-0')}>
              <div className="flex items-center gap-2 mb-3 shrink-0">
                <span className="text-xs font-semibold tracking-wider text-primary uppercase">{t('videoReplication.proTipLabel')}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 min-h-0 overflow-auto">{t('videoReplication.proTipContent')}</p>
              <Button variant="outline" size="sm" className="mt-4 rounded-xl gap-2 w-full shrink-0" disabled>
                <Settings className="w-4 h-4" />
                {t('videoReplication.advancedCamera')}
                </Button>
                  </div>
                </div>

          {generationError && (
          <div className={cn(cardGlass, 'p-4 border-destructive/20 bg-destructive/5 shrink-0')}>
            <p className="text-sm font-medium text-destructive mb-2">{t('videoReplication.error')}</p>
            <p className="text-xs text-muted-foreground mb-3">{generationError}</p>
              <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewState('image-upload')}>{t('videoReplication.retry')}</Button>
              <Button variant="ghost" size="sm" onClick={handleBackToStart}>{t('videoReplication.startOver')}</Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-2 shrink-0">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{t('videoReplication.assetsVault')}</span>
          <Button variant="ghost" size="sm" className="rounded-xl gap-2 text-muted-foreground" disabled>
            <FolderOpen className="w-4 h-4" />
            {t('videoReplication.assetsVaultHint')}
          </Button>
      </div>
      </div>

      {(viewState === 'analyzing' || viewState === 'generating') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="w-14 h-14 text-primary animate-spin mx-auto mb-4" />
            <p className="font-medium text-foreground">{viewState === 'analyzing' ? t('videoReplication.analyzingVideo') : t('videoReplication.generatingVideo')}</p>
            <p className="text-sm text-muted-foreground mt-1">{viewState === 'analyzing' ? t('videoReplication.analyzingVideoHint') : t('videoReplication.generatingVideoHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
