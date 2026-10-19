import { SabliLogo } from '@/design-system/icons/logo';

export function SessionRestoreScreen({
  title = 'Restaurando a sessão',
  description = 'Estamos conferindo sua autenticação com o servidor.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <div className="grid justify-items-center gap-4 text-center">
        <SabliLogo />
        <p role="status" className="text-lg font-extrabold">
          {title}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
