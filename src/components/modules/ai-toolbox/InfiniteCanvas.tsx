import { useState, useRef, useCallback, useEffect } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CanvasImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
}

interface InfiniteCanvasProps {
  images: CanvasImage[];
  onImageMove?: (id: string, x: number, y: number) => void;
  onImageSelect?: (id: string | null) => void;
  selectedImageId?: string | null;
  onImageDragStart?: (image: CanvasImage) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function InfiniteCanvas({
  images,
  onImageMove,
  onImageSelect,
  selectedImageId,
  onImageDragStart,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

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

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
    }
  }, []);

  // Handle panning start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button or space + left click
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      // Click on empty canvas deselects
      onImageSelect?.(null);
    }
  }, [isSpacePressed, onImageSelect]);

  // Handle panning move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [isPanning]);

  // Handle panning end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  const handleZoomOut = () => setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle image drag
  const handleDrag = (id: string) => (_e: DraggableEvent, data: DraggableData) => {
    onImageMove?.(id, data.x, data.y);
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
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {images.map((image, index) => (
          <Draggable
            key={image.id}
            position={{ x: image.x, y: image.y }}
            onDrag={handleDrag(image.id)}
            onStart={() => onImageSelect?.(image.id)}
            disabled={isPanning || isSpacePressed}
            bounds={false}
            cancel=".no-drag"
          >
            <div
              className={cn(
                'absolute cursor-move rounded-lg bg-background shadow-lg transition-all duration-150',
                selectedImageId === image.id
                  ? 'ring-2 ring-primary shadow-xl z-50'
                  : 'ring-1 ring-border hover:shadow-xl'
              )}
              style={{ 
                width: image.width, 
                height: image.height,
                zIndex: selectedImageId === image.id ? 50 : index + 1,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onImageSelect?.(image.id);
              }}
            >
              <img
                src={image.url}
                alt={image.prompt || 'Generated image'}
                className="h-full w-full rounded-lg object-cover pointer-events-none select-none"
                draggable={false}
              />
              {/* Drag handle overlay for HTML5 drag (to input area) */}
              <div 
                className="no-drag absolute bottom-2 right-2 p-1.5 rounded bg-background/80 backdrop-blur-sm cursor-grab opacity-0 hover:opacity-100 transition-opacity"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    id: image.id,
                    url: image.url,
                    prompt: image.prompt,
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                  onImageDragStart?.(image);
                }}
              >
                <Move className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {/* Selection Handles */}
              {selectedImageId === image.id && (
                <>
                  <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                </>
              )}
            </div>
          </Draggable>
        ))}
      </div>

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
