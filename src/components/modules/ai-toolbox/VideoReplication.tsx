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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uploadVideoFile, uploadMediaFile, createVideoTask, pollTaskUntilComplete, type MediaUploadResponse } from '@/services/videoReplicationApi';

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

// View state: 'upload' -> 'analyzing' -> 'prompt' -> 'image-upload' -> 'generating' -> 'result'
type ViewState = 'upload' | 'analyzing' | 'prompt' | 'image-upload' | 'generating' | 'result';

export function VideoReplication({ onNavigate }: VideoReplicationProps) {
  const { t } = useTranslation();
  
  // View state
  const [viewState, setViewState] = useState<ViewState>('upload');
  
  // Upload state
  const [originalVideo, setOriginalVideo] = useState<UploadedFile | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedFile | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageFileId, setImageFileId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);
  
  // Prompt state
  const [sellingPoints, setSellingPoints] = useState<string>('');
  
  // Video generation state
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  
  // Step 1: Initial interface construction
  // Handle video upload
  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processVideoFile(file);
    // Reset input
    e.target.value = '';
  }, []);
  
  // Process video file
  const processVideoFile = useCallback(async (file: File) => {
    // Validate video format
    if (!file.type.startsWith('video/')) {
      toast.error(t('videoReplication.uploadVideo'));
      return;
    }
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error(t('videoReplication.errors.videoSizeLimit'));
      return;
    }
    
    setIsVideoUploading(true);
    
    try {
      // Create local preview URL
      const url = URL.createObjectURL(file);
      const videoId = crypto.randomUUID();
      
      const newVideo = {
        id: videoId,
        type: 'video' as const,
        name: file.name,
        url,
        file,
      };
      
      setOriginalVideo(newVideo);
      toast.success(t('videoReplication.uploadSuccess'));
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error(error instanceof Error ? error.message : t('videoReplication.uploadVideo'));
    } finally {
      setIsVideoUploading(false);
    }
  }, [t]);
  
  // Handle video drag over
  const handleVideoDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  
  // Handle video drag leave
  const handleVideoDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  
  // Handle video drop
  const handleVideoDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  }, [processVideoFile]);

  // Step 3: Prompt generation API call
  const handleAnalyzeVideo = useCallback(async () => {
    if (!originalVideo?.file) return;
    
    setViewState('analyzing');
    setIsGenerating(true);
    
    try {
      // Call uploadVideoFile API to generate prompt
      const res = await uploadVideoFile(originalVideo.file);
      console.log('Upload response:', res);
      
      // If response has prompt_text, update selling points
      if (res && res.prompt_text && typeof res.prompt_text === 'string') {
        setSellingPoints(res.prompt_text);
        // Move to prompt view
        setViewState('prompt');
      } else {
        throw new Error(t('videoReplication.errors.generatePrompt'));
      }
    } catch (error) {
      console.error('Prompt generation error:', error);
      toast.error(error instanceof Error ? error.message : t('videoReplication.errors.generatePrompt'));
      // Return to upload view
      setViewState('upload');
    } finally {
      setIsGenerating(false);
    }
  }, [originalVideo, t]);

  // Step 5: Product image upload processing
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
    // Reset input
    e.target.value = '';
  }, []);
  
  // Process image file
  const processImageFile = useCallback(async (file: File) => {
    // Validate image format
    if (!file.type.startsWith('image/')) {
      toast.error(t('videoReplication.uploadVideo'));
      return;
    }
    
    // Validate specific image formats
    const allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      toast.error(t('videoReplication.errors.imageFormatLimit'));
      return;
    }
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(t('videoReplication.errors.imageSizeLimit'));
      return;
    }
    
    setIsImageUploading(true);
    
    try {
      // Call uploadMediaFile API
      const res = await uploadMediaFile(file);
      console.log('Image upload response:', res);
      
      // Save returned fileId
      if (res && res.fileId) {
        setImageFileId(res.fileId);
        
        // Create local preview URL
        const url = URL.createObjectURL(file);
        const imgId = crypto.randomUUID();
        
        const newImage = {
          id: imgId,
          type: 'image' as const,
          name: file.name,
          url,
          file,
        };
        
        setReferenceImage(newImage);
        toast.success(t('videoReplication.success.imageUploaded'));
      } else {
        throw new Error(t('videoReplication.errors.uploadImage'));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(error instanceof Error ? error.message : t('videoReplication.errors.uploadImage'));
    } finally {
      setIsImageUploading(false);
    }
  }, [t]);
  
  // Handle image drag over
  const handleImageDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsImageDragOver(true);
  }, []);
  
  // Handle image drag leave
  const handleImageDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsImageDragOver(false);
  }, []);
  
  // Handle image drop
  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsImageDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  }, [processImageFile]);

  // Step 6: Video generation and task polling
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
      // Create video task
      const createResponse = await createVideoTask({
        prompt: sellingPoints.trim(),
        fileId: imageFileId,
      });
      
      console.log('Create task response:', createResponse);
      
      if (!createResponse || !createResponse.task_id) {
        throw new Error(t('videoReplication.errors.createTask'));
      }
      
      // Poll task until complete
      const finalStatus = await pollTaskUntilComplete(
        createResponse.task_id,
        (status) => {
          console.log('Task progress:', status);
        }
      );
      
      console.log('Final task status:', finalStatus);
      
      // Check if video URL is available
      if (finalStatus.video_url) {
        setGeneratedVideo(finalStatus.video_url);
        setViewState('result');
        toast.success(t('videoReplication.success.videoGenerated'));
      } else {
        throw new Error(t('videoReplication.errors.noVideoUrl'));
      }
    } catch (error) {
      console.error('Replication error:', error);
      const errorMessage = error instanceof Error ? error.message : t('videoReplication.errors.generateVideo');
      setGenerationError(errorMessage);
      toast.error(errorMessage);
      // Return to image upload view
      setViewState('image-upload');
    } finally {
      setIsReplicating(false);
    }
  }, [imageFileId, sellingPoints, t]);

  // Handle copy prompt
  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(sellingPoints).then(() => {
      toast.success(t('videoReplication.success.promptCopied'));
    });
  }, [sellingPoints, t]);

  // Handle download video
  const handleDownloadVideo = useCallback(() => {
    if (!generatedVideo) return;
    
    const link = document.createElement('a');
    link.href = generatedVideo;
    link.download = `replicated-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('videoReplication.success.videoDownloadStarted'));
  }, [generatedVideo, t]);

  // Handle retry video generation
  const handleRetryGeneration = useCallback(() => {
    setViewState('image-upload');
  }, []);

  // Handle back to upload
  const handleBackToUpload = useCallback(() => {
    setViewState('upload');
    setOriginalVideo(null);
    setSellingPoints('');
    setReferenceImage(null);
    setImageFileId('');
    setGeneratedVideo(null);
    setGenerationError(null);
  }, []);

  return (
    <div className="h-[calc(100vh-72px)] flex bg-background">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Video className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">{t('videoReplication.title')}</h1>
            </div>
            <p className="text-muted-foreground">{t('videoReplication.subtitle')}</p>
          </div>

          {/* Upload View (Step 1 & 2) */}
          {viewState === 'upload' && (
            <div className="space-y-6">
              {/* Video Upload */}
              <div>
                <h2 className="text-lg font-medium mb-4">{t('videoReplication.uploadVideoSection')}</h2>
                {!originalVideo ? (
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors relative min-h-[300px] ${
                      isDragOver 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => !isVideoUploading && fileInputRef.current?.click()}
                    onDragOver={handleVideoDragOver}
                    onDragLeave={handleVideoDragLeave}
                    onDrop={handleVideoDrop}
                  >
                    {isVideoUploading ? (
                      <div className="absolute inset-0 bg-background/90 flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                          <p className="font-medium text-sm">{t('videoReplication.uploading')}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">{t('videoReplication.uploadVideo')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {t('videoReplication.uploadVideoHint')}<br />
                          <span className="text-xs mt-2 block">{t('videoReplication.formats.video')}</span>
                        </p>
                        <Button
                          className="mx-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            !isVideoUploading && fileInputRef.current?.click();
                          }}
                          disabled={isVideoUploading}
                        >
                          {t('videoReplication.selectVideo')}
                        </Button>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoUpload}
                    />
                  </div>
                ) : (
                  <div className="border border-primary/50 rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        <span className="font-medium truncate max-w-[200px]">{originalVideo.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setOriginalVideo(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <video 
                      src={originalVideo.url} 
                      className="w-full h-48 object-cover rounded-md bg-black"
                      controls
                    />
                  </div>
                )}
              </div>

              {/* Generate Prompt Button */}
              <div className="pt-4">
                <Button 
                  className="w-full"
                  disabled={!originalVideo || isVideoUploading}
                  onClick={handleAnalyzeVideo}
                  loading={isGenerating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('videoReplication.generatePrompt')}
                </Button>
              </div>
            </div>
          )}

          {/* Analyzing View (Step 3) */}
          {viewState === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 mb-6 relative">
                <Loader2 className="w-20 h-20 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-medium mb-2">{t('videoReplication.analyzingVideo')}</h2>
              <p className="text-muted-foreground text-center max-w-md">
                {t('videoReplication.analyzingVideoHint')}
              </p>
            </div>
          )}

          {/* Prompt View (Step 4) */}
          {viewState === 'prompt' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-4">{t('videoReplication.generatedPrompt')}</h2>
                <div className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{t('videoReplication.sellingPointsSection')}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleCopyPrompt}
                      className="text-primary"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {t('videoReplication.copy')}
                    </Button>
                  </div>
                  <Textarea
                    value={sellingPoints}
                    onChange={(e) => setSellingPoints(e.target.value)}
                    className="min-h-[120px] resize-none"
                    placeholder={t('videoReplication.sellingPointsPlaceholder')}
                  />
                </div>
              </div>

              {/* Continue Button */}
              <div className="pt-4">
                <Button 
                  className="w-full"
                  disabled={!sellingPoints.trim()}
                  onClick={() => setViewState('image-upload')}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {t('videoReplication.uploadImage')}
                </Button>
              </div>
            </div>
          )}

          {/* Image Upload View (Step 5) */}
          {viewState === 'image-upload' && (
            <div className="space-y-6">
              {/* Prompt Preview */}
              <div className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-medium">{t('videoReplication.sellingPointsSection')}</h3>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{sellingPoints}</p>
              </div>

              {/* Image Upload */}
              <div>
                <h2 className="text-lg font-medium mb-4">{t('videoReplication.referenceImageSection')}</h2>
                {!referenceImage ? (
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors relative min-h-[300px] ${
                      isImageDragOver 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => !isImageUploading && imageInputRef.current?.click()}
                    onDragOver={handleImageDragOver}
                    onDragLeave={handleImageDragLeave}
                    onDrop={handleImageDrop}
                  >
                    {isImageUploading ? (
                      <div className="absolute inset-0 bg-background/90 flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                          <p className="font-medium text-sm">{t('videoReplication.uploading')}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">{t('videoReplication.uploadImage')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {t('videoReplication.referenceImageHint')}<br />
                          <span className="text-xs mt-2 block">{t('videoReplication.formats.image')}</span>
                        </p>
                        <Button
                          className="mx-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            !isImageUploading && imageInputRef.current?.click();
                          }}
                          disabled={isImageUploading}
                        >
                          {t('videoReplication.selectImage')}
                        </Button>
                      </>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                ) : (
                  <div className="border border-primary/50 rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        <span className="font-medium truncate max-w-[200px]">{referenceImage.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => {
                          setReferenceImage(null);
                          setImageFileId('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <img 
                      src={referenceImage.url} 
                      alt={t('videoReplication.referenceImageSection')}
                      className="w-full h-48 object-cover rounded-md"
                    />
                  </div>
                )}
              </div>

              {/* Generate Video Button */}
              <div className="pt-4">
                <Button 
                  className="w-full"
                  disabled={!referenceImage || !imageFileId || isImageUploading}
                  onClick={handleStartReplication}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('videoReplication.startReplication')}
                </Button>
              </div>
            </div>
          )}

          {/* Generating View (Step 6) */}
          {viewState === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 mb-6 relative">
                <Loader2 className="w-20 h-20 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-medium mb-2">{t('videoReplication.generatingVideo')}</h2>
              <p className="text-muted-foreground text-center max-w-md">
                {t('videoReplication.generatingVideoHint')}
              </p>
            </div>
          )}

          {/* Result View */}
          {viewState === 'result' && generatedVideo && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-4">{t('videoReplication.generatedVideo')}</h2>
                <div className="border border-border rounded-lg overflow-hidden">
                  <video 
                    src={generatedVideo} 
                    className="w-full h-64 object-cover bg-black"
                    controls
                    autoPlay
                    muted
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button 
                  className="flex-1"
                  onClick={handleDownloadVideo}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('videoReplication.download')}
                </Button>
                <Button 
                  className="flex-1"
                  variant="ghost"
                  onClick={handleBackToUpload}
                >
                  {t('videoReplication.createAnother')}
                </Button>
              </div>
            </div>
          )}

          {/* Error Handling */}
          {generationError && (
            <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/5">
              <h3 className="font-medium text-destructive mb-2">{t('videoReplication.error')}</h3>
              <p className="text-sm text-destructive/80 mb-4">{generationError}</p>
              <div className="flex gap-2">
                <Button 
                  variant="ghost"
                  onClick={handleRetryGeneration}
                >
                  {t('videoReplication.retry')}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={handleBackToUpload}
                >
                  {t('videoReplication.startOver')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
