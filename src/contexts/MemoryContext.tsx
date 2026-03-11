import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface MemoryContextValue {
  entries: MemoryEntry[];
  addEntry: (entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (entry: MemoryEntry) => void;
  deleteEntry: (id: string) => void;
  importEntries: (data: MemoryEntry[]) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const MemoryContext = createContext<MemoryContextValue | null>(null);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addEntry = useCallback((entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString().slice(0, 10);
    setEntries((prev) => [...prev, { ...entry, id: crypto.randomUUID(), createdAt: now, updatedAt: now }]);
    toast.success('已添加到记忆库');
  }, []);

  const updateEntry = useCallback((entry: MemoryEntry) => {
    const now = new Date().toISOString().slice(0, 10);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...entry, updatedAt: now } : e)));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const importEntries = useCallback((data: MemoryEntry[]) => {
    setEntries((prev) => [...prev, ...data.map((d) => ({ ...d, id: crypto.randomUUID() }))]);
  }, []);

  return (
    <MemoryContext.Provider
      value={{ entries, addEntry, updateEntry, deleteEntry, importEntries, drawerOpen, setDrawerOpen }}
    >
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error('useMemory must be used within MemoryProvider');
  return ctx;
}
