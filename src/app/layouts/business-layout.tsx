import { Outlet } from 'react-router';
import { AppHeader } from '@/app/layouts/header';
import { PageTransition } from '@/app/layouts/page-transition';
import { Sidebar } from '@/app/layouts/sidebar';

export function BusinessLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[12px] focus:bg-card focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main id="conteudo" className="flex-1 px-4 pt-5 pb-10 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1520px]">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
