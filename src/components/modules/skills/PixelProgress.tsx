import { cn } from '@/lib/utils';

interface PixelProgressProps {
  progress: number;
  status?: 'idle' | 'running' | 'done' | 'error';
  className?: string;
}

export function PixelProgress({ progress, status = 'running', className }: PixelProgressProps) {
  if (status === 'done') {
    return <span className={cn("font-pixel text-[12px] tracking-widest text-emerald-500", className)}>DONE</span>;
  }
  if (status === 'error') {
    return <span className={cn("font-pixel text-[12px] tracking-widest text-destructive", className)}>ERROR</span>;
  }
  if (status === 'idle') {
    return <span className={cn("font-pixel text-[12px] tracking-widest text-muted-foreground/40", className)}>WAIT</span>;
  }

  // Running: pixel loading animation
  return (
    <span className={cn("font-pixel text-[13px] tracking-wider inline-flex gap-[2px]", className)}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="inline-block w-[6px] h-[6px] bg-emerald-500"
          style={{
            animation: 'pixel-blink 1.2s step-end infinite',
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </span>
  );
}
