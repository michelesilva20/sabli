import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { businessNavigation } from '@/app/config/navigation';
import { useUiStore } from '@/app/stores/ui-store';
import { SabliLogo } from '@/design-system/icons/logo';
import { Avatar } from '@/design-system/components/media';
import { Tooltip } from '@/design-system/components/overlays';
import {
  firstNameFrom,
  initialsFrom,
  roleLabel,
  useAuthSession,
} from '@/shared/auth/session';
import { isApiMode } from '@/shared/config/runtime';
import { useDemoSession } from '@/shared/demo/session';
import { cn } from '@/shared/utils/cn';

function Item({
  to,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-[14px] px-3 text-sm font-bold text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground',
          collapsed && 'justify-center px-0',
          isActive &&
            'bg-primary-soft text-primary-strong hover:bg-primary-soft hover:text-primary-strong',
        )
      }
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </NavLink>
  );

  if (!collapsed) return link;
  return <Tooltip content={label}>{link}</Tooltip>;
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const enabled = useUiStore((state) => state.enabledModules);
  const items = businessNavigation.filter((item) => enabled.includes(item.id));
  return (
    <nav aria-label="Módulos" className="grid gap-1">
      {items.map((item) => (
        <Item
          key={item.id}
          to={item.to}
          label={item.label}
          icon={item.icon}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggle = useUiStore((state) => state.toggleSidebar);
  const profile = useDemoSession().profile;
  const auth = useAuthSession();
  const name = isApiMode() ? (auth.me?.user.name ?? 'Conta') : profile.name;
  const firstName = isApiMode() ? firstNameFrom(auth.me?.user.name) : profile.firstName;
  const role = isApiMode() ? roleLabel(auth.context, auth.me) : profile.role;
  const initials = isApiMode() ? initialsFrom(auth.me?.user.name) : profile.initials;
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-300 ease-out lg:flex',
        collapsed ? 'w-[84px]' : 'w-[240px]',
      )}
    >
      <div className={cn('flex items-center px-4 py-4', collapsed && 'justify-center px-2')}>
        <SabliLogo compact={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="grid gap-2 border-t border-border p-3">
        <NavLink
          to="/perfil"
          title={collapsed ? 'Perfil' : undefined}
          className={cn(
            'flex items-center gap-2 rounded-[14px] px-1 py-1 hover:bg-muted',
            collapsed && 'justify-center px-0',
          )}
        >
          <Avatar initials={initials} label={name} className="size-9" />
          {collapsed ? (
            <span className="sr-only">Perfil</span>
          ) : (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-extrabold">{firstName}</span>
              <span className="block truncate text-xs font-semibold text-muted-foreground">
                {role}
              </span>
            </span>
          )}
        </NavLink>
        <button
          type="button"
          onClick={toggle}
          className="flex h-9 items-center justify-center gap-2 rounded-[12px] text-sm font-bold text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          aria-pressed={collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden />
          )}
          {collapsed ? <span className="sr-only">Expandir menu</span> : 'Recolher'}
        </button>
      </div>
    </aside>
  );
}
