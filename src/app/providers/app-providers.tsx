import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SessionBootstrap } from '@/features/auth/auth-guards';
import { ThemeProvider } from '@/design-system/theme/theme-provider';
import { TooltipProvider } from '@/design-system/components/overlays';
import { ToastProvider } from '@/design-system/components/toast';
import { appQueryClient } from '@/shared/api/query-client';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={appQueryClient}>
        <TooltipProvider>
          <SessionBootstrap>
            {children}
            <ToastProvider />
          </SessionBootstrap>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
