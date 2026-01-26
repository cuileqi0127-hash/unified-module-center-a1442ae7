import { cn } from '@/lib/utils';

interface WaterCupProgressProps {
  progress: number; // 0-100
  className?: string;
}

export function WaterCupProgress({ progress, className }: WaterCupProgressProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const waterHeight = `${clampedProgress}%`;

  return (
    <div className={cn("relative w-full h-full overflow-hidden rounded-lg", className)}>
      {/* 水填充 - 整个方块 */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/90 via-primary/70 to-primary/50 transition-all duration-500 ease-out"
        style={{
          height: waterHeight,
          boxShadow: clampedProgress > 0 ? 'inset 0 2px 8px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {/* 水波纹效果 - 顶部波浪 */}
        {clampedProgress > 0 && (
          <>
            <div 
              className="absolute top-0 left-0 right-0 h-4 bg-primary/40"
              style={{
                clipPath: 'polygon(0% 100%, 0% 50%, 10% 40%, 20% 50%, 30% 40%, 40% 50%, 50% 40%, 60% 50%, 70% 40%, 80% 50%, 90% 40%, 100% 50%, 100% 100%)',
                animation: 'wave 3s ease-in-out infinite',
              }}
            />
            <div 
              className="absolute top-0 left-0 right-0 h-3 bg-primary/30"
              style={{
                clipPath: 'polygon(0% 100%, 0% 60%, 15% 50%, 25% 60%, 35% 50%, 45% 60%, 55% 50%, 65% 60%, 75% 50%, 85% 60%, 100% 50%, 100% 100%)',
                animation: 'wave 2.5s ease-in-out infinite reverse',
                animationDelay: '0.5s',
              }}
            />
          </>
        )}
      </div>
      
      {/* 进度文字 - 根据水位位置调整颜色 */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <span 
          className={cn(
            "text-2xl font-bold drop-shadow-lg transition-colors duration-300",
            clampedProgress > 50 ? "text-white" : "text-primary"
          )}
          style={{
            textShadow: clampedProgress > 50 
              ? '0 2px 4px rgba(0,0,0,0.3)' 
              : '0 1px 2px rgba(255,255,255,0.8)',
          }}
        >
          {Math.round(clampedProgress)}%
        </span>
      </div>
      
      <style>{`
        @keyframes wave {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(-10px) translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
}
