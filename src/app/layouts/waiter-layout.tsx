import { ClipboardList, LayoutGrid, Receipt, UtensilsCrossed } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { SabliMark } from '@/design-system/icons/logo';
import { cn } from '@/shared/utils/cn';

const items = [
  { to: '/atendimento/mesas', label: 'Mesas', icon: LayoutGrid },
  { to: '/atendimento/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/atendimento/revisao', label: 'Pedido', icon: ClipboardList },
  { to: '/atendimento/conta', label: 'Conta', icon: Receipt },
];

export function WaiterLayout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-[#F3EBE4] text-foreground dark:bg-[#120f16]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background lg:my-4 lg:min-h-[calc(100dvh-2rem)] lg:overflow-hidden lg:rounded-[28px] lg:shadow-pop">
        <header className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => navigate('/atendimento/mesas')}
          >
            <SabliMark className="size-8" />
            <span className="text-lg font-extrabold">Atendimento</span>
          </button>
          <button
            type="button"
            className="text-sm font-bold text-primary-strong"
            onClick={() => navigate('/inicio')}
          >
            Painel
          </button>
        </header>
        <main className="flex-1 px-4 pb-24">
          <Outlet />
        </main>
        <nav
          aria-label="Atendimento"
          className="sticky bottom-0 grid grid-cols-4 border-t border-border bg-card px-2 py-2"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-[12px] text-[11px] font-extrabold text-muted-foreground',
                  isActive && 'bg-primary-soft text-primary-strong',
                )
              }
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
