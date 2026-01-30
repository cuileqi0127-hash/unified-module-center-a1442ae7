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
  VideoIcon,
  RatioIcon,
  X,
  Copy,
  Clipboard,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { UniversalCanvas, type CanvasMediaItem } from './UniversalCanvas';
import { ImageCapsule, type SelectedImage } from './ImageCapsule';
import { useTextToVideo, type CanvasVideo } from './useTextToVideo';
import { AnimatedText } from './AnimatedText';
import { MediaViewer } from './MediaViewer';
import { GenerationChatPanel } from './GenerationChatPanel';

interface TextToVideoProps {
  onNavigate?: (itemId: string) => void;
}

export function TextToVideo({ onNavigate }: TextToVideoProps) {
  const navigate = useNavigate();
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
    handleBatchCopyVideos,
    handleBatchDownloadVideos,
    handleResizeStart,
    handleUploadImage,
    // Utils
    cleanMessageContent,
    isZh,
    // Viewer
    viewerOpen,
    setViewerOpen,
    viewerIndex,
  } = useTextToVideo();

  // 视图层辅助函数
  const getStatusText = (status?: string) => {
    if (!status) return '';
    const statusMap: Record<string, { zh: string; en: string }> = {
      queued: { zh: '排队中...', en: 'Queued...' },
      processing: { zh: '生成中...', en: 'Processing...' },
      completed: { zh: '已完成', en: 'Completed' },
      failed: { zh: '生成失败', en: 'Failed' },
    };
    return statusMap[status]?.[isZh ? 'zh' : 'en'] || status;
  };

  const selectedVideo = canvasVideos.find(v => v.id === selectedVideoId);

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-3.5rem)] gap-0 animate-fade-in overflow-hidden bg-background relative">
      {/* 初始化 Loading 遮罩 */}
      {isInitializing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isZh ? '正在加载历史记录...' : 'Loading history...'}
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
        style={{ width: isChatPanelCollapsed ? '0%' : `${chatPanelWidth}%` }}
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
              {isZh ? '文生视频' : 'Text to Video'}
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
              {isZh ? '新建' : 'New'}
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
              {isZh ? '历史' : 'History'}
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
                <h3 className="text-sm font-medium">{isZh ? '历史记录' : 'History'}</h3>
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
                        {session.timestamp.toLocaleDateString(isZh ? 'zh-CN' : 'en-US')} · {session.messageCount} {isZh ? '条消息' : 'messages'}
                      </p>
                    </button>
                  ))}
                  {isLoadingHistory && (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-muted-foreground">
                        {isZh ? '加载中...' : 'Loading...'}
                      </div>
                    </div>
                  )}
                  {!hasMoreHistory && historySessions.length > 0 && (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-xs text-muted-foreground">
                        {isZh ? '已加载全部记录' : 'All records loaded'}
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
                    {isZh ? '开始一个新的对话' : 'Start a new conversation'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {isZh ? '输入描述来生成视频' : 'Enter a description to generate videos'}
                  </p>
                </div>
              ) : (
                <GenerationChatPanel
                  messages={messages}
                  isZh={isZh}
                  onImageClick={(url) => {
                    const video = canvasVideos.find(v => v.url === url);
                    if (video) setSelectedVideoId(video.id);
                  }}
                  onVideoClick={(url) => {
                    const video = canvasVideos.find(v => v.url === url);
                    if (video) setSelectedVideoId(video.id);
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

        {/* Bottom Input Area */}
        <div className="border-t border-border bg-background p-4 flex-shrink-0">
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
            {/* Selected Videos Capsules */}
            {(selectedVideoIds.length > 0 || selectedVideoId) && (() => {
              const videosToDisplay = selectedVideoIds.length > 0
                ? selectedVideoIds
                    .map(id => canvasVideos.find(v => v.id === id))
                    .filter((v): v is CanvasVideo => v !== undefined)
                    .map(v => ({
                      id: v.id,
                      url: v.url,
                      prompt: v.prompt,
                    } as SelectedImage))
                : selectedVideoId
                  ? (() => {
                      const v = canvasVideos.find(v => v.id === selectedVideoId);
                      return v ? [{
                        id: v.id,
                        url: v.url,
                        prompt: v.prompt,
                      } as SelectedImage] : [];
                    })()
                  : [];
              
              if (videosToDisplay.length === 0) return null;
              
              return (
              <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-1">
                  {videosToDisplay.map((image) => (
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
                  {isZh ? '请先创建新会话' : 'Please create a new session first'}
                </p>
                <p className="text-xs text-muted-foreground/70 mb-6">
                  {isZh ? '创建会话后即可开始生成视频' : 'Create a session to start generating videos'}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNewConversation}
                  className="gap-2 shadow-sm hover:shadow transition-shadow"
                >
                  <Plus className="h-4 w-4" />
                  {isZh ? '新建会话' : 'New Session'}
                </Button>
              </div>
            ) : (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isZh ? '描述您想要生成的视频...' : 'Describe the video you want to generate...'}
                rows={2}
                className={cn(
                  "w-full resize-none border-0 bg-transparent px-4 text-sm placeholder:text-muted-foreground focus:outline-none",
                  (selectedVideoId || selectedVideoIds.length > 0) ? "pt-2 pb-3" : "py-3"
                )}
              />
            )}
            
            {/* Bottom toolbar */}
            <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
              <div className="flex items-center gap-2">
                {/* Model Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <VideoIcon className="h-3.5 w-3.5" />
                      {models.find(m => m.id === model)?.label}
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
                        {m.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Seconds Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {seconds}s
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {secondsOptions.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => setSeconds(s)}
                        className={cn(seconds === s && 'bg-accent')}
                      >
                        {s}s
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Size Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <RatioIcon className="h-3.5 w-3.5" />
                      {size}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {sizesOptions.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => setSize(s)}
                        className={cn(size === s && 'bg-accent')}
                      >
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Add Button - Upload Image */}
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadImage(file);
                        // Reset input to allow selecting the same file again
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
                      {isZh ? '添加' : 'Add'}
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
            {isZh ? '请使用有权素材，并合法使用生成结果' : 'Please use authorized materials and use results legally'}
          </p>
        </div>
      </div>

      {/* Resize Handle */}
      {!isChatPanelCollapsed && (
        <div
          ref={resizeRef}
          onMouseDown={handleResizeStart}
          className={cn(
            "w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors flex-shrink-0",
            isResizing && "bg-primary"
          )}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Right Panel - Video Canvas */}
      <div 
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
            {isZh ? '展开' : 'Expand'}
          </Button>
        )}

        <UniversalCanvas
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
        />

        {/* Selected Video(s) Floating Toolbar */}
        {(selectedVideo || selectedVideoIds.length > 0) && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm" style={{zIndex:999}}>
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">
              {selectedVideoIds.length > 1 
                ? isZh ? `已选择 ${selectedVideoIds.length} 个视频` : `${selectedVideoIds.length} videos selected`
                : selectedVideo?.prompt ? cleanMessageContent(selectedVideo.prompt) : ''}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={selectedVideoIds.length > 1 ? handleBatchCopyVideos : () => selectedVideo && handleCopyVideo(selectedVideo)}
              title={isZh ? (selectedVideoIds.length > 1 ? '批量复制' : '复制') : (selectedVideoIds.length > 1 ? 'Copy All' : 'Copy')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={handleBatchDownloadVideos}
              title={isZh ? (selectedVideoIds.length > 1 ? '批量下载' : '下载') : (selectedVideoIds.length > 1 ? 'Download All' : 'Download')}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
              onClick={handleDeleteVideo}
              title={isZh ? (selectedVideoIds.length > 1 ? '批量删除' : '删除') : (selectedVideoIds.length > 1 ? 'Delete All' : 'Delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Paste Button */}
        {(copiedVideo || copiedVideos.length > 0) && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute left-4 top-4 gap-1.5 shadow-sm"
            onClick={handlePasteVideo}
          >
            <Clipboard className="h-4 w-4" />
            {isZh 
              ? (copiedVideos.length > 0 ? `粘贴 ${copiedVideos.length} 个项目` : '粘贴视频')
              : (copiedVideos.length > 0 ? `Paste ${copiedVideos.length} items` : 'Paste Video')
            }
          </Button>
        )}

        {/* Video Count Badge */}
        <Badge 
          variant="secondary" 
          className="absolute right-4 top-4 shadow-sm"
        >
          {canvasVideos.length} {isZh ? '个视频' : 'videos'}
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
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
