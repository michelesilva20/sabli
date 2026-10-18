import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Badge } from '@/design-system/components/badge';
import { Button } from '@/design-system/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/card';
import { fieldDescribedBy, FormField } from '@/design-system/components/form-field';
import { Input } from '@/design-system/components/input';
import { Avatar } from '@/design-system/components/media';
import { PageHeader } from '@/design-system/components/navigation';
import { Select } from '@/design-system/components/select';
import { ThemeSwitcher } from '@/design-system/components/theme-switcher';
import { pushToast } from '@/design-system/components/toast';
import { useUiStore } from '@/app/stores/ui-store';
import { useEstablishmentsQuery } from '@/shared/api/hooks';
import { demoSession, resetDemoSession, useDemoSession } from '@/shared/demo/session';

const schema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  phone: z.string().trim().min(8, 'Informe um telefone com DDD.'),
  shift: z.string().trim().min(1, 'Informe o turno.'),
});

type Values = z.infer<typeof schema>;

const shifts = [
  { value: 'Manhã', label: 'Manhã' },
  { value: 'Tarde', label: 'Tarde' },
  { value: 'Noite', label: 'Noite' },
];

export function ProfilePage() {
  const session = useDemoSession();
  const navigate = useNavigate();
  const establishmentId = useUiStore((state) => state.establishmentId);
  const establishments = useEstablishmentsQuery();
  const place = establishments.data?.find((item) => item.id === establishmentId);
  const profile = session.profile;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      shift: profile.shift,
    },
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Perfil"
        description="Seus dados nesta demonstração. Nada é enviado a um servidor."
      />
      <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid gap-4">
          <Card>
            <CardContent className="grid justify-items-center gap-3 py-8 text-center">
              <Avatar
                initials={profile.initials}
                label={profile.name}
                className="size-20 text-2xl"
              />
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold">{profile.name}</h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {place?.name ?? 'Estabelecimento'}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge tone="coral">{profile.role}</Badge>
                <Badge tone="neutral">{profile.shift}</Badge>
              </div>
              <dl className="mt-2 grid w-full gap-2 text-left">
                <div className="rounded-[14px] bg-muted px-3 py-2">
                  <dt className="text-xs font-bold text-muted-foreground">E-mail</dt>
                  <dd className="truncate text-sm font-extrabold">{profile.email}</dd>
                </div>
                <div className="rounded-[14px] bg-muted px-3 py-2">
                  <dt className="text-xs font-bold text-muted-foreground">Telefone</dt>
                  <dd className="text-sm font-extrabold">{profile.phone}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
            </CardHeader>
            <CardContent>
              <ThemeSwitcher />
            </CardContent>
          </Card>
        </aside>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4"
                onSubmit={form.handleSubmit((values) => {
                  demoSession.updateProfile(values);
                  pushToast({
                    title: 'Perfil atualizado nesta sessão',
                    description: 'Recarregar a página restaura o exemplo inicial.',
                  });
                })}
              >
                <FormField
                  id="profile-name"
                  label="Nome"
                  required
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    id="profile-name"
                    autoComplete="name"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    aria-describedby={fieldDescribedBy(
                      'profile-name',
                      undefined,
                      form.formState.errors.name?.message,
                    )}
                    {...form.register('name')}
                  />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="profile-email"
                    label="E-mail"
                    required
                    description="Só aparece nesta demonstração. Nenhum recado é enviado."
                    error={form.formState.errors.email?.message}
                  >
                    <Input
                      id="profile-email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={Boolean(form.formState.errors.email)}
                      aria-describedby={fieldDescribedBy(
                        'profile-email',
                        'Só aparece nesta demonstração. Nenhum recado é enviado.',
                        form.formState.errors.email?.message,
                      )}
                      {...form.register('email')}
                    />
                  </FormField>
                  <FormField
                    id="profile-phone"
                    label="Telefone"
                    required
                    error={form.formState.errors.phone?.message}
                  >
                    <Input
                      id="profile-phone"
                      type="tel"
                      autoComplete="tel"
                      aria-invalid={Boolean(form.formState.errors.phone)}
                      aria-describedby={fieldDescribedBy(
                        'profile-phone',
                        undefined,
                        form.formState.errors.phone?.message,
                      )}
                      {...form.register('phone')}
                    />
                  </FormField>
                </div>
                <FormField id="profile-shift" label="Turno" required>
                  <Controller
                    control={form.control}
                    name="shift"
                    render={({ field }) => (
                      <Select
                        id="profile-shift"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={shifts}
                      />
                    )}
                  />
                </FormField>
                <p className="text-sm font-semibold text-muted-foreground">
                  Função: {profile.role}. Permissões reais ficam para a API.
                </p>
                <div>
                  <Button type="submit">Salvar nesta sessão</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessão</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/atendimento/mesas')}>
                Atendimento do garçom
              </Button>
              <Button variant="outline" onClick={() => navigate('/configuracoes')}>
                Configurações
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  resetDemoSession();
                  pushToast({
                    title: 'Demonstração reiniciada',
                    description:
                      'Os dados locais voltaram ao exemplo inicial. Nada foi enviado a um servidor.',
                  });
                }}
              >
                Reiniciar demonstração
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
