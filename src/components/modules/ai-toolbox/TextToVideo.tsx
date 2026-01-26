import { 
  Download, 
  Send,
  ChevronDown,
  ChevronLeft,
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

interface TextToVideoProps {
  onNavigate?: (itemId: string) => void;
}

export function TextToVideo({ onNavigate }: TextToVideoProps) {
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
    highlightedVideoId,
    chatPanelWidth,
    isResizing,
    // Config
    models,
    secondsOptions,
    sizesOptions,
    historySessions,
    // Handlers
    handleNewConversation,
    handleLoadSession,
    handleVideoMove,
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
    <div ref={containerRef} className="flex h-[calc(100vh-3.5rem)] gap-0 animate-fade-in overflow-hidden bg-background">
      {/* Left Panel - Chat Interface */}
      <div 
        className="h-full flex flex-col border-r border-border bg-background overflow-hidden"
        style={{ width: `${chatPanelWidth}%` }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          <button 
            className="flex items-center gap-1 hover:text-primary transition-colors group"
            onClick={() => onNavigate?.('app-plaza')}
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
              onClick={() => {
                // Toggle chat panel
                setShowHistory(false);
              }}
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="absolute left-0 top-14 bottom-0 w-64 border-r border-border bg-background z-50 shadow-lg">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold">{isZh ? '历史会话' : 'History'}</h3>
            </div>
            <div className="overflow-y-auto p-2">
              {historySessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleLoadSession(session.id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors mb-1"
                >
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {session.timestamp.toLocaleDateString()} • {session.messageCount} {isZh ? '条消息' : 'messages'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-2">
                <VideoIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {isZh ? '开始一个新的对话' : 'Start a new conversation'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {isZh ? '输入描述来生成视频' : 'Enter a description to generate videos'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col gap-2',
                    message.type === 'user' ? 'items-start' : 'items-start'
                  )}
                >
                  {message.type === 'user' ? (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-lg">•</span>
                      <p className="text-sm leading-relaxed text-foreground">{cleanMessageContent(message.content)}</p>
                    </div>
                  ) : (
                    <div className="w-full space-y-3">
                      {/* Design Thoughts */}
                      {message.designThoughts && message.designThoughts.length > 0 && (
                        <div className="space-y-2">
                          {message.designThoughts.map((thought, idx) => {
                            const cleanedThought = cleanMessageContent(thought);
                            if (!cleanedThought) return null;
                            return (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="mt-0.5 text-primary">•</span>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                <span className="font-medium text-foreground">
                                    {cleanedThought.split('：')[0]}：
                                </span>
                                  {cleanedThought.split('：').slice(1).join('：')}
                              </p>
                            </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Status indicator when still processing */}
                      {message.status && message.status !== 'completed' && (
                        <div className="flex items-center gap-2 py-1">
                          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                          <span className="text-sm text-muted-foreground">
                            {getStatusText(message.status)}
                            {message.progress !== undefined && ` (${message.progress}%)`}
                          </span>
                        </div>
                      )}
                      
                      {/* Generated Video */}
                      {message.video && message.status === 'completed' && (
                        <div className="relative mt-2">
                          <div 
                            className="relative w-56 cursor-pointer overflow-hidden rounded-lg border border-border transition-all hover:shadow-md"
                            onClick={() => {
                              const video = canvasVideos.find(v => v.url === message.video);
                              if (video) setSelectedVideoId(video.id);
                            }}
                          >
                            <video
                              src={message.video}
                              className="aspect-video w-full object-cover"
                              controls
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute bottom-2 right-2 h-7 gap-1 rounded-md bg-background/90 px-2 text-xs backdrop-blur-sm hover:bg-background"
                            >
                              <MessageSquare className="h-3 w-3" />
                              {isZh ? '反馈' : 'Feedback'}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Result Summary */}
                      {message.resultSummary && message.status === 'completed' && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {cleanMessageContent(message.resultSummary)}
                        </p>
                      )}
                      
                      {/* Task Complete indicator */}
                      {message.status === 'completed' && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {getStatusText('completed')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
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
                disabled={!prompt.trim() || isGenerating}
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
      <div
        ref={resizeRef}
        onMouseDown={handleResizeStart}
        className={cn(
          "w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors flex-shrink-0",
          isResizing && "bg-primary"
        )}
        style={{ touchAction: 'none' }}
      />

      {/* Right Panel - Video Canvas */}
      <div 
        className="relative flex flex-col bg-muted/20"
        style={{ width: `${100 - chatPanelWidth}%` }}
      >
        {/* Workspace Header */}
        <div className="pointer-events-none absolute left-10 top-10 z-10">
          <h1 className="text-2xl font-bold text-foreground/90">
            {isZh ? '文生视频' : 'Text to Video'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isZh ? '通过文字描述创建精美视频' : 'Create stunning videos from text descriptions'}
          </p>
        </div>

        <UniversalCanvas
          items={[
            ...canvasVideos.map(v => ({ ...v, type: v.type || (v.url.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i) ? 'video' : 'image') } as CanvasMediaItem)),
            ...taskPlaceholders.map(p => ({ ...p } as CanvasMediaItem)),
          ]}
          onItemMove={handleVideoMove}
          onItemSelect={setSelectedVideoId}
          onItemMultiSelect={setSelectedVideoIds}
          selectedItemId={selectedVideoId}
          selectedItemIds={selectedVideoIds}
          onItemDragStart={() => {}}
          onItemDoubleClick={handleVideoDoubleClick}
          highlightedItemId={highlightedVideoId}
        />

        {/* Selected Video(s) Floating Toolbar */}
        {(selectedVideo || selectedVideoIds.length > 0) && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm animate-fade-in">
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
        {copiedVideo && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute left-4 top-4 gap-1.5 shadow-sm"
            onClick={handlePasteVideo}
          >
            <Clipboard className="h-4 w-4" />
            {isZh ? '粘贴视频' : 'Paste Video'}
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
    </div>
  );
}
