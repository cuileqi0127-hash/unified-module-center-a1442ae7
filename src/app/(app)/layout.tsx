"use client";

import { ModuleProvider } from "@/contexts/ModuleContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
    </ModuleProvider>
  );
}
