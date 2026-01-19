import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Send, 
  Upload, 
  Play, 
  X, 
  ChevronDown,
  Video,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Edit3,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InfiniteCanvas } from './InfiniteCanvas';

interface VideoReplicationProps {
  onNavigate?: (itemId: string) => void;
}

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  originalPrompt: string;
  newPrompt: string;
  isEditing: boolean;
  thumbnail?: string;
}

interface UploadedFile {
  id: string;
  type: 'video' | 'image' | 'text';
  name: string;
  url: string;
  thumbnail?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  segmentId?: string;
}

interface CanvasItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
}

export function VideoReplication({ onNavigate }: VideoReplicationProps) {
  // Upload state
  const [originalVideo, setOriginalVideo] = useState<UploadedFile | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedFile | null>(null);
  const [sellingPoints, setSellingPoints] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Segmentation state
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Canvas state
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  
  // Panel resize
  const [chatPanelWidth, setChatPanelWidth] = useState(35);
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle video upload
  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast.error('请上传视频文件');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setOriginalVideo({
      id: crypto.randomUUID(),
      type: 'video',
      name: file.name,
      url,
    });
    
    // Add to canvas
    setCanvasItems(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'video',
      url,
      name: file.name,
      x: 50,
      y: 50,
      width: 320,
      height: 180,
    }]);
    
    toast.success('视频上传成功');
  }, []);

  // Handle reference image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setReferenceImage({
      id: crypto.randomUUID(),
      type: 'image',
      name: file.name,
      url,
    });
    
    // Add to canvas
    setCanvasItems(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'image',
      url,
      name: file.name,
      x: 400,
      y: 50,
      width: 200,
      height: 200,
    }]);
    
    toast.success('参考图上传成功');
  }, []);

  // Analyze video and generate segments (mock - leave interface for LLM)
  const handleAnalyzeVideo = useCallback(async () => {
    if (!originalVideo) {
      toast.error('请先上传原视频');
      return;
    }
    
    setIsAnalyzing(true);
    
    // Mock API call - replace with actual LLM integration
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock segments
    const mockSegments: VideoSegment[] = [
      {
        id: '1',
        startTime: 0,
        endTime: 5,
        originalPrompt: '产品展示镜头，特写产品外观，柔和的灯光环境',
        newPrompt: '',
        isEditing: false,
      },
      {
        id: '2',
        startTime: 5,
        endTime: 12,
        originalPrompt: '产品功能演示，手部操作特写，流畅的动作',
        newPrompt: '',
        isEditing: false,
      },
      {
        id: '3',
        startTime: 12,
        endTime: 18,
        originalPrompt: '使用场景展示，生活化环境，自然光线',
        newPrompt: '',
        isEditing: false,
      },
      {
        id: '4',
        startTime: 18,
        endTime: 25,
        originalPrompt: '品牌logo展示，简洁背景，产品卖点文字叠加',
        newPrompt: '',
        isEditing: false,
      },
    ];
    
    setSegments(mockSegments);
    setIsAnalyzing(false);
    
    // Add system message
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'system',
      content: `视频分析完成，共识别 ${mockSegments.length} 个片段。点击任意片段可进行对话式优化修改。`,
      timestamp: new Date(),
    }]);
    
    toast.success('视频分析完成');
  }, [originalVideo]);

  // Generate new prompts based on product info (mock - leave interface for LLM)
  const handleGenerateNewPrompts = useCallback(async () => {
    if (segments.length === 0) {
      toast.error('请先分析视频');
      return;
    }
    
    if (!referenceImage && !sellingPoints) {
      toast.error('请上传参考图或输入商品卖点');
      return;
    }
    
    setIsGenerating(true);
    
    // Mock API call - replace with actual LLM integration
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate new prompts based on product info
    const updatedSegments = segments.map(segment => ({
      ...segment,
      newPrompt: `[新商品] ${segment.originalPrompt}，融入${sellingPoints || '产品特色'}，参考商品图片风格`,
    }));
    
    setSegments(updatedSegments);
    setIsGenerating(false);
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '已根据您的商品信息和卖点生成新的prompt，您可以点击各片段进行进一步优化。',
      timestamp: new Date(),
    }]);
    
    toast.success('新prompt生成完成');
  }, [segments, referenceImage, sellingPoints]);

  // Handle segment selection for editing
  const handleSegmentClick = useCallback((segmentId: string) => {
    setSelectedSegment(segmentId);
    const segment = segments.find(s => s.id === segmentId);
    if (segment) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        content: `已选中片段 ${segmentId}（${segment.startTime}s - ${segment.endTime}s）\n原始prompt: ${segment.originalPrompt}\n新prompt: ${segment.newPrompt || '未生成'}`,
        timestamp: new Date(),
        segmentId,
      }]);
    }
  }, [segments]);

  // Handle chat message send
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      segmentId: selectedSegment || undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);
    
    // Mock LLM response - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // If a segment is selected, update its prompt
    if (selectedSegment) {
      setSegments(prev => prev.map(s => 
        s.id === selectedSegment 
          ? { ...s, newPrompt: `${s.newPrompt} [用户修改: ${inputMessage}]` }
          : s
      ));
    }
    
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: selectedSegment 
        ? `已根据您的要求更新片段 ${selectedSegment} 的prompt。您可以继续优化或选择其他片段。`
        : `收到您的反馈。请选择一个具体片段进行修改，或者直接点击"生成视频"按钮。`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsGenerating(false);
  }, [inputMessage, selectedSegment]);

  // Handle video generation
  const handleGenerateVideo = useCallback(async () => {
    if (segments.length === 0 || !segments.some(s => s.newPrompt)) {
      toast.error('请先生成新的prompt');
      return;
    }
    
    setIsGenerating(true);
    
    // Mock video generation - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Use original video as mock result
    const mockGeneratedUrl = originalVideo?.url || '';
    setGeneratedVideo(mockGeneratedUrl);
    
    // Add to canvas
    setCanvasItems(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'video',
      url: mockGeneratedUrl,
      name: '复刻视频_' + new Date().toISOString().slice(0, 10),
      x: 50,
      y: 300,
      width: 320,
      height: 180,
    }]);
    
    setIsGenerating(false);
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '视频生成完成！您可以在右侧画布查看生成的复刻视频。',
      timestamp: new Date(),
    }]);
    
    toast.success('视频生成完成');
  }, [segments, originalVideo]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      setChatPanelWidth(Math.max(25, Math.min(50, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Check if ready to analyze
  const canAnalyze = originalVideo && !isAnalyzing;
  const canGeneratePrompts = segments.length > 0 && (referenceImage || sellingPoints) && !isGenerating;
  const canGenerateVideo = segments.some(s => s.newPrompt) && !isGenerating;

  return (
    <div className="h-[calc(100vh-72px)] flex bg-background">
      {/* Left Panel - Chat & Controls */}
      <div 
        className="flex flex-col border-r border-border bg-card"
        style={{ width: `${chatPanelWidth}%` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <span className="font-medium">复刻视频</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNavigate?.('text-to-video')}>
                文生视频
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.('text-to-image')}>
                文生图
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Upload Section (show until all uploads are complete and user clicks analyze) */}
        {segments.length === 0 && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Video Upload */}
            {!originalVideo ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">上传原视频</p>
                <p className="text-sm text-muted-foreground">点击或拖拽上传需要复刻的视频</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </div>
            ) : (
              <div className="border border-primary/50 rounded-lg p-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[180px]">{originalVideo.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setOriginalVideo(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <video 
                  src={originalVideo.url} 
                  className="w-full h-32 object-cover rounded-md bg-black"
                  controls
                />
              </div>
            )}

            {/* Reference Image Upload */}
            {!referenceImage ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">上传参考图（商品图）</p>
                <p className="text-sm text-muted-foreground">上传您的商品图片作为风格参考</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            ) : (
              <div className="border border-primary/50 rounded-lg p-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[180px]">{referenceImage.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setReferenceImage(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <img 
                  src={referenceImage.url} 
                  alt="参考图预览"
                  className="w-full h-32 object-cover rounded-md"
                />
              </div>
            )}

            {/* Selling Points Input */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">商品卖点</span>
              </div>
              <Textarea
                placeholder="输入您的商品核心卖点，例如：高品质材料、独特设计、功能创新..."
                value={sellingPoints}
                onChange={(e) => setSellingPoints(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Analyze Button - only show when all uploads are complete */}
            {originalVideo && referenceImage && sellingPoints.trim() && (
              <Button 
                className="w-full"
                onClick={handleAnalyzeVideo}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始分析视频
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Segments View (after analysis) */}
        {segments.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Uploaded Files Summary */}
            <div className="px-4 py-3 border-b border-border space-y-2 shrink-0">
              {originalVideo && (
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate max-w-[150px]">{originalVideo.name}</span>
                  </div>
                </div>
              )}
              {referenceImage && (
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate max-w-[150px]">{referenceImage.name}</span>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {segments.length > 0 && !segments.some(s => s.newPrompt) && (
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={handleGenerateNewPrompts}
                    disabled={!canGeneratePrompts}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    生成新Prompt
                  </Button>
                )}
                {segments.some(s => s.newPrompt) && (
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={handleGenerateVideo}
                    disabled={!canGenerateVideo}
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-1 animate-pulse" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        生成视频
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Segments List */}
            {segments.length > 0 && (
              <div className="px-4 py-2 border-b border-border shrink-0">
                <p className="text-xs text-muted-foreground mb-2">视频片段（点击选中进行对话修改）</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {segments.map((segment) => (
                    <div
                      key={segment.id}
                      className={cn(
                        "flex-shrink-0 p-2 rounded-lg border cursor-pointer transition-all",
                        selectedSegment === segment.id 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleSegmentClick(segment.id)}
                    >
                      <div className="w-16 h-10 bg-muted rounded mb-1 flex items-center justify-center">
                        <Play className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-center">{segment.startTime}s-{segment.endTime}s</p>
                      {segment.newPrompt && (
                        <Check className="w-3 h-3 text-green-500 mx-auto mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                        ? 'bg-muted/50 text-muted-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-[10px] opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-muted px-3 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border shrink-0">
              <div className="flex gap-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={selectedSegment ? `对片段 ${selectedSegment} 提出修改建议...` : "输入消息..."}
                  className="min-h-[44px] max-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="shrink-0 h-11 w-11"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isGenerating}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "w-1 cursor-col-resize hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel - Canvas */}
      <div className="flex-1 flex flex-col bg-muted/30">
        <InfiniteCanvas
          images={canvasItems}
          onImageMove={(id, x, y) => {
            setCanvasItems(prev => prev.map(item => 
              item.id === id ? { ...item, x, y } : item
            ));
          }}
          onImageSelect={setSelectedCanvasItem}
          selectedImageId={selectedCanvasItem}
        />
      </div>
    </div>
  );
}
