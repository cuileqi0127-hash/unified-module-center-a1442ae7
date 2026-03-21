"use client";

import { useMemo, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OAuthProvider } from "@/contexts/OAuthContext";
import { ReplicatePrefillProvider } from "@/contexts/ReplicatePrefillContext";
import { Suspense } from "react";
import "@/i18n";

export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OAuthProvider>
          <ReplicatePrefillProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <Toaster />
            <Sonner />
          </ReplicatePrefillProvider>
        </OAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
