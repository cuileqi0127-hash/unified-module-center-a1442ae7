/**
 * Generation Chat Panel Component
 * 通用的生成聊天栏组件
 * 
 * 支持文生图和文生视频的聊天栏显示
 */

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { AnimatedText } from './AnimatedText';

export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  content: string;
  image?: string;
  video?: string;
  timestamp: Date;
  status?: 'thinking' | 'analyzing' | 'designing' | 'optimizing' | 'complete' | 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  designThoughts?: string[];
  resultSummary?: string;
}

interface GenerationChatPanelProps {
  messages: ChatMessage[];
  onImageClick?: (url: string) => void;
  onVideoClick?: (url: string) => void;
  cleanMessageContent: (content: string) => string;
  getStatusText: (status?: string) => string;
  // 用于查找画布中的项目
  findCanvasItem?: (url: string) => { id: string } | undefined;
  // 聊天栏底部引用（用于自动滚动）
  chatEndRef?: React.RefObject<HTMLDivElement>;
}

export function GenerationChatPanel({
  messages,
  onImageClick,
  onVideoClick,
  cleanMessageContent,
  getStatusText,
  findCanvasItem,
  chatEndRef,
}: GenerationChatPanelProps) {
  const { t } = useTranslation();
  
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {t('generationChatPanel.startConversation')}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('generationChatPanel.enterDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
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
              <p className="text-sm leading-relaxed text-foreground">
                {cleanMessageContent(message.content)}
              </p>
            </div>
          ) : (
            <div className="w-full space-y-3">
              {/* 缩略图/缩略视频：有 URL 即展示，置于消息顶部 */}
              {message.image && (
                <div className="relative shrink-0">
                  <div
                    className="relative w-52 cursor-pointer overflow-hidden rounded-lg border border-border transition-all hover:shadow-md hover:ring-2 hover:ring-primary/30"
                    onClick={() => {
                      if (onImageClick) onImageClick(message.image!);
                      else if (findCanvasItem) findCanvasItem(message.image!);
                    }}
                  >
                    <img
                      src={message.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
              {message.video && !message.image && (
                <div className="relative shrink-0">
                  <div
                    className="relative w-52 cursor-pointer overflow-hidden rounded-lg border border-border transition-all hover:shadow-md hover:ring-2 hover:ring-primary/30"
                    onClick={() => {
                      if (onVideoClick) onVideoClick(message.video!);
                      else if (findCanvasItem) findCanvasItem(message.video!);
                    }}
                  >
                    <video
                      src={message.video}
                      className="aspect-video w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  </div>
                </div>
              )}

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
              {message.status && 
               message.status !== 'complete' && 
               message.status !== 'completed' && (
                <div className="flex items-center gap-2 py-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">
                    <AnimatedText
                      text={getStatusText(message.status)}
                      isAnimating={
                        message.status === 'processing' || 
                        message.status === 'queued' ||
                        message.status === 'designing' ||
                        message.status === 'analyzing'
                      }
                    />
                    {/* {message.progress !== undefined && ` (${message.progress}%)`} */}
                  </span>
                </div>
              )}

              {/* Result Summary */}
              {message.resultSummary && 
               (message.status === 'complete' || message.status === 'completed') && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {cleanMessageContent(message.resultSummary)}
                </p>
              )}

              {/* Task Complete indicator */}
              {message.status === 'completed' && (
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">
                    {t('generationChatPanel.completed')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {chatEndRef && <div ref={chatEndRef} />}
    </div>
  );
}
