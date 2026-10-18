import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Avatar } from '@/design-system/components/media';
import { Button } from '@/design-system/components/button';
import { Card, CardContent } from '@/design-system/components/card';
import { fieldDescribedBy, FormField } from '@/design-system/components/form-field';
import { Input } from '@/design-system/components/input';
import { PageHeader } from '@/design-system/components/navigation';
import { pushToast } from '@/design-system/components/toast';
import { demoSession, useDemoSession } from '@/shared/demo/session';
import { useStaffQuery } from '@/shared/api/hooks';

const schema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo.'),
  role: z.string().trim().min(2, 'Informe a função.'),
});

type Values = z.infer<typeof schema>;

export function TeamPage() {
  const query = useStaffQuery();
  const session = useDemoSession();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', role: '' },
  });
  const people = [...(query.data ?? []), ...session.extraStaff];

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Equipe"
        description="Pessoas de exemplo. Incluir alguém aqui não envia convite nem cria acesso."
      />
      <ul className="grid gap-3 md:grid-cols-2">
        {people.map((person) => (
          <li key={person.id}>
            <Card>
              <CardContent className="flex items-center gap-3">
                <Avatar initials={person.initials} label={person.name} />
                <div>
                  <p className="font-extrabold">{person.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {person.role} · {person.shift}
                  </p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <Card>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => {
              const initials = values.name
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join('');
              demoSession.addStaff({
                id: crypto.randomUUID(),
                name: values.name,
                role: values.role,
                shift: 'A definir',
                initials,
              });
              form.reset();
              pushToast({
                title: 'Pessoa adicionada só nesta sessão',
                description: 'Nenhum convite foi enviado.',
              });
            })}
          >
            <FormField
              id="team-name"
              label="Nome"
              required
              error={form.formState.errors.name?.message}
            >
              <Input
                id="team-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                aria-describedby={fieldDescribedBy(
                  'team-name',
                  undefined,
                  form.formState.errors.name?.message,
                )}
                {...form.register('name')}
              />
            </FormField>
            <FormField
              id="team-role"
              label="Função"
              required
              error={form.formState.errors.role?.message}
            >
              <Input id="team-role" {...form.register('role')} />
            </FormField>
            <Button type="submit">Adicionar à lista local</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
