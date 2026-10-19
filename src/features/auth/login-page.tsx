import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { Alert } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { Card, CardContent } from '@/design-system/components/card';
import { fieldDescribedBy, FormField } from '@/design-system/components/form-field';
import { Input } from '@/design-system/components/input';
import { ThemeSwitcher } from '@/design-system/components/theme-switcher';
import { SabliLogo } from '@/design-system/icons/logo';
import { ApiError, ApiUnavailableError } from '@/shared/api/http-client';
import { login, useAuthSession } from '@/shared/auth/session';

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

type Values = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthSession();
  const [submitting, setSubmitting] = useState(false);
  const expired = Boolean(
    (location.state as { reason?: string } | null)?.reason === 'expired' || session.status === 'expired',
  );
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const formError = form.formState.errors.root?.message;

  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(28rem,34rem)]">
      <section className="relative hidden overflow-hidden bg-card px-12 py-12 lg:grid lg:place-items-center">
        <div className="absolute top-10 right-10 size-24 rounded-[28px] bg-primary" aria-hidden />
        <div className="absolute bottom-16 left-12 size-16 rounded-full bg-secondary" aria-hidden />
        <div className="absolute top-1/3 left-1/2 size-20 rounded-[20px] bg-accent" aria-hidden />
        <div className="relative max-w-md">
          <SabliLogo />
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight">Seu negócio inteiro. Em um só lugar.</h1>
          <p className="mt-4 text-sm font-semibold text-muted-foreground">
            Entre com a conta da operação. O estabelecimento autorizado é escolhido depois, no servidor.
          </p>
        </div>
      </section>
      <section className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-8 sm:px-8">
        <div className="flex w-full max-w-md justify-end">
          <ThemeSwitcher compact />
        </div>
        <Card className="w-full max-w-md shadow-pop">
          <CardContent className="grid gap-6 py-8">
            <div className="grid gap-2 lg:hidden">
              <SabliLogo />
            </div>
            <div className="grid gap-1">
              <h2 className="text-2xl font-extrabold">Entrar</h2>
              <p className="text-sm text-muted-foreground">Use o e-mail e a senha da sua conta Sabli.</p>
            </div>
            {expired ? (
              <Alert title="Sessão expirada" tone="warning">
                Entre de novo para continuar. Nada da operação anterior permanece visível.
              </Alert>
            ) : null}
            {session.unavailable ? (
              <Alert title="API indisponível" tone="danger">
                O modo demonstrativo não é usado como fallback.
              </Alert>
            ) : null}
            {formError ? (
              <Alert title="Não foi possível entrar" tone="danger">
                {formError}
              </Alert>
            ) : null}
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit(async (values) => {
                if (submitting) return;
                setSubmitting(true);
                try {
                  const me = await login(values.email, values.password);
                  if (me.establishments.length === 1) {
                    navigate('/selecionar-estabelecimento', { replace: true });
                    return;
                  }
                  navigate('/selecionar-estabelecimento', { replace: true });
                } catch (error) {
                  const message =
                    error instanceof ApiUnavailableError
                      ? 'O serviço de autenticação está indisponível.'
                      : error instanceof ApiError
                        ? 'Não foi possível entrar. Verifique o e-mail e a senha.'
                        : 'Não foi possível entrar. Verifique o e-mail e a senha.';
                  form.setError('root', { type: 'server', message });
                } finally {
                  setSubmitting(false);
                }
              })}
              noValidate
            >
              <FormField
                id="email"
                label="E-mail"
                required
                error={form.formState.errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  aria-invalid={Boolean(form.formState.errors.email) || undefined}
                  aria-describedby={fieldDescribedBy(
                    'email',
                    undefined,
                    form.formState.errors.email?.message,
                  )}
                  {...form.register('email')}
                />
              </FormField>
              <FormField
                id="password"
                label="Senha"
                required
                error={form.formState.errors.password?.message}
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(form.formState.errors.password) || undefined}
                  aria-describedby={fieldDescribedBy(
                    'password',
                    undefined,
                    form.formState.errors.password?.message,
                  )}
                  {...form.register('password')}
                />
              </FormField>
              <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
