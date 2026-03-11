import { useRef, useCallback } from 'react';
import { HeroSection } from './app-plaza/HeroSection';

interface AppPlazaProps {
  onNavigate: (itemId: string) => void;
}

export function AppPlaza({ onNavigate }: AppPlazaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div ref={scrollRef} className="min-h-full scrollbar-thin">
      <div className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto w-full">
        <HeroSection onNavigate={onNavigate} onScrollTo={scrollTo} />
      </div>
    </div>
  );
}
