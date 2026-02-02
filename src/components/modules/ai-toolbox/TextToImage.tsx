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
  Clipboard,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { useTextToImage, type CanvasImage } from './useTextToImage';
import { AnimatedText } from './AnimatedText';
import { MediaViewer } from './MediaViewer';
import { GenerationChatPanel } from './GenerationChatPanel';

interface TextToImageProps {
  onNavigate?: (itemId: string) => void;
}

export function TextToImage({ onNavigate }: TextToImageProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
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
    messages,
    isGenerating,
    canvasImages,
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
    handleBatchCopyImages,
    handleBatchDownloadImages,
    handleCopyImageToClipboard,
    handleResizeStart,
    handleUploadImage,
    // Utils
    cleanMessageContent,
    isZh,
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

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-3.5rem)] gap-0 animate-fade-in overflow-hidden bg-background relative">
      {/* 初始化 Loading 遮罩 */}
      {isInitializing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('textToImage.loadingHistory')}
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
                  isZh={isZh}
                  onImageClick={(url) => {
                    const img = canvasImages.find(i => i.url === url);
                    if (img) setSelectedImageId(img.id);
                  }}
                  onVideoClick={(url) => {
                    const img = canvasImages.find(i => i.url === url);
                                  if (img) setSelectedImageId(img.id);
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

        {/* Bottom Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-background p-4 flex-shrink-0">
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
                      <ImageIcon className="h-3.5 w-3.5" />
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

                {/* Aspect Ratio Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <RatioIcon className="h-3.5 w-3.5" />
                      {aspectRatio}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {aspectRatios.map((ar) => (
                      <DropdownMenuItem
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id)}
                        className={cn(aspectRatio === ar.id && 'bg-accent')}
                      >
                        {ar.label}
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
                  <Sparkles className="h-4 w-4 animate-spin" />
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

      {/* Right Panel - Infinite Canvas */}
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
            {t('textToImage.actions.expand')}
          </Button>
        )}

        <UniversalCanvas
          items={canvasImages.map(img => ({ ...img, type: img.type || 'image' } as CanvasMediaItem))}
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
        />

        {/* Selected Image(s) Floating Toolbar */}
        {(selectedImage || selectedImageIds.length > 0) && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm" style={{zIndex:999}}>
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">
              {selectedImageIds.length > 1 
                ? `${t('textToImage.selected')} ${selectedImageIds.length} ${t('textToImage.images')}`
                : selectedImage?.prompt ? cleanMessageContent(selectedImage.prompt) : ''}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={selectedImageIds.length > 1 ? handleBatchCopyImages : () => selectedImage && handleCopyImageToClipboard(selectedImage)}
              title={selectedImageIds.length > 1 ? t('textToImage.actions.copyAll') : t('textToImage.actions.copy')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={handleBatchDownloadImages}
              title={selectedImageIds.length > 1 ? t('textToImage.actions.downloadAll') : t('textToImage.actions.download')}
            >
              <Download className="h-4 w-4" />
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
          {canvasImages.length} {t('textToImage.images')}
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
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
