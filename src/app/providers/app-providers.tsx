import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/design-system/theme/theme-provider';
import { TooltipProvider } from '@/design-system/components/overlays';
import { ToastProvider } from '@/design-system/components/toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 60_000,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <ToastProvider />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
