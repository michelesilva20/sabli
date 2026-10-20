import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { businessNavigation } from '@/app/config/navigation';
import { useUiStore } from '@/app/stores/ui-store';
import { Banner } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/card';
import { Switch } from '@/design-system/components/choice';
import { DatePicker } from '@/design-system/components/date-picker';
import { fieldDescribedBy, FormField } from '@/design-system/components/form-field';
import { Input } from '@/design-system/components/input';
import { PageHeader } from '@/design-system/components/navigation';
import { ThemeSwitcher } from '@/design-system/components/theme-switcher';
import { pushToast } from '@/design-system/components/toast';
import { useEstablishmentsQuery } from '@/shared/api/hooks';
import { isApiMode } from '@/shared/config/runtime';
import { useAuthSession } from '@/shared/auth/session';

const schema = z.object({
  phone: z.string().trim().min(8, 'Informe um telefone com DDD.'),
});

export function SettingsPage() {
  if (isApiMode()) return <ApiSettingsPage />;
  return <DemoSettingsPage />;
}

function ApiSettingsPage() {
  const place = useAuthSession().context?.establishment;
  return (
    <div className="grid max-w-3xl gap-5">
      <PageHeader
        title="Configurações"
        description={`Preferências desta sessão em ${place?.name ?? 'seu estabelecimento'}. Esconder menu não substitui o RBAC do servidor.`}
      />
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>
      <Banner>
        Equipe ainda não está ligada à API. Relatórios já consultam o servidor do estabelecimento. A autorização continua no servidor.
      </Banner>
    </div>
  );
}

function DemoSettingsPage() {
  const establishments = useEstablishmentsQuery();
  const establishmentId = useUiStore((state) => state.establishmentId);
  const enabled = useUiStore((state) => state.enabledModules);
  const toggle = useUiStore((state) => state.toggleModule);
  const current = establishments.data?.find((item) => item.id === establishmentId);
  const [referenceDate, setReferenceDate] = useState<Date | null>(new Date());
  const form = useForm({
    resolver: zodResolver(schema),
    values: { phone: current?.phone ?? '' },
  });

  return (
    <div className="grid max-w-3xl gap-5">
      <PageHeader
        title="Configurações"
        description="Preferências de interface e dados ilustrativos do estabelecimento."
      />
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Módulos visíveis</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Banner>
            Esconder um módulo só altera a navegação desta demonstração. Não é permissão,
            autenticação ou segurança.
          </Banner>
          {businessNavigation.map((item) => (
            <Switch
              key={item.id}
              id={`module-${item.id}`}
              label={item.label}
              checked={enabled.includes(item.id)}
              disabled={item.id === 'home' || item.id === 'settings'}
              description={
                item.id === 'home' || item.id === 'settings'
                  ? 'Sempre visível nesta fase.'
                  : 'Preferência local.'
              }
              onCheckedChange={() => toggle(item.id)}
            />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{current?.name ?? 'Estabelecimento'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(() => {
              pushToast({
                title: 'Telefone mantido só neste formulário',
                description: 'Nada foi gravado em servidor.',
              });
            })}
          >
            <FormField
              id="phone"
              label="Telefone"
              required
              error={form.formState.errors.phone?.message}
            >
              <Input
                id="phone"
                aria-invalid={Boolean(form.formState.errors.phone)}
                aria-describedby={fieldDescribedBy(
                  'phone',
                  undefined,
                  form.formState.errors.phone?.message,
                )}
                {...form.register('phone')}
              />
            </FormField>
            <FormField id="ref-date" label="Data de referência do exemplo">
              <DatePicker id="ref-date" value={referenceDate} onChange={setReferenceDate} />
            </FormField>
            <Button type="submit">Salvar nesta tela</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
