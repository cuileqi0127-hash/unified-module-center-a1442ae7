import { 
  Download, 
  Loader2,
  Send,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Clock,
  PanelRightClose,
  MessageSquare,
  VideoIcon,
  RatioIcon,
  X,
  Copy,
  Trash2,
  LayoutGrid,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { UniversalCanvas, type CanvasMediaItem, type UniversalCanvasHandle } from './UniversalCanvas';
import { ImageCapsule, type SelectedImage } from './ImageCapsule';
import { useTextToVideo, type CanvasVideo } from './useTextToVideo';
import { modelSupportsEnhanceSwitch, getModelVersion } from './textToVideoConfig';
import type { VideoModel } from '@/services/videoGenerationApi';
import { AnimatedText } from './AnimatedText';
import { MediaViewer } from './MediaViewer';
import { GenerationChatPanel } from './GenerationChatPanel';

interface TextToVideoProps {
  onNavigate?: (itemId: string) => void;
}

/** 根据尺寸 id 解析出用于小图标的宽高比（如 "1"、"16/9"） */
function getRatioForIcon(sizeId: string): string {
  const normalized = sizeId.replace(':', 'x').toLowerCase();
  if (/^\d+x\d+$/.test(normalized)) {
    const [a, b] = normalized.split('x').map(Number);
    if (a === b) return '1';
    return `${a}/${b}`;
  }
  return '1';
}

/** 判断是否为横版比例（宽≥高） */
function isLandscapeRatio(ratio: string): boolean {
  if (ratio === '1') return true;
  const parts = ratio.split('/').map(Number);
  if (parts.length !== 2) return true;
  return parts[0] >= parts[1];
}

export function TextToVideo({ onNavigate }: TextToVideoProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  // Canvas ref 用于恢复视频播放、聚焦等
  const canvasRef = useRef<UniversalCanvasHandle>(null);
  /** 画布容器：点击此区域外且不在输入卡内时清除图层选中 */
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  /** 输入区（图1 范围）：该区域内点击不清除选中 */
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
    seconds,
    setSeconds,
    size,
    setSize,
    resolution,
    setResolution,
    enhanceSwitch,
    setEnhanceSwitch,
    messages,
    isGenerating,
    canvasVideos,
    taskPlaceholders,
    selectedVideoId,
    setSelectedVideoId,
    selectedVideoIds,
    setSelectedVideoIds,
    selectedImages,
    isDragOver,
    copiedVideo,
    copiedVideos,
    highlightedVideoId,
    chatPanelWidth,
    isResizing,
    isChatPanelCollapsed,
    handleToggleChatPanel,
    canvasView,
    currentSessionId,
    deletingVideoIds,
    addingVideoIds,
    // Config
    models,
    secondsOptions,
    sizesOptions,
    resolutionOptions,
    enhanceSwitchSupported,
    historySessions,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreHistory,
    isInitializing,
    // Handlers
    handleNewConversation,
    handleLoadSession,
    handleVideoMove,
    handleVideoResize,
    handleViewChange,
    handleAddSelectedVideo,
    handleRemoveSelectedVideo,
    handleCopyVideo,
    handlePasteVideo,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleGenerate,
    handleKeyDown,
    handleVideoDoubleClick,
    handleDeleteVideo,
    handleCutVideo,
    handleBatchCopyVideos,
    handleBatchDownloadVideos,
    isDownloading,
    handleResizeStart,
    handleUploadImage,
    // Utils
    cleanMessageContent,
    // Viewer
    viewerOpen,
    setViewerOpen,
    viewerIndex,
  } = useTextToVideo();

  // 视图层辅助函数
  const getStatusText = (status?: string) => {
    if (!status) return '';
    return t(`textToVideo.status.${status}`, { defaultValue: status });
  };

  const selectedVideo = canvasVideos.find(v => v.id === selectedVideoId);

  // 点击画布外区域清除图层选中，不包含图1（输入区）范围；下拉/弹出层内点击也不清除
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!containerRef.current?.contains(target)) return;
      if (canvasContainerRef.current?.contains(target)) return;
      if (inputPanelRef.current?.contains(target)) return;
      if (target.closest('[data-radix-popper-content-wrapper]') ?? target.closest('[role="menu"]') ?? target.closest('[role="dialog"]')) return;
      setSelectedVideoId(null);
      setSelectedVideoIds([]);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [setSelectedVideoId, setSelectedVideoIds]);

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-3.5rem)] gap-0 animate-fade-in overflow-hidden bg-background relative">
      {/* 初始化 Loading 遮罩 */}
      {isInitializing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('textToVideo.loadingHistory')}
            </p>
          </div>
        </div>
      )}
      {/* Left Panel - Chat Interface */}
      <div 
        className={cn(
          "h-full flex flex-col border-r border-border bg-background overflow-hidden",
          // 只有在非拖动状态下才应用过渡动画
          !isResizing && "transition-all duration-300",
          isChatPanelCollapsed && "w-0 border-r-0 overflow-hidden pointer-events-none"
        )}
        style={{ width: isChatPanelCollapsed ? '0%' : `${chatPanelWidth}%`,minWidth: isChatPanelCollapsed ? 'auto' : 'min-content' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          <button 
            className="flex items-center gap-1 hover:text-primary transition-colors group"
            onClick={() => {
              onNavigate?.('app-plaza');
              navigate('/');
            }}
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-base font-medium">
              {t('textToVideo.title')}
            </span>
          </button>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleNewConversation}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('textToVideo.actions.new')}
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
              {t('textToVideo.history')}
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
                <h3 className="text-sm font-medium">{t('textToVideo.historyRecords')}</h3>
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
                        {session.timestamp.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')} · {session.assetCount} {t('textToVideo.messages')}
                      </p>
                    </button>
                  ))}
                  {isLoadingHistory && (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-muted-foreground">
                        {t('textToVideo.loading')}
                      </div>
                    </div>
                  )}
                  {!hasMoreHistory && historySessions.length > 0 && (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-xs text-muted-foreground">
                        {t('textToVideo.allRecordsLoaded')}
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
                  <VideoIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {t('textToVideo.startConversation')}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {t('textToVideo.enterDescription')}
                  </p>
                </div>
              ) : (
                <GenerationChatPanel
                  messages={messages}
                  onImageClick={(url) => {
                    const video = canvasVideos.find(v => v.url === url);
                    if (video) {
                      setSelectedVideoId(video.id);
                      setSelectedVideoIds([video.id]);
                      canvasRef.current?.focusOnItem(video.id);
                    }
                  }}
                  onVideoClick={(url) => {
                    const video = canvasVideos.find(v => v.url === url);
                    if (video) {
                      setSelectedVideoId(video.id);
                      setSelectedVideoIds([video.id]);
                      canvasRef.current?.focusOnItem(video.id);
                    }
                  }}
                  findCanvasItem={(url) => {
                    const video = canvasVideos.find(v => v.url === url);
                    return video ? { id: video.id } : undefined;
                  }}
                  cleanMessageContent={cleanMessageContent}
                  getStatusText={getStatusText}
                  chatEndRef={chatEndRef}
                />
              )}
            </div>
          )}
        </div>

        {/* Bottom Input Area（图1 范围：此处点击不清除画布选中） */}
        <div ref={inputPanelRef} className="border-t border-border bg-background p-4 flex-shrink-0">
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
            {/* Selected Videos Capsules - Only show images, not videos */}
            {(selectedVideoIds.length > 0 || selectedVideoId) && (() => {
              // Helper function to check if an item is a video
              const isVideo = (item: CanvasVideo): boolean => {
                if (item.type === 'video' || item.type === 'placeholder') return true;
                // Check URL extension if type is not set
                return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(item.url);
              };
              
              // Filter out videos, only show images
              const imagesToDisplay = selectedVideoIds.length > 0
                ? selectedVideoIds
                    .map(id => canvasVideos.find(v => v.id === id))
                    .filter((v): v is CanvasVideo => v !== undefined && !isVideo(v))
                    .map(v => ({
                      id: v.id,
                      url: v.url,
                      prompt: v.prompt,
                    } as SelectedImage))
                : selectedVideoId
                  ? (() => {
                      const v = canvasVideos.find(v => v.id === selectedVideoId);
                      // 如果是视频类型，不显示 ImageCapsule
                      if (v && isVideo(v)) {
                        return [];
                      }
                      return v ? [{
                        id: v.id,
                        url: v.url,
                        prompt: v.prompt,
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
                        handleRemoveSelectedVideo(id);
                        const newIds = selectedVideoIds.filter(selectedId => selectedId !== id);
                        setSelectedVideoIds(newIds);
                        if (id === selectedVideoId) {
                          setSelectedVideoId(newIds.length > 0 ? newIds[0] : null);
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
                  {t('textToVideo.createSessionFirst')}
                </p>
                <p className="text-xs text-muted-foreground/70 mb-6">
                  {t('textToVideo.createSessionToStart')}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNewConversation}
                  className="gap-2 shadow-sm hover:shadow transition-shadow"
                >
                  <Plus className="h-4 w-4" />
                  {t('textToVideo.newSession')}
                </Button>
              </div>
            ) : (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('textToVideo.describeVideo')}
                rows={2}
                className={cn(
                  "w-full resize-none border-0 bg-transparent px-4 text-sm placeholder:text-muted-foreground focus:outline-none",
                  (selectedVideoId || selectedVideoIds.length > 0) ? "pt-2 pb-3" : "py-3"
                )}
              />
            )}
            
            {/* Bottom toolbar：与文生图一致 - 模型 + 设置 Popover（时长 + 尺寸网格） */}
            <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
              <div className="flex items-center gap-2">
                {/* Model Dropdown - 二级联动：模型 + 是否增强（标准版/高清版） */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    >
                      <VideoIcon className="h-3.5 w-3.5" />
                      {t(`textToVideo.modelNames.${model}`, { defaultValue: models.find(m => m.id === model)?.label })} {getModelVersion(model as VideoModel)}
                      {enhanceSwitchSupported && enhanceSwitch === 'Enabled' && (
                        <span className="opacity-80">| {t('textToVideo.hdVersion')}</span>
                      )}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[160px]">
                    {models.map((m) => {
                      const supportsEnhance = modelSupportsEnhanceSwitch(m.id as VideoModel);
                      const isSelected = model === m.id;
                      const isSelectedStandard = isSelected && enhanceSwitch === 'Disabled';
                      const isSelectedHd = isSelected && enhanceSwitch === 'Enabled';
                      if (supportsEnhance) {
                        const modelLabel = `${t(`textToVideo.modelNames.${m.id}`, { defaultValue: m.label })} ${getModelVersion(m.id as VideoModel)}`;
                        return (
                          <DropdownMenuSub key={m.id}>
                            <DropdownMenuSubTrigger className={cn(isSelected && 'bg-accent')}>
                              {modelLabel}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={() => {
                                  setModel(m.id as VideoModel);
                                  setEnhanceSwitch('Disabled');
                                }}
                                className={cn(isSelectedStandard && 'bg-accent')}
                              >
                                {modelLabel}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setModel(m.id as VideoModel);
                                  setEnhanceSwitch('Enabled');
                                }}
                                className={cn(isSelectedHd && 'bg-accent')}
                              >
                                {modelLabel} | {t('textToVideo.hdVersion')}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        );
                      }
                      const modelLabel = `${t(`textToVideo.modelNames.${m.id}`, { defaultValue: m.label })} ${getModelVersion(m.id as VideoModel)}`;
                      return (
                        <DropdownMenuItem
                          key={m.id}
                          onClick={() => {
                            setModel(m.id as VideoModel);
                            setEnhanceSwitch('Disabled');
                          }}
                          className={cn(isSelected && 'bg-accent')}
                        >
                          {modelLabel}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings Popover - Mac 风格：时长分段 + 尺寸网格（参考文生图） */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{seconds}s</span>
                      <span className="opacity-60">·</span>
                      <RatioIcon className="h-3.5 w-3.5" />
                      <span>{size}</span>
                      {resolutionOptions.length > 0 && (
                        <>
                          <span className="opacity-60">·</span>
                          <span>{resolution}</span>
                        </>
                      )}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    align="center" 
                    side="top-end"
                    className={cn(
                      "ml-[80px] min-w-[340px] p-0 rounded-2xl border-0",
                      "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl",
                      "shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.08)]",
                      "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.4)]"
                    )}
                  >
                    <div className="p-4 space-y-5">
                      {/* 时长 - 左右滑块选中动画 */}
                      <div>
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                          {t('textToVideo.seconds')}
                        </p>
                        <div className="relative flex p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] w-full">
                          <div
                            className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-white/10 shadow-sm transition-[left] duration-200 ease-out"
                            style={{
                              left: `calc(${secondsOptions.indexOf(seconds)} * (100% - 8px) / ${secondsOptions.length} + 4px)`,
                              width: `calc((100% - 8px) / ${secondsOptions.length} - 0px)`,
                            }}
                          />
                          {secondsOptions.map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setSeconds(sec)}
                              className={cn(
                                "relative z-10 flex-1 min-w-0 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200",
                                seconds === sec ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 尺寸 - 网格 + 比例图标（与文生图一致） */}
                      <div>
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                          {t('textToVideo.size')}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {sizesOptions.map((sz) => {
                            const ratio = getRatioForIcon(sz);
                            const isSelected = size === sz;
                            const fillByWidth = isLandscapeRatio(ratio);
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => setSize(sz)}
                                className={cn(
                                  "flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-200",
                                  isSelected
                                    ? "bg-blue-500/10 dark:bg-blue-400/15 ring-1 ring-blue-500/25 dark:ring-blue-400/30 text-foreground"
                                    : "bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-muted-foreground hover:text-foreground"
                                )}
                              >
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
                                <span className="text-[10px] font-medium truncate w-full text-center tabular-nums">{sz}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* 分辨率 - 720P / 1080P（多选项时展示） */}
                      {resolutionOptions.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                            {t('textToVideo.resolution')}
                          </p>
                          <div className="relative flex p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] w-full">
                            <div
                              className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-white/10 shadow-sm transition-[left] duration-200 ease-out"
                              style={{
                                left: `calc(${Math.max(0, resolutionOptions.indexOf(resolution))} * (100% - 8px) / ${resolutionOptions.length} + 4px)`,
                                width: `calc((100% - 8px) / ${resolutionOptions.length} - 0px)`,
                              }}
                            />
                            {resolutionOptions.map((res) => (
                              <button
                                key={res}
                                type="button"
                                onClick={() => setResolution(res)}
                                className={cn(
                                  "relative z-10 flex-1 min-w-0 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                                  resolution === res ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* 是否增强（仅 Sora 2、海螺 支持） */}
                      {/* {enhanceSwitchSupported && (
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                            {t('textToVideo.enhanceSwitch', { defaultValue: '是否增强' })}
                          </p>
                          <Switch
                            checked={enhanceSwitch}
                            onCheckedChange={setEnhanceSwitch}
                          />
                        </div>
                      )} */}
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
                      {t('textToVideo.actions.add')}
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
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Footer note */}
          <p className="mt-2 text-center text-xs text-muted-foreground/70">
            {t('textToVideo.footerNote')}
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

      {/* Right Panel - Video Canvas（画布区域：仅此处点击空白由 canvas 内部处理清除选中） */}
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
            {t('textToVideo.actions.expand')}
          </Button>
        )}

        <UniversalCanvas
          ref={canvasRef}
          items={[
            ...canvasVideos.map(v => ({ ...v, type: v.type || (v.url.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i) ? 'video' : 'image') } as CanvasMediaItem)),
            ...taskPlaceholders.map(p => ({ ...p } as CanvasMediaItem)),
          ]}
          onItemMove={handleVideoMove}
          onItemResize={handleVideoResize}
          onViewChange={handleViewChange}
          initialZoom={canvasView.zoom}
          initialPan={canvasView.pan}
          onItemSelect={setSelectedVideoId}
          onItemMultiSelect={setSelectedVideoIds}
          selectedItemId={selectedVideoId}
          selectedItemIds={selectedVideoIds}
          onItemDragStart={() => {}}
          onItemDoubleClick={handleVideoDoubleClick}
          highlightedItemId={highlightedVideoId}
          deletingItemIds={Array.from(deletingVideoIds)}
          onContextCopy={() => {
            if (selectedVideoIds.length > 1) handleBatchCopyVideos();
            else if (selectedVideoIds.length === 1) handleBatchCopyVideos();
            else if (selectedVideo) handleCopyVideo(selectedVideo);
          }}
          onContextCut={handleCutVideo}
          onContextPaste={handlePasteVideo}
          onContextDelete={handleDeleteVideo}
          onContextDownload={handleBatchDownloadVideos}
          onContextFocus={() => {
            if (selectedVideoIds.length > 1) canvasRef.current?.focusOnItems(selectedVideoIds);
            else if (selectedVideoId) canvasRef.current?.focusOnItem(selectedVideoId);
          }}
        />

        {/* Selected Video(s) Floating Toolbar */}
        {(selectedVideo || selectedVideoIds.length > 0) && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm" style={{zIndex:999}}>
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">
              {selectedVideoIds.length > 1 
                ? `${t('textToVideo.selected')} ${selectedVideoIds.length} ${t('textToVideo.items')}`
                : selectedVideo?.prompt ? cleanMessageContent(selectedVideo.prompt) : ''}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={selectedVideoIds.length > 1 ? handleBatchCopyVideos : () => selectedVideo && handleCopyVideo(selectedVideo)}
              title={selectedVideoIds.length > 1 ? t('textToVideo.actions.copyAll') : t('textToVideo.actions.copy')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={handleBatchDownloadVideos}
              disabled={isDownloading}
              title={selectedVideoIds.length > 1 ? t('textToVideo.actions.downloadAll') : t('textToVideo.actions.download')}
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
              onClick={handleDeleteVideo}
              title={selectedVideoIds.length > 1 ? t('textToVideo.actions.deleteAll') : t('textToVideo.actions.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Video Count Badge */}
        <Badge 
          variant="secondary" 
          className="absolute right-4 top-4 shadow-sm"
        >
          {canvasVideos.length} {t('textToVideo.items')}
        </Badge>
      </div>

      {/* Media Viewer */}
      <MediaViewer
        items={canvasVideos
          .filter(v => v.type !== 'placeholder' && v.url) // 只包含非占位符且有URL的项目
          .map(v => ({
            id: v.id,
            url: v.url,
            type: (v.type === 'video' || v.url.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i)) ? 'video' as const : 'image' as const,
            prompt: v.prompt,
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
