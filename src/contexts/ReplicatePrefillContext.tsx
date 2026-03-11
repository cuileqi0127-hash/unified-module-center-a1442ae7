import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface PrefillInspirationVideo {
  id: string;
  title: string;
  views: string;
  likes: string;
  coverGradient: string;
}

export interface ReplicatePrefill {
  tiktokLink?: string;
  sellingPoints: string[];
  /** Auto-trigger generation on mount */
  autoStart?: boolean;
  /** Pre-selected inspiration video from showcase */
  inspirationVideo?: PrefillInspirationVideo;
}

interface ReplicatePrefillContextValue {
  prefill: ReplicatePrefill | null;
  setPrefill: (data: ReplicatePrefill) => void;
  consumePrefill: () => ReplicatePrefill | null;
}

const ReplicatePrefillContext = createContext<ReplicatePrefillContextValue | null>(null);

export function ReplicatePrefillProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefillState] = useState<ReplicatePrefill | null>(null);

  const setPrefill = useCallback((data: ReplicatePrefill) => {
    setPrefillState(data);
  }, []);

  const consumePrefill = useCallback(() => {
    const data = prefill;
    setPrefillState(null);
    return data;
  }, [prefill]);

  return (
    <ReplicatePrefillContext.Provider value={{ prefill, setPrefill, consumePrefill }}>
      {children}
    </ReplicatePrefillContext.Provider>
  );
}

export function useReplicatePrefill() {
  const ctx = useContext(ReplicatePrefillContext);
  if (!ctx) throw new Error('useReplicatePrefill must be used within ReplicatePrefillProvider');
  return ctx;
}
