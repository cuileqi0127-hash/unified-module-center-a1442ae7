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
  ImageIcon,
  RatioIcon,
  X,
  Copy,
  Clipboard,
  Trash2,
  ArrowRight
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
import { useTextToImage, type CanvasImage } from './useTextToImage';

interface TextToImageProps {
  onNavigate?: (itemId: string) => void;
}

export function TextToImage({ onNavigate }: TextToImageProps) {
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
    highlightedImageId,
    chatPanelWidth,
    isResizing,
    // Config
    workModes,
    models,
    aspectRatios,
    historySessions,
    // Handlers
    handleNewConversation,
    handleLoadSession,
    handleImageMove,
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
    handleTransferToVideo,
    // Utils
    cleanMessageContent,
    isZh,
  } = useTextToImage();

  // 视图层辅助函数
  const getStatusText = (status?: string) => {
    if (!status) return '';
    const statusMap: Record<string, { zh: string; en: string }> = {
      thinking: { zh: '思考中...', en: 'Thinking...' },
      analyzing: { zh: '图片理解', en: 'Image Understanding' },
      designing: { zh: '正在设计', en: 'Designing...' },
      optimizing: { zh: '优化细节...', en: 'Optimizing details...' },
      complete: { zh: '任务已结束', en: 'Task Completed' },
    };
    return statusMap[status]?.[isZh ? 'zh' : 'en'] || status;
  };

  const selectedImage = canvasImages.find(img => img.id === selectedImageId);

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-3.5rem)] gap-0 animate-fade-in overflow-hidden bg-background">
      {/* Left Panel - Chat Interface - Fixed height with flex layout */}
      <div 
        className="h-full flex flex-col border-r border-border bg-background overflow-hidden"
        style={{ width: `${chatPanelWidth}%` }}
      >
        {/* Header Bar - Fixed at top */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          {/* Back Button + Title - Merged as single clickable component */}
          <button 
            className="flex items-center gap-1 hover:text-primary transition-colors group"
            onClick={() => onNavigate?.('app-plaza')}
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-base font-medium">
              {isZh ? '文生图' : 'Text to Image'}
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
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
              <PanelRightClose className="h-3.5 w-3.5" />
              {isZh ? '收起' : 'Collapse'}
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
              <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30">
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
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {isZh ? '开始一个新的对话' : 'Start a new conversation'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {isZh ? '输入描述来生成图片' : 'Enter a description to generate images'}
                  </p>
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
                                if (!cleanedThought) return null; // 如果清理后为空，不显示
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
                          {message.status && message.status !== 'complete' && (
                            <div className="flex items-center gap-2 py-1">
                              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                              <span className="text-sm text-muted-foreground">
                                {getStatusText(message.status)}
                              </span>
                            </div>
                          )}
                          
                          {/* Generated Image */}
                          {message.image && message.status === 'complete' && (
                            <div className="relative mt-2">
                              <div 
                                className="relative w-56 cursor-pointer overflow-hidden rounded-lg border border-border transition-all hover:shadow-md"
                                onClick={() => {
                                  const img = canvasImages.find(i => i.url === message.image);
                                  if (img) setSelectedImageId(img.id);
                                }}
                              >
                                <img
                                  src={message.image}
                                  alt="Generated"
                                  className="aspect-square w-full object-cover"
                                />
                                {/* Feedback Button */}
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
                          {message.resultSummary && message.status === 'complete' && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {cleanMessageContent(message.resultSummary)}
                            </p>
                          )}
                          
                          {/* Task Complete indicator */}
                          {message.status === 'complete' && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {getStatusText('complete')}
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
            {/* Selected Images Capsules - Show all selected canvas images */}
            {(selectedImageIds.length > 0 || selectedImageId) && (() => {
              // Get all selected images from canvas
              const imagesToDisplay = selectedImageIds.length > 0
                ? selectedImageIds
                    .map(id => canvasImages.find(img => img.id === id))
                    .filter((img): img is CanvasImage => img !== undefined)
                    .map(img => ({
                      id: img.id,
                      url: img.url,
                      prompt: img.prompt,
                    } as SelectedImage))
                : selectedImageId
                  ? (() => {
                      const img = canvasImages.find(img => img.id === selectedImageId);
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
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isZh ? '描述您想要生成的图片...' : 'Describe the image you want to generate...'}
              rows={2}
              className={cn(
                "w-full resize-none border-0 bg-transparent px-4 text-sm placeholder:text-muted-foreground focus:outline-none",
                (selectedImageId || selectedImageIds.length > 0) ? "pt-2 pb-3" : "py-3"
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

      {/* Right Panel - Infinite Canvas */}
      <div 
        className="relative flex flex-col bg-muted/20"
        style={{ width: `${100 - chatPanelWidth}%` }}
      >
        {/* Workspace Header - Fixed Position */}
        <div className="pointer-events-none absolute left-10 top-10 z-10">
          <h1 className="text-2xl font-bold text-foreground/90">
            {isZh ? '文生图' : 'Text to Image'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isZh ? '通过文字描述创建精美视觉图像' : 'Create stunning visuals from text descriptions'}
          </p>
        </div>

        <UniversalCanvas
          items={canvasImages.map(img => ({ ...img, type: img.type || 'image' } as CanvasMediaItem))}
          onItemMove={handleImageMove}
          onItemSelect={setSelectedImageId}
          onItemMultiSelect={setSelectedImageIds}
          selectedItemId={selectedImageId}
          selectedItemIds={selectedImageIds}
          onItemDragStart={() => {
            // Optional: could show visual feedback when drag starts
          }}
          onItemDoubleClick={handleImageDoubleClick}
          highlightedItemId={highlightedImageId}
        />

        {/* Selected Image(s) Floating Toolbar */}
        {(selectedImage || selectedImageIds.length > 0) && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm animate-fade-in">
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">
              {selectedImageIds.length > 1 
                ? isZh ? `已选择 ${selectedImageIds.length} 张图片` : `${selectedImageIds.length} images selected`
                : selectedImage?.prompt ? cleanMessageContent(selectedImage.prompt) : ''}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={selectedImageIds.length > 1 ? handleBatchCopyImages : () => selectedImage && handleCopyImageToClipboard(selectedImage)}
              title={isZh ? (selectedImageIds.length > 1 ? '批量复制' : '复制') : (selectedImageIds.length > 1 ? 'Copy All' : 'Copy')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={handleBatchDownloadImages}
              title={isZh ? (selectedImageIds.length > 1 ? '批量下载' : '下载') : (selectedImageIds.length > 1 ? 'Download All' : 'Download')}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
              onClick={handleDeleteImage}
              title={isZh ? (selectedImageIds.length > 1 ? '批量删除' : '删除') : (selectedImageIds.length > 1 ? 'Delete All' : 'Delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={() => handleTransferToVideo(onNavigate)}
              title={isZh ? (selectedImageIds.length > 1 ? '批量转移' : '转移') : (selectedImageIds.length > 1 ? 'Transfer All' : 'Transfer')}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Paste Button - Shows when image is copied */}
        {copiedImage && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute left-4 top-4 gap-1.5 shadow-sm"
            onClick={handlePasteImage}
          >
            <Clipboard className="h-4 w-4" />
            {isZh ? '粘贴图片' : 'Paste Image'}
          </Button>
        )}

        {/* Image Count Badge */}
        <Badge 
          variant="secondary" 
          className="absolute right-4 top-4 shadow-sm"
        >
          {canvasImages.length} {isZh ? '张图片' : 'images'}
        </Badge>
      </div>
    </div>
  );
}
