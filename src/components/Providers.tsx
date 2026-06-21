"use client";

import { AppProvider } from "@/context/AppContext";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
      <Toaster position="bottom-right" richColors />
    </AppProvider>
  );
}
