import { Link, Outlet } from 'react-router';
import { SabliLogo } from '@/design-system/icons/logo';
import { formatTime } from '@/shared/domain/date';

export function KitchenLayout() {
  return (
    <div className="kds min-h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 text-white">
          <SabliLogo />
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold">Cozinha</span>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold text-[#D9D2E2]">
          <span
            className="inline-flex items-center gap-2 rounded-full bg-[#2A2633] px-3 py-1"
            title="Indicador ilustrativo. Não há conexão com servidor."
          >
            <span className="size-2 rounded-full bg-[#B9F34A]" aria-hidden />
            Demonstração
          </span>
          <time dateTime={new Date().toISOString()}>{formatTime()}</time>
          <Link to="/inicio" className="rounded-full bg-white/10 px-3 py-1 text-white">
            Voltar ao painel
          </Link>
        </div>
      </header>
      <main id="conteudo" className="px-4 pb-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
