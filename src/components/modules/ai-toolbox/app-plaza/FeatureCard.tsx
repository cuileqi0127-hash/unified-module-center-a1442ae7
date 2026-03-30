import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  preview: ReactNode;
  onClick: () => void;
}

export function FeatureCard({ title, description, preview, onClick }: FeatureCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative flex items-stretch rounded-2xl border border-border/30 bg-card/40 backdrop-blur-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-border/50 hover:shadow-card-hover hover:scale-[1.03] hover:-translate-y-1 min-h-[140px]">
      
      {/* Left: text */}
      <div className="flex flex-col justify-center gap-2 p-4 pr-3 flex-1 min-w-0">
        <div>
          <h3 className="text-base leading-snug font-light text-[#363636]">{title}</h3>
          <p className="text-xs text-muted-foreground font-light mt-1.5 leading-relaxed line-clamp-2">{description}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-neutral-700 bg-transparent">进入</span>
          <ChevronRight className="size-3" />
        </div>
      </div>

      {/* Right: preview */}
      



      
    </div>);

}