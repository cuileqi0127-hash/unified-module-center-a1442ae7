import { 
  Download, 
  Send,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Clock,
  PanelRightClose,
  MessageSquare,
  ImageIcon,
  RatioIcon,
  X,
  Copy,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { UniversalCanvas, type CanvasMediaItem, type UniversalCanvasHandle } from './UniversalCanvas';
import { ImageCapsule, type SelectedImage } from './ImageCapsule';
import { useTextToImage, type CanvasImage } from './useTextToImage';
import { AnimatedText } from './AnimatedText';
import { MediaViewer } from './MediaViewer';
import { GenerationChatPanel } from './GenerationChatPanel';

interface TextToImageProps {
  onNavigate?: (itemId: string) => void;
}

/** 根据尺寸 id 解析出用于小图标的宽高比（如 "1"、"2/3"、"16/9"） */
function getRatioForIcon(sizeId: string): string {
  const normalized = sizeId.replace(':', 'x').toLowerCase();
  if (/^\d+x\d+$/.test(normalized)) {
    const [a, b] = normalized.split('x').map(Number);
    if (a === b) return '1';
    if (a > b) return `${a}/${b}`;
    return `${a}/${b}`;
  }
  return '1';
}

/** 判断是否为横版比例（宽≥高），用于图标填满正方形容器时选哪一边为 100% */
function isLandscapeRatio(ratio: string): boolean {
  if (ratio === '1') return true;
  const parts = ratio.split('/').map(Number);
  if (parts.length !== 2) return true;
  return parts[0] >= parts[1];
}

export function TextToImage({ onNavigate }: TextToImageProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  // Canvas ref 用于恢复视频播放、聚焦等
  const canvasRef = useRef<UniversalCanvasHandle>(null);
  /** 画布容器：点击此区域外且不在输入卡内时清除图层选中 */
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  /** 输入区（图2 范围）：该区域内点击不清除选中 */
  const inputPanelRef = useRef<HTMLDivElement>(null);

  // 从业务逻辑层获取所有状态和处理函数
  const {
    // Refs
    chatEndRef,
    resizeRef,
    containerRef,
    // State
    prompt,
    setPrompt,
    workMode,
    setWorkMode,
    showHistory,
    setShowHistory,
    model,
    setModel,
    aspectRatio,
    setAspectRatio,
    quality,
    setQuality,
    qualityOptions,
    style,
    setStyle,
    styleOptions,
    outputNumber,
    setOutputNumber,
    outputNumberOptions,
    messages,
    isGenerating,
    canvasImages,
    taskPlaceholders,
    selectedImageId,
    setSelectedImageId,
    selectedImageIds,
    setSelectedImageIds,
    selectedImages,
    isDragOver,
    copiedImage,
    copiedImages,
    highlightedImageId,
    chatPanelWidth,
    isResizing,
    isChatPanelCollapsed,
    handleToggleChatPanel,
    canvasView,
    currentSessionId,
    deletingImageIds,
    addingImageIds,
    // Config
    workModes,
    models,
    aspectRatios,
    historySessions,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreHistory,
    isInitializing,
    isLoadingSession,
    // Handlers
    handleNewConversation,
    handleLoadSession,
    handleImageMove,
    handleImageResize,
    handleViewChange,
    handleAddSelectedImage,
    handleRemoveSelectedImage,
    handleCopyImage,
    handlePasteImage,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleGenerate,
    handleKeyDown,
    handleImageDoubleClick,
    handleDeleteImage,
    handleCutImage,
    handleBatchCopyImages,
    handleBatchDownloadImages,
    isDownloading,
    handleCopyImageToClipboard,
    handleResizeStart,
    handleUploadImage,
    // Utils
    cleanMessageContent,
    // Viewer
    viewerOpen,
    setViewerOpen,
    viewerIndex,
  } = useTextToImage();

  // 视图层辅助函数
  const getStatusText = (status?: string) => {
    if (!status) return '';
    return t(`textToImage.status.${status}`, { defaultValue: status });
  };

  const selectedImage = canvasImages.find(img => img.id === selectedImageId);

  // 点击画布外区域清除图层选中，不包含图2（输入区）范围；下拉/弹出层内点击也不清除
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!containerRef.current?.contains(target)) return;
      if (canvasContainerRef.current?.contains(target)) return;
      if (inputPanelRef.current?.contains(target)) return;
      if (target.closest('[data-radix-popper-content-wrapper]') ?? target.closest('[role="menu"]') ?? target.closest('[role="dialog"]')) return;
      setSelectedImageId(null);
      setSelectedImageIds([]);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [setSelectedImageId, setSelectedImageIds]);

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-3.5rem)] gap-0 animate-fade-in overflow-hidden bg-background relative">
      {/* 初始化 / 切换会话 Loading 遮罩 */}
      {(isInitializing || isLoadingSession) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <LoadingSpinner className="mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isLoadingSession ? t('textToImage.loadingSession') : t('textToImage.loadingHistory')}
            </p>
          </div>
        </div>
      )}
      {/* Left Panel - Chat Interface - Fixed height with flex layout */}
      <div 
        className={cn(
          "h-full flex flex-col border-r border-border bg-background overflow-hidden",
          // 只有在非拖动状态下才应用过渡动画
          !isResizing && "transition-all duration-300",
          isChatPanelCollapsed && "w-0 border-r-0 overflow-hidden pointer-events-none"
        )}
        style={{ width: isChatPanelCollapsed ? '0%' : `${chatPanelWidth}%`,minWidth: isChatPanelCollapsed ? 'auto' : 'min-content' }}
      >
        {/* Header Bar - Fixed at top */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          {/* Back Button + Title - Merged as single clickable component */}
          <button 
            className="flex items-center gap-1 hover:text-primary transition-colors group"
            onClick={() => {
              onNavigate?.('app-plaza');
              navigate('/');
            }}
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-base font-medium">
              {t('textToImage.title')}
            </span>
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleNewConversation}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('textToImage.actions.new')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 gap-1.5 px-2 text-xs hover:text-foreground",
                showHistory ? "text-foreground bg-muted" : "text-muted-foreground"
              )}
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="h-3.5 w-3.5" />
              {t('textToImage.history')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleToggleChatPanel}
            >
              {isChatPanelCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
              <PanelRightClose className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Chat Content Area - Scrollable middle section */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {showHistory ? (
            <div className="h-full flex flex-col overflow-hidden">
              {/* History Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <h3 className="text-sm font-medium">{t('textToImage.historyRecords')}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowHistory(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div 
                className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  // 检查是否滚动到底部（距离底部50px内）
                  if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
                    if (hasMoreHistory && !isLoadingHistory) {
                      loadMoreHistory();
                    }
                  }
                }}
              >
                <div className="space-y-1">
                  {historySessions.map((session) => (
                    <button
                      key={session.id}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                      onClick={() => handleLoadSession(session.id)}
                    >
                      <p className="text-sm font-medium truncate group-hover:text-foreground">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.timestamp.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')} · {session.assetCount} {t('textToImage.messages')}
                      </p>
                    </button>
                  ))}
                  {isLoadingHistory && (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-muted-foreground">
                        {t('textToImage.loading')}
                      </div>
                    </div>
                  )}
                  {!hasMoreHistory && historySessions.length > 0 && (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-xs text-muted-foreground">
                        {t('textToImage.allRecordsLoaded')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {t('textToImage.startConversation')}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {t('textToImage.enterDescription')}
                  </p>
                </div>
              ) : (
                <GenerationChatPanel
                  messages={messages}
                  onImageClick={(url) => {
                    const img = canvasImages.find(i => i.url === url);
                    if (img) {
                      setSelectedImageId(img.id);
                      setSelectedImageIds([img.id]);
                      canvasRef.current?.focusOnItem(img.id);
                    }
                  }}
                  onVideoClick={(url) => {
                    const img = canvasImages.find(i => i.url === url);
                    if (img) {
                      setSelectedImageId(img.id);
                      setSelectedImageIds([img.id]);
                      canvasRef.current?.focusOnItem(img.id);
                    }
                  }}
                  findCanvasItem={(url) => {
                    const img = canvasImages.find(i => i.url === url);
                    return img ? { id: img.id } : undefined;
                  }}
                  cleanMessageContent={cleanMessageContent}
                  getStatusText={getStatusText}
                  chatEndRef={chatEndRef}
                />
              )}
            </div>
          )}
        </div>

        {/* Bottom Input Area - Fixed at bottom（图2 范围：此处点击不清除画布选中） */}
        <div ref={inputPanelRef} className="border-t border-border bg-background p-4 flex-shrink-0">
          {/* Input Container with Drop Zone */}
          <div 
            className={cn(
              "relative rounded-xl border bg-muted/30 shadow-sm transition-all",
              "focus-within:ring-2 focus-within:ring-primary/20",
              isDragOver 
                ? "border-primary border-dashed bg-primary/5 ring-2 ring-primary/30" 
                : "border-border"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Selected Images Capsules - Show all selected canvas images (exclude videos) */}
            {(selectedImageIds.length > 0 || selectedImageId) && (() => {
              // Helper function to check if an item is a video
              const isVideo = (item: CanvasImage): boolean => {
                if (item.type === 'video') return true;
                // Check URL extension if type is not set
                return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(item.url);
              };
              
              // Get all selected images from canvas, filter out videos
              const imagesToDisplay = selectedImageIds.length > 0
                ? selectedImageIds
                    .map(id => canvasImages.find(img => img.id === id))
                    .filter((img): img is CanvasImage => img !== undefined && !isVideo(img))
                    .map(img => ({
                      id: img.id,
                      url: img.url,
                      prompt: img.prompt,
                    } as SelectedImage))
                : selectedImageId
                  ? (() => {
                      const img = canvasImages.find(img => img.id === selectedImageId);
                      // 如果是视频类型，不显示 ImageCapsule
                      if (img && isVideo(img)) {
                        return [];
                      }
                      return img ? [{
                        id: img.id,
                        url: img.url,
                        prompt: img.prompt,
                      } as SelectedImage] : [];
                    })()
                  : [];
              
              if (imagesToDisplay.length === 0) return null;
              
              return (
              <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-1">
                  {imagesToDisplay.map((image) => (
                  <ImageCapsule
                      key={image.id}
                      image={image}
                      onRemove={(id) => {
                        // Remove from selectedImages if it exists there
                        handleRemoveSelectedImage(id);
                        // Remove from selectedImageIds
                        const newIds = selectedImageIds.filter(selectedId => selectedId !== id);
                        setSelectedImageIds(newIds);
                        // Clear selectedImageId if it's the removed one
                        if (id === selectedImageId) {
                          setSelectedImageId(newIds.length > 0 ? newIds[0] : null);
                        }
                      }}
                  />
                ))}
              </div>
              );
            })()}
            
            {!currentSessionId ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl" />
                  <MessageSquare className="relative h-12 w-12 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('textToImage.createSessionFirst')}
                </p>
                <p className="text-xs text-muted-foreground/70 mb-6">
                  {t('textToImage.createSessionToStart')}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNewConversation}
                  className="gap-2 shadow-sm hover:shadow transition-shadow"
                >
                  <Plus className="h-4 w-4" />
                  {t('textToImage.newSession')}
                </Button>
              </div>
            ) : (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('textToImage.describeImage')}
              rows={2}
              className={cn(
                "w-full resize-none border-0 bg-transparent px-4 text-sm placeholder:text-muted-foreground focus:outline-none",
                  (selectedImageId || selectedImageIds.length > 0) ? "pt-2 pb-3" : "py-3"
              )}
            />
            )}
            
            {/* Bottom toolbar：图2 风格 - 模型 + 设置 Popover（宽高比网格 + 输出数量）+ 添加 + 发送 */}
            <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
              <div className="flex items-center gap-2">
                {/* Model Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {t(`textToImage.modelNames.${model}`, { defaultValue: models.find(m => m.id === model)?.label })}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    {models.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={cn(model === m.id && 'bg-accent')}
                      >
                        {t(`textToImage.modelNames.${m.id}`, { defaultValue: m.label })}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings Popover - Mac 风格：毛玻璃、柔和阴影、分段式选项 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    >
                      <RatioIcon className="h-3.5 w-3.5" />
                      <span>{aspectRatio}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    align="center" 
                    side="top-end"
                    className={cn(
                      "ml-[68px] w-[450px] p-0 rounded-2xl border-0",
                      "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl",
                      "shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.08)]",
                      "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.4)]"
                    )}
                  >
                    <div className="p-4 space-y-5">
                      {/* 宽高比 - 网格卡片，选中为浅蓝高亮（Mac 蓝） */}
                      <div>
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                          {t('textToImage.aspectRatio')}
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          {aspectRatios.map((ar) => {
                            const ratio = getRatioForIcon(ar.id);
                            const isSelected = aspectRatio === ar.id;
                            const fillByWidth = isLandscapeRatio(ratio);
                            return (
                              <button
                                key={ar.id}
                                type="button"
                                onClick={() => setAspectRatio(ar.id)}
                                className={cn(
                                  "flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-200",
                                  isSelected
                                    ? "bg-blue-500/10 dark:bg-blue-400/15 ring-1 ring-blue-500/25 dark:ring-blue-400/30 text-foreground"
                                    : "bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {/* 固定正方形容器，图标用显式宽/高填满并保持比例（避免 w-auto h-auto 坍缩为 0） */}
                                <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden rounded-[4px]">
                                  <div
                                    className={cn(
                                      "rounded-[4px] transition-colors",
                                      isSelected ? "bg-blue-500/40 dark:bg-blue-400/50" : "bg-black/20 dark:bg-white/20"
                                    )}
                                    style={{
                                      aspectRatio: ratio,
                                      ...(fillByWidth
                                        ? { width: '100%', height: 'auto', maxHeight: '100%' }
                                        : { height: '100%', width: 'auto', maxWidth: '100%' }),
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium truncate w-full text-center tabular-nums">{ar.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* 质量 - 左右滑块选中动画 */}
                      {qualityOptions.length > 0 && (() => {
                        const qualityIndex = qualityOptions.findIndex((q) => q.id === quality);
                        const n = qualityOptions.length;
                        return (
                          <div>
                            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                              {t('textToImage.quality')}
                            </p>
                            <div className="relative flex p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] w-full">
                              <div
                                className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-white/10 shadow-sm transition-[left] duration-200 ease-out"
                                style={{
                                  left: `calc(${qualityIndex} * (100% - 8px) / ${n} + 4px)`,
                                  width: `calc((100% - 8px) / ${n} - 0px)`,
                                }}
                              />
                              {qualityOptions.map((q) => (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => setQuality(q.id)}
                                  className={cn(
                                    "relative z-10 flex-1 min-w-0 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                                    quality === q.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {q.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {/* 风格 - 左右滑块选中动画 */}
                      {styleOptions.length > 0 && (() => {
                        const styleIndex = styleOptions.findIndex((s) => s.id === style);
                        const n = styleOptions.length;
                        return (
                          <div>
                            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                              {t('textToImage.style')}
                            </p>
                            <div className="relative flex p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] w-full">
                              <div
                                className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-white/10 shadow-sm transition-[left] duration-200 ease-out"
                                style={{
                                  left: `calc(${styleIndex} * (100% - 8px) / ${n} + 4px)`,
                                  width: `calc((100% - 8px) / ${n} - 0px)`,
                                }}
                              />
                              {styleOptions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setStyle(s.id)}
                                  className={cn(
                                    "relative z-10 flex-1 min-w-0 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                                    style === s.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {/* 输出数量：1、2、3、4 张 */}
                      <div>
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                          {t('textToImage.outputNumber')}
                        </p>
                        <div className="relative flex p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] w-full">
                          <div
                            className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-white/10 shadow-sm transition-[left] duration-200 ease-out pointer-events-none"
                            style={{
                              left: `calc(${outputNumberOptions.indexOf(outputNumber)} * (100% - 8px) / ${outputNumberOptions.length} + 4px)`,
                              width: `calc((100% - 8px) / ${outputNumberOptions.length} - 0px)`,
                            }}
                          />
                          {outputNumberOptions.map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setOutputNumber(num)}
                              className={cn(
                                "relative z-10 flex-1 min-w-0 py-2 rounded-lg text-sm font-medium transition-colors duration-200 tabular-nums",
                                outputNumber === num ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Add Button - Upload Image */}
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const fileList = e.target.files;
                      if (fileList?.length) {
                        for (let i = 0; i < fileList.length; i++) {
                          handleUploadImage(fileList[i]);
                        }
                        e.target.value = '';
                      }
                    }}
                  />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    asChild
                >
                    <span>
                  <Plus className="h-3.5 w-3.5" />
                  {t('textToImage.actions.add')}
                    </span>
                </Button>
                </label>
              </div>
              
              {/* Send Button */}
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={handleGenerate}
                disabled={!currentSessionId || !prompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <LoadingSpinner size="sm" className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Footer note */}
          <p className="mt-2 text-center text-xs text-muted-foreground/70">
            {t('textToImage.footerNote')}
          </p>
        </div>
      </div>

      {/* Resize Handle */}
      {!isChatPanelCollapsed && (
        <div
          ref={resizeRef}
          onMouseDown={handleResizeStart}
          className={cn(
            "w-[1px] cursor-col-resize bg-border hover:bg-primary/50 transition-colors flex-shrink-0",
            isResizing && "bg-primary"
          )}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Right Panel - Infinite Canvas（画布区域：仅此处点击空白由 canvas 内部处理清除选中） */}
      <div 
        ref={canvasContainerRef}
        className={cn(
          "relative flex flex-col bg-muted/20",
          // 只有在非拖动状态下才应用过渡动画
          !isResizing && "transition-all duration-300"
        )}
        style={{ width: isChatPanelCollapsed ? '100%' : `${100 - chatPanelWidth}%` }}
      >
        {/* Expand Button - Show when chat panel is collapsed */}
        {isChatPanelCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4 z-20 h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground bg-background/90 backdrop-blur-sm shadow-sm"
            onClick={handleToggleChatPanel}
          >
            <ChevronRight className="h-3.5 w-3.5" />
            {t('textToImage.actions.expand')}
          </Button>
        )}

        <UniversalCanvas
          ref={canvasRef}
          items={[...canvasImages, ...taskPlaceholders].map(img => ({ ...img, type: img.type || 'image' } as CanvasMediaItem))}
          onItemMove={handleImageMove}
          onItemResize={handleImageResize}
          onViewChange={handleViewChange}
          initialZoom={canvasView.zoom}
          initialPan={canvasView.pan}
          onItemSelect={setSelectedImageId}
          onItemMultiSelect={setSelectedImageIds}
          selectedItemId={selectedImageId}
          selectedItemIds={selectedImageIds}
          onItemDragStart={() => {
            // Optional: could show visual feedback when drag starts
          }}
          onItemDoubleClick={handleImageDoubleClick}
          highlightedItemId={highlightedImageId}
          deletingItemIds={Array.from(deletingImageIds)}
          onContextCopy={() => {
            if (selectedImageIds.length > 1) handleBatchCopyImages();
            else if (selectedImageIds.length === 1) handleBatchCopyImages();
            else if (selectedImage) handleCopyImage(selectedImage);
          }}
          onContextCut={handleCutImage}
          onContextPaste={handlePasteImage}
          onContextDelete={handleDeleteImage}
          onContextDownload={handleBatchDownloadImages}
          onContextFocus={() => {
            if (selectedImageIds.length > 1) canvasRef.current?.focusOnItems(selectedImageIds);
            else if (selectedImageId) canvasRef.current?.focusOnItem(selectedImageId);
          }}
        />

        {/* Selected Image(s) Floating Toolbar */}
        {(selectedImage || selectedImageIds.length > 0) && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm" style={{zIndex:999}}>
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">
              {selectedImageIds.length > 1 
                ? `${t('textToImage.selected')} ${selectedImageIds.length} ${t('textToImage.items')}`
                : selectedImage?.prompt ? cleanMessageContent(selectedImage.prompt) : ''}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={selectedImageIds.length > 1 ? handleBatchCopyImages : () => selectedImage && handleCopyImage(selectedImage)}
              title={selectedImageIds.length > 1 ? t('textToImage.actions.copyAll') : t('textToImage.actions.copy')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={handleBatchDownloadImages}
              disabled={isDownloading}
              title={selectedImageIds.length > 1 ? t('textToImage.actions.downloadAll') : t('textToImage.actions.download')}
            >
              {isDownloading ? <LoadingSpinner size="sm" className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
              onClick={handleDeleteImage}
              title={selectedImageIds.length > 1 ? t('textToImage.actions.deleteAll') : t('textToImage.actions.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Image Count Badge */}
        <Badge 
          variant="secondary" 
          className="absolute right-4 top-4 shadow-sm"
        >
          {canvasImages.length + taskPlaceholders.length} {t('textToImage.items')}
        </Badge>
      </div>

      {/* Media Viewer */}
      <MediaViewer
        items={canvasImages.map(img => ({
          id: img.id,
          url: img.url,
          type: (img.type === 'video' || img.url.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i)) ? 'video' as const : 'image' as const,
          prompt: img.prompt,
        }))}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          // 恢复视频播放状态
          canvasRef.current?.resumeVideos();
        }}
      />
    </div>
  );
}
