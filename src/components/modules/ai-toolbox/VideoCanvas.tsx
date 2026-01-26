import { useState, useRef, useCallback, useEffect } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { ZoomIn, ZoomOut, Maximize, Move, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CanvasVideo {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
}

interface VideoCanvasProps {
  videos: CanvasVideo[];
  onVideoMove?: (id: string, x: number, y: number) => void;
  onVideoSelect?: (id: string | null) => void;
  onVideoMultiSelect?: (ids: string[]) => void;
  selectedVideoId?: string | null;
  selectedVideoIds?: string[]; // Multi-select support
  onVideoDragStart?: (video: CanvasVideo) => void;
  onVideoDoubleClick?: (video: CanvasVideo) => void;
  highlightedVideoId?: string | null;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1;
const ZOOM_STEP = 0.1;

export function VideoCanvas({
  videos,
  onVideoMove,
  onVideoSelect,
  onVideoMultiSelect,
  selectedVideoId,
  selectedVideoIds = [],
  onVideoDragStart,
  onVideoDoubleClick,
  highlightedVideoId,
}: VideoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionStartPos = useRef<{ x: number; y: number } | null>(null);

  // Handle keyboard events for space-drag panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Prevent browser zoom when wheel in canvas area
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isInCanvas = 
          e.clientX >= rect.left && 
          e.clientX <= rect.right && 
          e.clientY >= rect.top && 
          e.clientY <= rect.bottom;
        
        if (isInCanvas) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  // Helper function to zoom towards a point
  const zoomTowardsPoint = useCallback((pointX: number, pointY: number, deltaZoom: number) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const mouseX = pointX - rect.left;
    const mouseY = pointY - rect.top;
    
    setZoom((currentZoom) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + deltaZoom));
      
      setPan((currentPan) => {
        const canvasX = (mouseX - currentPan.x) / currentZoom;
        const canvasY = (mouseY - currentPan.y) / currentZoom;
        
        const newPanX = mouseX - canvasX * newZoom;
        const newPanY = mouseY - canvasY * newZoom;
        
        return { x: newPanX, y: newPanY };
      });
      
      return newZoom;
    });
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    let deltaY = e.deltaY;
    if (e.deltaMode === 1) {
      deltaY = e.deltaY * 16;
    } else if (e.deltaMode === 2) {
      deltaY = e.deltaY * 100;
    }
    
    const isTrackpad = Math.abs(deltaY) < 50 && e.deltaMode === 0;
    const isPinch = e.ctrlKey || e.metaKey;
    
    let zoomDelta: number;
    if (isPinch) {
      zoomDelta = -deltaY * 0.005;
    } else if (isTrackpad) {
      zoomDelta = -deltaY * 0.008;
    } else {
      zoomDelta = deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    }
    
    zoomDelta = Math.max(-ZOOM_STEP * 5, Math.min(ZOOM_STEP * 5, zoomDelta));
    
    zoomTowardsPoint(e.clientX, e.clientY, zoomDelta);
  }, [zoomTowardsPoint]);

  // Handle panning/box selection start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isClickOnVideo = target.closest('[data-video-id]') !== null;
      
      if (!isClickOnVideo && !isSpacePressed && containerRef.current) {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const isClickInVideo = videos.some(video => {
          const screenX = video.x * zoom + pan.x;
          const screenY = video.y * zoom + pan.y;
          const screenWidth = video.width * zoom;
          const screenHeight = video.height * zoom;
          
          return x >= screenX && x <= screenX + screenWidth &&
                 y >= screenY && y <= screenY + screenHeight;
        });
        
        if (!isClickInVideo) {
          selectionStartPos.current = { x, y };
          setIsBoxSelecting(true);
          setSelectionBox({ x, y, width: 0, height: 0 });
          
          if (!e.ctrlKey && !e.metaKey) {
            onVideoSelect?.(null);
            onVideoMultiSelect?.([]);
          }
        }
      } else if (!isClickOnVideo && isSpacePressed) {
        onVideoSelect?.(null);
        onVideoMultiSelect?.([]);
      }
    }
  }, [isSpacePressed, onVideoSelect, onVideoMultiSelect, videos, zoom, pan]);

  // Handle panning/box selection move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (isBoxSelecting && selectionStartPos.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const width = x - selectionStartPos.current.x;
      const height = y - selectionStartPos.current.y;
      
      setSelectionBox({
        x: Math.min(selectionStartPos.current.x, x),
        y: Math.min(selectionStartPos.current.y, y),
        width: Math.abs(width),
        height: Math.abs(height),
      });
    }
  }, [isPanning, isBoxSelecting]);

  // Handle panning/box selection end
  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    if (isBoxSelecting && containerRef.current && onVideoMultiSelect) {
      const currentBox = selectionBox || (selectionStartPos.current ? {
        x: selectionStartPos.current.x,
        y: selectionStartPos.current.y,
        width: 0,
        height: 0
      } : null);
      
      if (currentBox && (currentBox.width > 5 || currentBox.height > 5)) {
        const selectedIds: string[] = [];
        
        videos.forEach(video => {
          const screenX = video.x * zoom + pan.x;
          const screenY = video.y * zoom + pan.y;
          const screenWidth = video.width * zoom;
          const screenHeight = video.height * zoom;
          
          const videoLeft = screenX;
          const videoTop = screenY;
          const videoRight = screenX + screenWidth;
          const videoBottom = screenY + screenHeight;
          
          const boxLeft = currentBox.x;
          const boxTop = currentBox.y;
          const boxRight = currentBox.x + currentBox.width;
          const boxBottom = currentBox.y + currentBox.height;
          
          const overlaps = !(videoRight < boxLeft || videoLeft > boxRight || videoBottom < boxTop || videoTop > boxBottom);
          
          if (overlaps) {
            selectedIds.push(video.id);
          }
        });
        
        if (selectedIds.length > 0) {
          const addToSelection = e?.ctrlKey || e?.metaKey;
          if (addToSelection && selectedVideoIds.length > 0) {
            const combined = [...new Set([...selectedVideoIds, ...selectedIds])];
            onVideoMultiSelect(combined);
          } else {
            onVideoMultiSelect(selectedIds);
          }
          
          if (onVideoSelect && selectedIds.length > 0) {
            onVideoSelect(selectedIds[0]);
          }
        } else {
          if (!e?.ctrlKey && !e?.metaKey) {
            onVideoSelect?.(null);
            onVideoMultiSelect([]);
          }
        }
      }
      
      setIsBoxSelecting(false);
      setSelectionBox(null);
      selectionStartPos.current = null;
    }
    
    setIsPanning(false);
  }, [isBoxSelecting, selectionBox, videos, zoom, pan, selectedVideoIds, onVideoMultiSelect, onVideoSelect]);

  // Handle video play/pause
  const toggleVideoPlay = useCallback((videoId: string) => {
    const video = videoRefs.current.get(videoId);
    if (!video) return;
    
    if (playingVideos.has(videoId)) {
      video.pause();
      setPlayingVideos(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    } else {
      video.play();
      setPlayingVideos(prev => new Set(prev).add(videoId));
    }
  }, [playingVideos]);

  // Handle video drag
  const handleDrag = (id: string) => (_e: DraggableEvent, data: DraggableData) => {
    const canvasX = (data.x - pan.x) / zoom;
    const canvasY = (data.y - pan.y) / zoom;
    onVideoMove?.(id, canvasX, canvasY);
  };

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const canvasX = (centerX - pan.x) / zoom;
    const canvasY = (centerY - pan.y) / zoom;
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    const newPanX = centerX - canvasX * newZoom;
    const newPanY = centerY - canvasY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);
  
  const handleZoomOut = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const canvasX = (centerX - pan.x) / zoom;
    const canvasY = (centerY - pan.y) / zoom;
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    const newPanX = centerX - canvasX * newZoom;
    const newPanY = centerY - canvasY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);
  
  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full overflow-hidden',
        isPanning || isSpacePressed ? 'cursor-grab' : 'cursor-default',
        isPanning && 'cursor-grabbing'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ touchAction: 'none' }}
    >
      {/* Dot Pattern Background */}
      <div 
        className="canvas-background absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Canvas Layer */}
      <div className="absolute inset-0">
        {videos.map((video, index) => {
          const screenX = video.x * zoom + pan.x;
          const screenY = video.y * zoom + pan.y;
          const isPlaying = playingVideos.has(video.id);
          
          return (
            <Draggable
              key={video.id}
              position={{ x: screenX, y: screenY }}
              onDrag={handleDrag(video.id)}
              onStart={() => onVideoSelect?.(video.id)}
              disabled={isPanning || isSpacePressed}
              bounds={false}
              cancel=".no-drag"
            >
              <div
                data-video-id={video.id}
                className={cn(
                  'absolute cursor-move rounded-lg bg-background shadow-lg overflow-hidden',
                  (selectedVideoId === video.id || selectedVideoIds.includes(video.id))
                    ? 'ring-2 ring-primary shadow-xl z-50'
                    : 'ring-1 ring-border hover:shadow-xl',
                  highlightedVideoId === video.id && 'ring-2 ring-green-500 shadow-xl animate-pulse'
                )}
                style={{ 
                  width: video.width * zoom, 
                  height: video.height * zoom,
                  zIndex: (selectedVideoId === video.id || selectedVideoIds.includes(video.id)) ? 50 : index + 1,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (e.ctrlKey || e.metaKey) {
                    if (selectedVideoIds.includes(video.id)) {
                      const newIds = selectedVideoIds.filter(id => id !== video.id);
                      onVideoMultiSelect?.(newIds);
                      onVideoSelect?.(newIds.length > 0 ? newIds[0] : null);
                    } else {
                      const newIds = [...selectedVideoIds, video.id];
                      onVideoMultiSelect?.(newIds);
                      onVideoSelect?.(video.id);
                    }
                  } else {
                    onVideoSelect?.(video.id);
                    onVideoMultiSelect?.([video.id]);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onVideoDoubleClick?.(video);
                }}
              >
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current.set(video.id, el);
                    } else {
                      videoRefs.current.delete(video.id);
                    }
                  }}
                  src={video.url}
                  className="h-full w-full object-contain pointer-events-none select-none"
                  draggable={false}
                  loop
                  muted
                  onEnded={() => {
                    setPlayingVideos(prev => {
                      const next = new Set(prev);
                      next.delete(video.id);
                      return next;
                    });
                  }}
                />
                
                {/* Play/Pause Button - Show on hover or when playing */}
                <div 
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/20 transition-all cursor-pointer",
                    isPlaying ? "opacity-100" : "opacity-0 hover:opacity-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVideoPlay(video.id);
                  }}
                >
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6 ml-1" />
                    )}
                  </Button>
                </div>

                {/* Drag handle */}
                <div 
                  className="no-drag absolute bottom-2 right-2 p-1.5 rounded bg-background/80 backdrop-blur-sm cursor-grab opacity-0 hover:opacity-100 transition-opacity"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      id: video.id,
                      url: video.url,
                      prompt: video.prompt,
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                    onVideoDragStart?.(video);
                  }}
                >
                  <Move className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Selection Handles */}
                {selectedVideoId === video.id && (
                  <>
                    <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  </>
                )}
              </div>
            </Draggable>
          );
        })}
      </div>

      {/* Selection Box */}
      {selectionBox && (
        <div
          className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-[100]"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        />
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs font-medium text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleFitToScreen}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Panning Hint */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
        <Move className="h-3.5 w-3.5" />
        <span>Space + Drag to pan</span>
      </div>
    </div>
  );
}
