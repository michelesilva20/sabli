import { Bell, Menu, Store } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { businessNavigation } from '@/app/config/navigation';
import { SidebarNav } from '@/app/layouts/sidebar';
import { useUiStore } from '@/app/stores/ui-store';
import { useCatalogQuery, useEstablishmentsQuery, useNotificationsQuery } from '@/shared/api/hooks';
import {
  firstNameFrom,
  initialsFrom,
  logout,
  roleLabel,
  selectEstablishment,
  useAuthSession,
} from '@/shared/auth/session';
import { isApiMode, isDemoMode } from '@/shared/config/runtime';
import { demoSession, resetDemoSession, useDemoSession } from '@/shared/demo/session';
import { Avatar } from '@/design-system/components/media';
import { DropdownMenu } from '@/design-system/components/overlays';
import { SearchInput } from '@/design-system/components/input';
import { Sheet } from '@/design-system/components/sheet';
import { ThemeSwitcher } from '@/design-system/components/theme-switcher';
import { pushToast } from '@/design-system/components/toast';
import { cn } from '@/shared/utils/cn';

export function AppHeader() {
  const navigate = useNavigate();
  const mobileOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileOpen = useUiStore((state) => state.setMobileNavOpen);
  const establishmentId = useUiStore((state) => state.establishmentId);
  const setEstablishmentId = useUiStore((state) => state.setEstablishmentId);
  const establishments = useEstablishmentsQuery();
  const catalog = useCatalogQuery();
  const notifications = useNotificationsQuery();
  const session = useDemoSession();
  const auth = useAuthSession();
  const apiPlaces = auth.me?.establishments ?? [];
  const displayName = isApiMode() ? (auth.me?.user.name ?? 'Conta') : session.profile.name;
  const displayFirstName = isApiMode()
    ? firstNameFrom(auth.me?.user.name)
    : session.profile.firstName;
  const displayRole = isApiMode() ? roleLabel(auth.context, auth.me) : session.profile.role;
  const displayInitials = isApiMode()
    ? initialsFrom(auth.me?.user.name)
    : session.profile.initials;
  const placeName = isApiMode()
    ? (auth.context?.establishment?.name ?? 'Estabelecimento')
    : (establishments.data?.find((item) => item.id === establishmentId)?.name ??
      'Estabelecimento');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const pages = [
      { id: 'profile', label: 'Perfil', to: '/perfil', hint: 'Conta' },
      ...businessNavigation.map((item) => ({
        id: item.id,
        label: item.label,
        hint: 'Módulo',
        to: item.to,
      })),
    ]
      .filter((item) => item.label.toLowerCase().includes(term))
      .map((item) => ({ id: item.id, label: item.label, hint: item.hint, to: item.to }));
    const products = isDemoMode()
      ? (catalog.data?.products ?? [])
      .filter((product) => product.name.toLowerCase().includes(term))
      .slice(0, 5)
      .map((product) => ({ id: product.id, label: product.name, hint: 'Produto', to: '/pdv' }))
      : [];
    const tables = isDemoMode()
      ? session.tables
      .filter((table) => `mesa ${table.number}`.includes(term) || String(table.number) === term)
      .slice(0, 4)
      .map((table) => ({
        id: table.id,
        label: `Mesa ${String(table.number).padStart(2, '0')}`,
        hint: 'Salão',
        to: '/mesas',
      }))
      : [];
    return [...pages, ...products, ...tables].slice(0, 8);
  }, [catalog.data?.products, query, session.tables]);

  const unread = isDemoMode()
    ? (notifications.data ?? []).filter(
        (item) => !item.read && !session.readNotificationIds.includes(item.id),
      ).length
    : 0;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card px-4 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
      <button
        type="button"
        className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted lg:hidden"
        aria-label="Abrir menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <div className="relative min-w-0 w-full max-w-lg [&_input]:h-10 [&_input]:rounded-full [&_input]:border-transparent [&_input]:bg-muted">
        <SearchInput
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Buscar mesas, pedidos, produtos..."
          aria-label={isApiMode() ? 'Buscar módulos' : 'Busca demonstrativa'}
          aria-expanded={searchOpen && results.length > 0}
          aria-controls="busca-global"
        />
        {searchOpen && query.trim().length >= 2 ? (
          <ul
            id="busca-global"
            role="listbox"
            className="absolute top-[calc(100%+8px)] z-40 w-full max-w-xl rounded-[16px] border border-border bg-popover p-2 shadow-pop"
          >
            {results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                Nenhum resultado nesta demonstração.
              </li>
            ) : (
              results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      navigate(result.to);
                      setSearchOpen(false);
                      setQuery('');
                    }}
                  >
                    <span className="font-bold">{result.label}</span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {result.hint}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu
          label="Estabelecimento"
          trigger={
            <button
              type="button"
              className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-bold hover:bg-muted md:inline-flex"
            >
              <Store className="size-4 text-primary-strong" aria-hidden />
              <span className="max-w-40 truncate">{placeName}</span>
            </button>
          }
          items={
            isApiMode()
              ? [
                  ...apiPlaces.map((item) => ({
                    id: item.id,
                    label: item.name,
                    onSelect: () => {
                      void selectEstablishment(item.organizationId, item.id).then(
                        () =>
                          pushToast({
                            title: item.name,
                            description: 'Contexto autorizado pelo servidor.',
                          }),
                        () =>
                          pushToast({
                            title: 'Contexto recusado',
                            description: 'O servidor não autorizou este estabelecimento.',
                          }),
                      );
                    },
                  })),
                  {
                    id: 'switch',
                    label: 'Escolher outro',
                    onSelect: () => navigate('/selecionar-estabelecimento'),
                  },
                ]
              : (establishments.data ?? []).map((item) => ({
                  id: item.id,
                  label: item.name,
                  onSelect: () => {
                    setEstablishmentId(item.id);
                    pushToast({
                      title: item.name,
                      description:
                        'Os indicadores demonstrativos acompanham o estabelecimento selecionado.',
                    });
                  },
                }))
          }
        />
        <div className="relative">
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-full hover:bg-muted"
            aria-label={
              isApiMode()
                ? 'Notificações indisponíveis no modo API'
                : unread
                  ? `Notificações, ${unread} não lidas`
                  : 'Notificações'
            }
            disabled={isApiMode()}
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((open) => !open)}
          >
            <Bell className="size-4" aria-hidden />
            {unread > 0 ? (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" aria-hidden />
            ) : null}
          </button>
          {notesOpen ? (
            <div className="absolute right-0 z-40 mt-2 w-80 rounded-[16px] border border-border bg-popover p-2 shadow-pop">
              <p className="px-2 py-1 text-xs font-extrabold text-muted-foreground">
                Avisos demonstrativos
              </p>
              <ul>
                {(notifications.data ?? []).map((item) => {
                  const read = item.read || session.readNotificationIds.includes(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          'w-full rounded-[12px] px-2 py-2 text-left hover:bg-muted',
                          !read && 'bg-primary-soft/60',
                        )}
                        onClick={() => demoSession.markNotificationRead(item.id)}
                      >
                        <span className="block text-sm font-extrabold">{item.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="hidden xl:block">
          <ThemeSwitcher compact />
        </div>
        <DropdownMenu
          label={isApiMode() ? 'Conta' : 'Conta demonstrativa'}
          trigger={
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full pr-2 pl-1 hover:bg-muted"
            >
              <Avatar initials={displayInitials} label={displayName} className="size-9" />
              <span className="hidden text-left leading-tight sm:grid">
                <span className="text-sm font-extrabold">Olá, {displayFirstName}</span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {displayRole}
                </span>
              </span>
            </button>
          }
          items={[
            { id: 'profile', label: 'Meu perfil', onSelect: () => navigate('/perfil') },
            ...(isDemoMode()
              ? [
                  {
                    id: 'waiter',
                    label: 'Atendimento do garçom',
                    onSelect: () => navigate('/atendimento/mesas'),
                  },
                ]
              : []),
            { id: 'settings', label: 'Configurações', onSelect: () => navigate('/configuracoes') },
            ...(import.meta.env.DEV
              ? [{ id: 'ds', label: 'Sabli UI', onSelect: () => navigate('/design-system') }]
              : []),
            isApiMode()
              ? {
                  id: 'logout',
                  label: 'Sair',
                  destructive: true,
                  onSelect: () => {
                    void logout();
                    navigate('/entrar');
                  },
                }
              : {
                  id: 'reset',
                  label: 'Reiniciar demonstração',
                  destructive: true,
                  onSelect: () => {
                    resetDemoSession();
                    pushToast({
                      title: 'Demonstração reiniciada',
                      description:
                        'Os dados locais voltaram ao exemplo inicial. Nada foi enviado a um servidor.',
                    });
                  },
                },
          ]}
        />
      </div>
      <Sheet
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        side="left"
        title="sabli"
        description="Navegação dos módulos"
      >
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </Sheet>
    </header>
  );
}
